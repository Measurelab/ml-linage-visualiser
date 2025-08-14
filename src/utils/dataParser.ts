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
  
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  result.data.forEach((row: any) => {
    if (row.Table_ID && row.Table_Name) {
      const table: Table = {
        id: row.Table_ID,
        name: row.Table_Name,
        dataset: row['Dataset/CustomQuery'] || '',
        layer: (row.Layer as LayerType) || 'Raw',
        tableType: (row.Table_Type as TableType) || 'Table',
        isScheduledQuery: row['Scheduled Query'] === 'Yes',
        link: row.Link || undefined,
        description: row.Description || undefined
      };
      tables.set(table.id, table);
    }
  });

  return tables;
};

export const parseLineageCSV = (csvContent: string): TableLineage[] => {
  const lineages: TableLineage[] = [];
  
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  result.data.forEach((row: any) => {
    // Handle different column name formats
    const targetTableId = row.Target_Table_ID || row.datasets;
    const sourceTableId = row.Source_Table_ID;
    
    if (targetTableId && sourceTableId) {
      lineages.push({
        targetTableId: targetTableId,
        sourceTableId: sourceTableId,
        targetTableName: row.Target_Table_Name || '',
        sourceTableName: row.Source_Table_Name || ''
      });
    }
  });

  return lineages;
};

export const parseDashboardsCSV = (csvContent: string): Map<string, Dashboard> => {
  const dashboards = new Map<string, Dashboard>();
  
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  result.data.forEach((row: any) => {
    if (row.Dashboard_ID && row.Dashboard_Name) {
      const dashboard: Dashboard = {
        id: row.Dashboard_ID,
        name: row.Dashboard_Name,
        link: row.Link || undefined,
        owner: row.Owner || undefined,
        businessArea: row.Business_Area || undefined
      };
      dashboards.set(dashboard.id, dashboard);
    }
  });

  return dashboards;
};

export const parseDashboardTablesCSV = (csvContent: string): DashboardTable[] => {
  const dashboardTables: DashboardTable[] = [];
  
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  });

  result.data.forEach((row: any) => {
    if (row['Dashboard ID'] && row['Table ID']) {
      dashboardTables.push({
        dashboardId: row['Dashboard ID'],
        tableId: row['Table ID'],
        dashboardName: row.Dashboard_Name || '',
        tableName: row.Table_Name || ''
      });
    }
  });

  return dashboardTables;
};

export const loadAndParseData = async (): Promise<ParsedData> => {
  try {
    const [tablesResponse, lineageResponse, dashboardsResponse, dashboardTablesResponse] = await Promise.all([
      fetch('/Digital Science Mapping Tables.csv'),
      fetch('/Digital Science Mapping Table Lineage.csv'),
      fetch('/Digital Science Mapping Dashboards.csv'),
      fetch('/Digital Science Mapping.csv')
    ]);

    const [tablesCSV, lineageCSV, dashboardsCSV, dashboardTablesCSV] = await Promise.all([
      tablesResponse.text(),
      lineageResponse.text(),
      dashboardsResponse.text(),
      dashboardTablesResponse.text()
    ]);

    return {
      tables: parseTablesCSV(tablesCSV),
      lineages: parseLineageCSV(lineageCSV),
      dashboards: parseDashboardsCSV(dashboardsCSV),
      dashboardTables: parseDashboardTablesCSV(dashboardTablesCSV)
    };
  } catch (error) {
    console.error('Error loading CSV data:', error);
    throw error;
  }
};