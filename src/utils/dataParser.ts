import Papa from 'papaparse';
import { 
  Table, 
  TableLineage, 
  Dashboard, 
  DashboardTable, 
  ParsedData,
  LayerType,
  TableType 
} from '../types';

export const parseTablesCSV = (csvContent: string): Map<string, Table> => {
  const tables = new Map<string, Table>();
  
  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(), // Clean headers
      transform: (value: string) => value?.trim() || '' // Clean values
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing errors in tables:', result.errors);
    }

    console.log(`Processing ${result.data.length} table rows...`);

    result.data.forEach((row: any, index: number) => {
      try {
        // More flexible ID and name checking
        const tableId = row.Table_ID || row.table_id || row.id;
        const tableName = row.Table_Name || row.table_name || row.name;
        
        if (tableId && tableName) {
          const table: Table = {
            id: String(tableId).trim(),
            name: String(tableName).trim(),
            dataset: String(row['Dataset/CustomQuery'] || row.Dataset || row.dataset || '').trim(),
            layer: (row.Layer || 'Raw') as LayerType,
            tableType: (row.Table_Type || row.Type || 'Table') as TableType,
            isScheduledQuery: String(row['Scheduled Query'] || row.scheduled_query || '').toLowerCase() === 'yes',
            link: row.Link || row.link || undefined,
            description: row.Description || row.description || undefined
          };
          
          // Prevent duplicate IDs
          if (!tables.has(table.id)) {
            tables.set(table.id, table);
          } else {
            console.warn(`Duplicate table ID found: ${table.id} at row ${index + 2}`);
          }
        }
      } catch (error) {
        console.warn(`Error processing table row ${index + 2}:`, error, row);
      }
    });

    console.log(`Successfully parsed ${tables.size} tables`);
  } catch (error) {
    console.error('Error parsing tables CSV:', error);
    throw error;
  }

  return tables;
};

export const parseLineageCSV = (csvContent: string): TableLineage[] => {
  const lineages: TableLineage[] = [];
  
  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value?.trim() || ''
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing errors in lineage:', result.errors);
    }

    console.log(`Processing ${result.data.length} lineage rows...`);

    result.data.forEach((row: any, index: number) => {
      try {
        // More flexible column name checking
        // The 'datasets' column actually contains the Target_Table_ID
        const targetId = row.datasets || row.Target_Table_ID || row.target_table_id || row.targetId || row.target;
        const sourceId = row.Source_Table_ID || row.source_table_id || row.sourceId || row.source;
        
        if (targetId && sourceId) {
          lineages.push({
            targetTableId: String(targetId).trim(),
            sourceTableId: String(sourceId).trim(),
            targetTableName: String(row.Target_Table_Name || row.target_name || '').trim(),
            sourceTableName: String(row.Source_Table_Name || row.source_name || '').trim()
          });
        }
      } catch (error) {
        console.warn(`Error processing lineage row ${index + 2}:`, error, row);
      }
    });

    console.log(`Successfully parsed ${lineages.length} lineage relationships`);
  } catch (error) {
    console.error('Error parsing lineage CSV:', error);
    throw error;
  }

  return lineages;
};

export const parseDashboardsCSV = (csvContent: string): Map<string, Dashboard> => {
  const dashboards = new Map<string, Dashboard>();
  
  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value?.trim() || ''
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing errors in dashboards:', result.errors);
    }

    console.log(`Processing ${result.data.length} dashboard rows...`);

    result.data.forEach((row: any, index: number) => {
      try {
        // More flexible column name checking
        const dashboardId = row.Dashboard_ID || row.dashboard_id || row.id;
        const dashboardName = row.Dashboard_Name || row.dashboard_name || row.name;
        
        if (dashboardId && dashboardName) {
          const dashboard: Dashboard = {
            id: String(dashboardId).trim(),
            name: String(dashboardName).trim(),
            link: row.Link || row.link || undefined,
            owner: row.Owner || row.owner || undefined,
            businessArea: row.Business_Area || row.business_area || row.BusinessArea || undefined
          };
          
          // Prevent duplicate IDs
          if (!dashboards.has(dashboard.id)) {
            dashboards.set(dashboard.id, dashboard);
          } else {
            console.warn(`Duplicate dashboard ID found: ${dashboard.id} at row ${index + 2}`);
          }
        }
      } catch (error) {
        console.warn(`Error processing dashboard row ${index + 2}:`, error, row);
      }
    });

    console.log(`Successfully parsed ${dashboards.size} dashboards`);
  } catch (error) {
    console.error('Error parsing dashboards CSV:', error);
    throw error;
  }

  return dashboards;
};

export const parseDashboardTablesCSV = (csvContent: string): DashboardTable[] => {
  const dashboardTables: DashboardTable[] = [];
  
  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value?.trim() || ''
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing errors in dashboard tables:', result.errors);
    }

    console.log(`Processing ${result.data.length} dashboard table mapping rows...`);

    result.data.forEach((row: any, index: number) => {
      try {
        // More flexible column name checking
        const dashboardId = row['Dashboard ID'] || row['Dashboard_ID'] || row.dashboard_id || row.dashboardId;
        const tableId = row['Table ID'] || row['Table_ID'] || row.table_id || row.tableId;
        
        if (dashboardId && tableId) {
          dashboardTables.push({
            dashboardId: String(dashboardId).trim(),
            tableId: String(tableId).trim(),
            dashboardName: String(row.Dashboard_Name || row.dashboard_name || '').trim(),
            tableName: String(row.Table_Name || row.table_name || '').trim()
          });
        }
      } catch (error) {
        console.warn(`Error processing dashboard table row ${index + 2}:`, error, row);
      }
    });

    console.log(`Successfully parsed ${dashboardTables.length} dashboard table mappings`);
  } catch (error) {
    console.error('Error parsing dashboard tables CSV:', error);
    throw error;
  }

  return dashboardTables;
};

export const loadAndParseData = async (): Promise<ParsedData> => {
  const startTime = performance.now();
  console.log('🚀 Starting CSV data loading and parsing...');
  
  try {
    // Log memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('📊 Memory before loading:', {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
      });
    }

    const [tablesResponse, lineageResponse, dashboardsResponse, dashboardTablesResponse] = await Promise.all([
      fetch('/Digital Science Mapping Tables.csv'),
      fetch('/Digital Science Mapping Table Lineage.csv'),
      fetch('/Digital Science Mapping Dashboards.csv'),
      fetch('/Digital Science Mapping.csv')
    ]);

    console.log('📥 CSV files fetched, getting content sizes...');
    const [tablesCSV, lineageCSV, dashboardsCSV, dashboardTablesCSV] = await Promise.all([
      tablesResponse.text(),
      lineageResponse.text(),
      dashboardsResponse.text(),
      dashboardTablesResponse.text()
    ]);

    // Log file sizes
    console.log('📁 CSV file sizes:', {
      tables: `${Math.round(tablesCSV.length / 1024)}KB (${tablesCSV.split('\n').length} lines)`,
      lineage: `${Math.round(lineageCSV.length / 1024)}KB (${lineageCSV.split('\n').length} lines)`,
      dashboards: `${Math.round(dashboardsCSV.length / 1024)}KB (${dashboardsCSV.split('\n').length} lines)`,
      dashboardTables: `${Math.round(dashboardTablesCSV.length / 1024)}KB (${dashboardTablesCSV.split('\n').length} lines)`
    });

    console.log('⚡ Starting parallel parsing...');
    const parseStart = performance.now();
    
    const parsedData = {
      tables: parseTablesCSV(tablesCSV),
      lineages: parseLineageCSV(lineageCSV),
      dashboards: parseDashboardsCSV(dashboardsCSV),
      dashboardTables: parseDashboardTablesCSV(dashboardTablesCSV)
    };
    
    const parseTime = performance.now() - parseStart;
    const totalTime = performance.now() - startTime;
    
    console.log('✅ Parsing completed:', {
      totalTables: parsedData.tables.size,
      totalLineages: parsedData.lineages.length,
      totalDashboards: parsedData.dashboards.size,
      totalMappings: parsedData.dashboardTables.length,
      parseTime: `${Math.round(parseTime)}ms`,
      totalTime: `${Math.round(totalTime)}ms`
    });

    // Log memory usage after parsing if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('📊 Memory after parsing:', {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
      });
    }

    return parsedData;
  } catch (error) {
    console.error('❌ Error loading CSV data:', error);
    throw error;
  }
};