-- Create the main tables for BigQuery Lineage Visualizer

-- Tables for storing BigQuery table metadata
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dataset TEXT,
  layer TEXT,
  table_type TEXT,
  is_scheduled_query BOOLEAN DEFAULT false,
  link TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table lineage relationships (source -> target)
CREATE TABLE lineages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table_id TEXT NOT NULL,
  target_table_id TEXT NOT NULL,
  source_table_name TEXT,
  target_table_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard metadata
CREATE TABLE dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  link TEXT,
  owner TEXT,
  business_area TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard to table mappings
CREATE TABLE dashboard_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  dashboard_name TEXT,
  table_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE lineages 
  ADD CONSTRAINT fk_lineage_source FOREIGN KEY (source_table_id) REFERENCES tables(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_lineage_target FOREIGN KEY (target_table_id) REFERENCES tables(id) ON DELETE CASCADE;

ALTER TABLE dashboard_tables
  ADD CONSTRAINT fk_dashboard_tables_dashboard FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_dashboard_tables_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX idx_tables_layer ON tables(layer);
CREATE INDEX idx_tables_dataset ON tables(dataset);
CREATE INDEX idx_lineages_source ON lineages(source_table_id);
CREATE INDEX idx_lineages_target ON lineages(target_table_id);
CREATE INDEX idx_dashboards_business_area ON dashboards(business_area);
CREATE INDEX idx_dashboard_tables_dashboard ON dashboard_tables(dashboard_id);
CREATE INDEX idx_dashboard_tables_table ON dashboard_tables(table_id);

-- Enable Row Level Security
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_tables ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (can be restricted later)
CREATE POLICY "Enable all access for tables" ON tables FOR ALL USING (true);
CREATE POLICY "Enable all access for lineages" ON lineages FOR ALL USING (true);
CREATE POLICY "Enable all access for dashboards" ON dashboards FOR ALL USING (true);
CREATE POLICY "Enable all access for dashboard_tables" ON dashboard_tables FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();