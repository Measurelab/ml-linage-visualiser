-- Fix table constraints to allow same table IDs across different projects

-- STEP 1: Drop all foreign key constraints that depend on the primary keys
ALTER TABLE lineages DROP CONSTRAINT IF EXISTS fk_lineage_source;
ALTER TABLE lineages DROP CONSTRAINT IF EXISTS fk_lineage_target;
ALTER TABLE dashboard_tables DROP CONSTRAINT IF EXISTS fk_dashboard_tables_dashboard;
ALTER TABLE dashboard_tables DROP CONSTRAINT IF EXISTS fk_dashboard_tables_table;

-- STEP 2: Drop the existing primary key constraints
ALTER TABLE tables DROP CONSTRAINT tables_pkey;
ALTER TABLE dashboards DROP CONSTRAINT dashboards_pkey;

-- STEP 3: Add new UUID primary key columns
ALTER TABLE tables ADD COLUMN uuid_id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE dashboards ADD COLUMN uuid_id UUID PRIMARY KEY DEFAULT gen_random_uuid();

-- STEP 4: The existing unique constraints (id, project_id) will now work properly
-- Same table ID can exist in different projects, but not within the same project

-- NOTE: We intentionally do NOT recreate foreign key constraints
-- The lineages table references table IDs logically within project context
-- This allows for more flexible data management across projects