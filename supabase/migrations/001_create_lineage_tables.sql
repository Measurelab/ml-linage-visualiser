-- Drop existing tables if they exist
DROP TABLE IF EXISTS dashboard_tables CASCADE;
DROP TABLE IF EXISTS lineages CASCADE;
DROP TABLE IF EXISTS dashboards CASCADE;
DROP TABLE IF EXISTS tables CASCADE;

-- Create tables table
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dataset TEXT,
  layer TEXT DEFAULT 'Raw',
  table_type TEXT DEFAULT 'Table',
  is_scheduled_query BOOLEAN DEFAULT false,
  link TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lineages table
CREATE TABLE lineages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  target_table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  source_table_name TEXT,
  target_table_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_table_id, target_table_id)
);

-- Create dashboards table
CREATE TABLE dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  link TEXT,
  owner TEXT,
  business_area TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dashboard_tables junction table
CREATE TABLE dashboard_tables (
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  dashboard_name TEXT,
  table_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (dashboard_id, table_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_tables_dataset ON tables(dataset);
CREATE INDEX idx_tables_layer ON tables(layer);
CREATE INDEX idx_tables_type ON tables(table_type);
CREATE INDEX idx_lineages_source ON lineages(source_table_id);
CREATE INDEX idx_lineages_target ON lineages(target_table_id);
CREATE INDEX idx_dashboard_tables_dashboard ON dashboard_tables(dashboard_id);
CREATE INDEX idx_dashboard_tables_table ON dashboard_tables(table_id);

-- Enable Row Level Security
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_tables ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON tables FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON tables FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON tables FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON lineages FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON lineages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON lineages FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON lineages FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON dashboards FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON dashboards FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON dashboards FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON dashboards FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON dashboard_tables FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON dashboard_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON dashboard_tables FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON dashboard_tables FOR DELETE USING (true);