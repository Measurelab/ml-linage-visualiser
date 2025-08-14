import { supabase } from './supabase';
import { Table, TableLineage, Dashboard, DashboardTable, ParsedData } from '../types';

// Clear all existing data
export const clearAllData = async (): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  // Delete in order due to foreign key constraints
  await supabase.from('dashboard_tables').delete().neq('dashboard_id', '');
  await supabase.from('lineages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('dashboards').delete().neq('id', '');
  await supabase.from('tables').delete().neq('id', '');
};

// Import tables data
export const importTables = async (tables: Map<string, Table>): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const tableArray = Array.from(tables.values()).map(table => ({
    id: table.id,
    name: table.name,
    dataset: table.dataset,
    layer: table.layer,
    table_type: table.tableType,
    is_scheduled_query: table.isScheduledQuery,
    link: table.link,
    description: table.description
  }));

  if (tableArray.length === 0) return;

  const { error } = await supabase
    .from('tables')
    .upsert(tableArray, { onConflict: 'id' });

  if (error) {
    console.error('Error importing tables:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${tableArray.length} tables to Supabase`);
};

// Import lineages data
export const importLineages = async (lineages: TableLineage[]): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const lineageArray = lineages.map(lineage => ({
    source_table_id: lineage.sourceTableId,
    target_table_id: lineage.targetTableId,
    source_table_name: lineage.sourceTableName,
    target_table_name: lineage.targetTableName
  }));

  if (lineageArray.length === 0) return;

  const { error } = await supabase
    .from('lineages')
    .upsert(lineageArray, { onConflict: 'source_table_id,target_table_id' });

  if (error) {
    console.error('Error importing lineages:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${lineageArray.length} lineage relationships to Supabase`);
};

// Import dashboards data
export const importDashboards = async (dashboards: Map<string, Dashboard>): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const dashboardArray = Array.from(dashboards.values()).map(dashboard => ({
    id: dashboard.id,
    name: dashboard.name,
    link: dashboard.link,
    owner: dashboard.owner,
    business_area: dashboard.businessArea
  }));

  if (dashboardArray.length === 0) return;

  const { error } = await supabase
    .from('dashboards')
    .upsert(dashboardArray, { onConflict: 'id' });

  if (error) {
    console.error('Error importing dashboards:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${dashboardArray.length} dashboards to Supabase`);
};

// Import dashboard-table mappings
export const importDashboardTables = async (dashboardTables: DashboardTable[]): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const mappingArray = dashboardTables.map(dt => ({
    dashboard_id: dt.dashboardId,
    table_id: dt.tableId,
    dashboard_name: dt.dashboardName,
    table_name: dt.tableName
  }));

  if (mappingArray.length === 0) return;

  const { error } = await supabase
    .from('dashboard_tables')
    .upsert(mappingArray, { onConflict: 'dashboard_id,table_id' });

  if (error) {
    console.error('Error importing dashboard tables:', error);
    throw error;
  }
  
  console.log(`✅ Imported ${mappingArray.length} dashboard-table mappings to Supabase`);
};

// Import all parsed data to Supabase
export const importParsedData = async (parsedData: ParsedData): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  console.log('🗑️ Clearing existing data...');
  await clearAllData();
  
  console.log('📤 Importing data to Supabase...');
  
  // Import in order due to foreign key constraints
  await importTables(parsedData.tables);
  await importLineages(parsedData.lineages);
  await importDashboards(parsedData.dashboards);
  await importDashboardTables(parsedData.dashboardTables);
  
  console.log('✅ All data imported successfully!');
};

// Load data from Supabase
export const loadDataFromSupabase = async (): Promise<ParsedData> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  console.log('📥 Loading data from Supabase...');
  
  // Fetch all data in parallel
  const [tablesResult, lineagesResult, dashboardsResult, dashboardTablesResult] = await Promise.all([
    supabase.from('tables').select('*'),
    supabase.from('lineages').select('*'),
    supabase.from('dashboards').select('*'),
    supabase.from('dashboard_tables').select('*')
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

// Check if data exists in Supabase
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