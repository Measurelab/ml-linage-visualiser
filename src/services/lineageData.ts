import { supabase } from './supabase';
import { Table, TableLineage, Dashboard, DashboardTable, ParsedData } from '../types';

// Clear all existing data for a specific project
export const clearProjectData = async (projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  // Delete in order due to foreign key constraints
  await supabase.from('dashboard_tables').delete().eq('project_id', projectId);
  await supabase.from('lineages').delete().eq('project_id', projectId);
  await supabase.from('dashboards').delete().eq('project_id', projectId);
  await supabase.from('tables').delete().eq('project_id', projectId);
};

// Import tables data
export const importTables = async (tables: Map<string, Table>, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const tableArray = Array.from(tables.values()).map(table => ({
    id: table.id,
    name: table.name,
    dataset: table.dataset,
    layer: table.layer,
    table_type: table.tableType,
    is_scheduled_query: table.isScheduledQuery,
    link: table.link,
    description: table.description,
    project_id: projectId
  }));

  if (tableArray.length === 0) return;

  const { error } = await supabase
    .from('tables')
    .upsert(tableArray, { onConflict: 'id,project_id' });

  if (error) {
    console.error('Error importing tables:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${tableArray.length} tables to Supabase`);
};

// Import lineages data
export const importLineages = async (lineages: TableLineage[], projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const lineageArray = lineages.map(lineage => ({
    source_table_id: lineage.sourceTableId,
    target_table_id: lineage.targetTableId,
    source_table_name: lineage.sourceTableName,
    target_table_name: lineage.targetTableName,
    project_id: projectId
  }));

  if (lineageArray.length === 0) return;

  const { error } = await supabase
    .from('lineages')
    .upsert(lineageArray, { onConflict: 'source_table_id,target_table_id,project_id' });

  if (error) {
    console.error('Error importing lineages:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${lineageArray.length} lineage relationships to Supabase`);
};

// Import dashboards data
export const importDashboards = async (dashboards: Map<string, Dashboard>, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const dashboardArray = Array.from(dashboards.values()).map(dashboard => ({
    id: dashboard.id,
    name: dashboard.name,
    link: dashboard.link,
    owner: dashboard.owner,
    business_area: dashboard.businessArea,
    project_id: projectId
  }));

  if (dashboardArray.length === 0) return;

  const { error } = await supabase
    .from('dashboards')
    .upsert(dashboardArray, { onConflict: 'id,project_id' });

  if (error) {
    console.error('Error importing dashboards:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${dashboardArray.length} dashboards to Supabase`);
};

// Import dashboard-table mappings
export const importDashboardTables = async (dashboardTables: DashboardTable[], projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const mappingArray = dashboardTables.map(dt => ({
    dashboard_id: dt.dashboardId,
    table_id: dt.tableId,
    dashboard_name: dt.dashboardName,
    table_name: dt.tableName,
    project_id: projectId
  }));

  if (mappingArray.length === 0) return;

  const { error } = await supabase
    .from('dashboard_tables')
    .upsert(mappingArray, { onConflict: 'dashboard_id,table_id,project_id' });

  if (error) {
    console.error('Error importing dashboard tables:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${mappingArray.length} dashboard-table mappings to Supabase`);
};

// Import all parsed data to Supabase for a specific project
export const importParsedDataToProject = async (parsedData: ParsedData, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  console.log(`🗑️ Clearing existing data for project ${projectId}...`);
  await clearProjectData(projectId);
  
  console.log('📤 Importing data to Supabase...');
  
  // Import in order due to foreign key constraints
  await importTables(parsedData.tables, projectId);
  await importLineages(parsedData.lineages, projectId);
  await importDashboards(parsedData.dashboards, projectId);
  await importDashboardTables(parsedData.dashboardTables, projectId);
  
  console.log('✅ All data imported successfully!');
};

// Backward compatibility - import to default project
export const importParsedData = async (parsedData: ParsedData, portalName?: string): Promise<void> => {
  // For now, create a default project if none exists
  const projects = await supabase?.from('projects').select('id').limit(1);
  let projectId = projects?.data?.[0]?.id;
  
  if (!projectId) {
    const { createProject } = await import('./projects');
    const project = await createProject({
      name: 'Default Project',
      description: 'Default project for lineage visualization',
      // Don't assign measurelab as portal_name for admin-created projects
      portal_name: portalName?.toLowerCase() === 'measurelab' ? undefined : portalName
    });
    projectId = project.id;
  }
  
  await importParsedDataToProject(parsedData, projectId);
};

// Load data from Supabase for a specific project
export const loadDataFromSupabaseProject = async (projectId: string): Promise<ParsedData> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  console.log(`📥 Loading data from Supabase for project ${projectId}...`);
  
  // Fetch all data for the specific project in parallel
  const [tablesResult, lineagesResult, dashboardsResult, dashboardTablesResult] = await Promise.all([
    supabase.from('tables').select('*').eq('project_id', projectId),
    supabase.from('lineages').select('*').eq('project_id', projectId),
    supabase.from('dashboards').select('*').eq('project_id', projectId),
    supabase.from('dashboard_tables').select('*').eq('project_id', projectId)
  ]);

  if (tablesResult.error) throw tablesResult.error;
  if (lineagesResult.error) throw lineagesResult.error;
  if (dashboardsResult.error) throw dashboardsResult.error;
  if (dashboardTablesResult.error) throw dashboardTablesResult.error;

  // Convert tables array to Map
  const tables = new Map<string, Table>();
  tablesResult.data?.forEach(row => {
    tables.set(row.id, {
      id: row.id,
      name: row.name,
      dataset: row.dataset || '',
      layer: row.layer || 'Raw',
      tableType: row.table_type || 'Table',
      isScheduledQuery: row.is_scheduled_query || false,
      link: row.link,
      description: row.description
    });
  });

  // Convert lineages
  const lineages: TableLineage[] = lineagesResult.data?.map(row => ({
    targetTableId: row.target_table_id,
    sourceTableId: row.source_table_id,
    targetTableName: row.target_table_name || '',
    sourceTableName: row.source_table_name || ''
  })) || [];

  // Convert dashboards array to Map
  const dashboards = new Map<string, Dashboard>();
  dashboardsResult.data?.forEach(row => {
    dashboards.set(row.id, {
      id: row.id,
      name: row.name,
      link: row.link,
      owner: row.owner,
      businessArea: row.business_area
    });
  });

  // Convert dashboard tables
  const dashboardTables: DashboardTable[] = dashboardTablesResult.data?.map(row => ({
    dashboardId: row.dashboard_id,
    tableId: row.table_id,
    dashboardName: row.dashboard_name || '',
    tableName: row.table_name || ''
  })) || [];

  console.log('✅ Data loaded from Supabase:', {
    tables: tables.size,
    lineages: lineages.length,
    dashboards: dashboards.size,
    dashboardTables: dashboardTables.length
  });

  return {
    tables,
    lineages,
    dashboards,
    dashboardTables
  };
};

// Load data from Supabase (backward compatibility - loads from any project)
export const loadDataFromSupabase = async (): Promise<ParsedData> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  // For backward compatibility, load from the first available project
  const projects = await supabase.from('projects').select('id').limit(1);
  const projectId = projects?.data?.[0]?.id;
  
  if (!projectId) {
    throw new Error('No projects found');
  }
  
  return loadDataFromSupabaseProject(projectId);
};

// Check if data exists in Supabase for any project
export const hasDataInSupabase = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  const { count, error } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error checking data existence:', error);
    return false;
  }
  
  return (count || 0) > 0;
};

// Check if a specific project has data
export const hasProjectData = async (projectId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  const { count, error } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);
  
  if (error) {
    console.error('Error checking project data existence:', error);
    return false;
  }
  
  return (count || 0) > 0;
};

// Delete a table and all its relationships
export const deleteTable = async (tableId: string, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  // Delete in order due to foreign key constraints
  // 1. Delete dashboard-table mappings
  const { error: dashboardError } = await supabase
    .from('dashboard_tables')
    .delete()
    .eq('table_id', tableId)
    .eq('project_id', projectId);
  
  if (dashboardError) {
    console.error('Error deleting dashboard-table mappings:', dashboardError);
    throw dashboardError;
  }
  
  // 2. Delete lineages where this table is source or target
  const { error: lineageError } = await supabase
    .from('lineages')
    .delete()
    .or(`source_table_id.eq.${tableId},target_table_id.eq.${tableId}`)
    .eq('project_id', projectId);
  
  if (lineageError) {
    console.error('Error deleting lineages:', lineageError);
    throw lineageError;
  }
  
  // 3. Delete the table itself
  const { error: tableError } = await supabase
    .from('tables')
    .delete()
    .eq('id', tableId)
    .eq('project_id', projectId);
  
  if (tableError) {
    console.error('Error deleting table:', tableError);
    throw tableError;
  }
  
  console.log(`✅ Deleted table ${tableId} and all its relationships`);
};

// Create a new table
export const createTable = async (table: Table, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const tableData = {
    id: table.id,
    name: table.name,
    dataset: table.dataset,
    layer: table.layer,
    table_type: table.tableType,
    is_scheduled_query: table.isScheduledQuery,
    link: table.link,
    description: table.description,
    project_id: projectId
  };
  
  const { error } = await supabase
    .from('tables')
    .insert(tableData);
  
  if (error) {
    console.error('Error creating table:', error);
    throw error;
  }
  
  console.log(`✅ Created table ${table.id}`);
};

// Update an existing table
export const updateTable = async (tableId: string, updates: Partial<Table>, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.dataset !== undefined) updateData.dataset = updates.dataset;
  if (updates.layer !== undefined) updateData.layer = updates.layer;
  if (updates.tableType !== undefined) updateData.table_type = updates.tableType;
  if (updates.isScheduledQuery !== undefined) updateData.is_scheduled_query = updates.isScheduledQuery;
  if (updates.link !== undefined) updateData.link = updates.link;
  if (updates.description !== undefined) updateData.description = updates.description;
  
  const { error } = await supabase
    .from('tables')
    .update(updateData)
    .eq('id', tableId)
    .eq('project_id', projectId);
  
  if (error) {
    console.error('Error updating table:', error);
    throw error;
  }
  
  console.log(`✅ Updated table ${tableId}`);
};

// Create a new lineage relationship
export const createLineage = async (lineage: TableLineage, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const lineageData = {
    source_table_id: lineage.sourceTableId,
    target_table_id: lineage.targetTableId,
    source_table_name: lineage.sourceTableName,
    target_table_name: lineage.targetTableName,
    project_id: projectId
  };
  
  const { error } = await supabase
    .from('lineages')
    .insert(lineageData);
  
  if (error) {
    console.error('Error creating lineage:', error);
    throw error;
  }
  
  console.log(`✅ Created lineage from ${lineage.sourceTableId} to ${lineage.targetTableId}`);
};

// Delete a lineage relationship
export const deleteLineage = async (sourceTableId: string, targetTableId: string, projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { error } = await supabase
    .from('lineages')
    .delete()
    .eq('source_table_id', sourceTableId)
    .eq('target_table_id', targetTableId)
    .eq('project_id', projectId);
  
  if (error) {
    console.error('Error deleting lineage:', error);
    throw error;
  }
  
  console.log(`✅ Deleted lineage from ${sourceTableId} to ${targetTableId}`);
};