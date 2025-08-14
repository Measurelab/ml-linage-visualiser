-- Add projects table for multi-project support
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add project_id to existing tables
ALTER TABLE tables ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE lineages ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE dashboards ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE dashboard_tables ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add indexes for project-based queries
CREATE INDEX idx_tables_project ON tables(project_id);
CREATE INDEX idx_lineages_project ON lineages(project_id);
CREATE INDEX idx_dashboards_project ON dashboards(project_id);
CREATE INDEX idx_dashboard_tables_project ON dashboard_tables(project_id);

-- Add unique constraints needed for upsert operations
ALTER TABLE tables ADD CONSTRAINT unique_table_per_project UNIQUE (id, project_id);
ALTER TABLE lineages ADD CONSTRAINT unique_lineage_per_project UNIQUE (source_table_id, target_table_id, project_id);
ALTER TABLE dashboards ADD CONSTRAINT unique_dashboard_per_project UNIQUE (id, project_id);
ALTER TABLE dashboard_tables ADD CONSTRAINT unique_dashboard_table_per_project UNIQUE (dashboard_id, table_id, project_id);

-- Enable Row Level Security for projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects table
CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON projects FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON projects FOR DELETE USING (true);

-- Update existing policies to be project-aware (optional: could restrict by user later)
-- For now, keep open access but project-filtered

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();