import * as XLSX from 'xlsx';
import { ParsedData, Table, TableLineage, Dashboard, DashboardTable } from '../types';

export interface ExcelParseResult {
  success: boolean;
  data?: ParsedData;
  errors: string[];
  sheetInfo: {
    tables: { found: boolean; rowCount: number };
    lineage: { found: boolean; rowCount: number };
    dashboards: { found: boolean; rowCount: number };
    mappings: { found: boolean; rowCount: number };
  };
}

export const parseExcelFile = async (file: File): Promise<ExcelParseResult> => {
  const errors: string[] = [];
  const sheetInfo = {
    tables: { found: false, rowCount: 0 },
    lineage: { found: false, rowCount: 0 },
    dashboards: { found: false, rowCount: 0 },
    mappings: { found: false, rowCount: 0 }
  };

  try {
    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Look for sheets by name (case-insensitive)
    const sheetNames = workbook.SheetNames.map(name => ({ 
      original: name, 
      lower: name.toLowerCase() 
    }));
    
    // Find each required sheet
    const tablesSheet = findSheet(workbook, sheetNames, ['tables', 'table']);
    const lineageSheet = findSheet(workbook, sheetNames, ['lineage', 'lineages', 'table_lineage']);
    const dashboardsSheet = findSheet(workbook, sheetNames, ['dashboards', 'dashboard']);
    const mappingsSheet = findSheet(workbook, sheetNames, ['dashboard_mappings', 'mappings', 'dashboard_tables']);
    
    // Parse Tables sheet
    const tables = new Map<string, Table>();
    if (tablesSheet) {
      sheetInfo.tables.found = true;
      const data = XLSX.utils.sheet_to_json(tablesSheet, { defval: '' });
      sheetInfo.tables.rowCount = data.length;
      
      data.forEach((row: any) => {
        const tableId = row.Table_ID || row.table_id || row.ID || row.id;
        const tableName = row.Table_Name || row.table_name || row.Name || row.name;
        
        if (tableId && tableName) {
          tables.set(String(tableId).trim(), {
            id: String(tableId).trim(),
            name: String(tableName).trim(),
            dataset: String(row['Dataset/CustomQuery'] || row.Dataset || row.dataset || '').trim(),
            layer: row.Layer || row.layer || 'Raw',
            tableType: row.Table_Type || row.table_type || row.Type || 'Table',
            isScheduledQuery: String(row['Scheduled Query'] || row.scheduled_query || '').toLowerCase() === 'yes',
            link: row.Link || row.link || undefined,
            description: row.Description || row.description || undefined
          });
        }
      });
    } else {
      errors.push('Tables sheet not found. Expected sheet name: "Tables"');
    }
    
    // Parse Lineage sheet
    const lineages: TableLineage[] = [];
    if (lineageSheet) {
      sheetInfo.lineage.found = true;
      const data = XLSX.utils.sheet_to_json(lineageSheet, { defval: '' });
      sheetInfo.lineage.rowCount = data.length;
      
      data.forEach((row: any) => {
        // Handle the 'datasets' column that actually contains target IDs
        const targetId = row.datasets || row.Target_Table_ID || row.target_table_id || row.targetId;
        const sourceId = row.Source_Table_ID || row.source_table_id || row.sourceId;
        
        if (targetId && sourceId) {
          lineages.push({
            targetTableId: String(targetId).trim(),
            sourceTableId: String(sourceId).trim(),
            targetTableName: String(row.Target_Table_Name || row.target_name || '').trim(),
            sourceTableName: String(row.Source_Table_Name || row.source_name || '').trim()
          });
        }
      });
    } else {
      errors.push('Lineage sheet not found. Expected sheet name: "Lineage"');
    }
    
    // Parse Dashboards sheet
    const dashboards = new Map<string, Dashboard>();
    if (dashboardsSheet) {
      sheetInfo.dashboards.found = true;
      const data = XLSX.utils.sheet_to_json(dashboardsSheet, { defval: '' });
      sheetInfo.dashboards.rowCount = data.length;
      
      data.forEach((row: any) => {
        const dashboardId = row.Dashboard_ID || row.dashboard_id || row.ID || row.id;
        const dashboardName = row.Dashboard_Name || row.dashboard_name || row.Name || row.name;
        
        if (dashboardId && dashboardName) {
          dashboards.set(String(dashboardId).trim(), {
            id: String(dashboardId).trim(),
            name: String(dashboardName).trim(),
            link: row.Link || row.link || undefined,
            owner: row.Owner || row.owner || undefined,
            businessArea: row.Business_Area || row.business_area || row.BusinessArea || undefined
          });
        }
      });
    } else {
      errors.push('Dashboards sheet not found. Expected sheet name: "Dashboards"');
    }
    
    // Parse Dashboard Mappings sheet
    const dashboardTables: DashboardTable[] = [];
    if (mappingsSheet) {
      sheetInfo.mappings.found = true;
      const data = XLSX.utils.sheet_to_json(mappingsSheet, { defval: '' });
      sheetInfo.mappings.rowCount = data.length;
      
      data.forEach((row: any) => {
        const dashboardId = row['Dashboard ID'] || row.Dashboard_ID || row.dashboard_id;
        const tableId = row['Table ID'] || row.Table_ID || row.table_id;
        
        if (dashboardId && tableId) {
          dashboardTables.push({
            dashboardId: String(dashboardId).trim(),
            tableId: String(tableId).trim(),
            dashboardName: String(row.Dashboard_Name || row.dashboard_name || '').trim(),
            tableName: String(row.Table_Name || row.table_name || '').trim()
          });
        }
      });
    } else {
      errors.push('Dashboard Mappings sheet not found. Expected sheet name: "Dashboard_Mappings"');
    }
    
    // Check if we have all required sheets
    const allSheetsFound = sheetInfo.tables.found && sheetInfo.lineage.found && 
                          sheetInfo.dashboards.found && sheetInfo.mappings.found;
    
    if (!allSheetsFound) {
      return {
        success: false,
        errors,
        sheetInfo
      };
    }
    
    return {
      success: true,
      data: {
        tables,
        lineages,
        dashboards,
        dashboardTables
      },
      errors,
      sheetInfo
    };
    
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    errors.push(`Failed to parse Excel file: ${error}`);
    return {
      success: false,
      errors,
      sheetInfo
    };
  }
};

// Helper function to find a sheet by possible names
function findSheet(workbook: XLSX.WorkBook, sheetNames: { original: string; lower: string }[], possibleNames: string[]): XLSX.WorkSheet | null {
  for (const possibleName of possibleNames) {
    const sheet = sheetNames.find(s => s.lower === possibleName.toLowerCase());
    if (sheet) {
      return workbook.Sheets[sheet.original];
    }
  }
  return null;
}

// Generate an example Excel file with all required sheets
export const generateExampleExcel = (): void => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Tables sheet data
  const tablesData = [
    {
      'Table_ID': 'TBL001',
      'Table_Name': 'users',
      'Dataset/CustomQuery': 'analytics',
      'Layer': 'Raw',
      'Table_Type': 'Table',
      'Scheduled Query': 'No',
      'Link': 'https://example.com/tables/users',
      'Description': 'User data table'
    },
    {
      'Table_ID': 'TBL002',
      'Table_Name': 'orders',
      'Dataset/CustomQuery': 'analytics',
      'Layer': 'Raw',
      'Table_Type': 'Table',
      'Scheduled Query': 'Yes',
      'Link': 'https://example.com/tables/orders',
      'Description': 'Order transactions'
    },
    {
      'Table_ID': 'TBL003',
      'Table_Name': 'user_orders',
      'Dataset/CustomQuery': 'analytics',
      'Layer': 'Inter',
      'Table_Type': 'View',
      'Scheduled Query': 'No',
      'Link': '',
      'Description': 'Join of users and orders'
    },
    {
      'Table_ID': 'TBL004',
      'Table_Name': 'revenue_dashboard',
      'Dataset/CustomQuery': 'analytics',
      'Layer': 'Target',
      'Table_Type': 'Query',
      'Scheduled Query': 'No',
      'Link': '',
      'Description': 'Revenue metrics for dashboard'
    }
  ];
  
  // Lineage sheet data
  const lineageData = [
    {
      'datasets': 'TBL003',
      'Source_Table_ID': 'TBL001',
      'Target_Table_Name': 'user_orders',
      'Source_Table_Name': 'users'
    },
    {
      'datasets': 'TBL003',
      'Source_Table_ID': 'TBL002',
      'Target_Table_Name': 'user_orders',
      'Source_Table_Name': 'orders'
    },
    {
      'datasets': 'TBL004',
      'Source_Table_ID': 'TBL003',
      'Target_Table_Name': 'revenue_dashboard',
      'Source_Table_Name': 'user_orders'
    }
  ];
  
  // Dashboards sheet data
  const dashboardsData = [
    {
      'Dashboard_ID': 'DASH001',
      'Dashboard_Name': 'Revenue Analytics',
      'Link': 'https://example.com/dashboards/revenue',
      'Owner': 'John Doe',
      'Business_Area': 'Finance'
    },
    {
      'Dashboard_ID': 'DASH002',
      'Dashboard_Name': 'User Metrics',
      'Link': 'https://example.com/dashboards/users',
      'Owner': 'Jane Smith',
      'Business_Area': 'Product'
    }
  ];
  
  // Dashboard Mappings sheet data
  const mappingsData = [
    {
      'Dashboard ID': 'DASH001',
      'Table ID': 'TBL004',
      'Dashboard_Name': 'Revenue Analytics',
      'Table_Name': 'revenue_dashboard'
    },
    {
      'Dashboard ID': 'DASH002',
      'Table ID': 'TBL003',
      'Dashboard_Name': 'User Metrics',
      'Table_Name': 'user_orders'
    }
  ];
  
  // Create sheets from data
  const tablesSheet = XLSX.utils.json_to_sheet(tablesData);
  const lineageSheet = XLSX.utils.json_to_sheet(lineageData);
  const dashboardsSheet = XLSX.utils.json_to_sheet(dashboardsData);
  const mappingsSheet = XLSX.utils.json_to_sheet(mappingsData);
  
  // Add sheets to workbook
  XLSX.utils.book_append_sheet(wb, tablesSheet, 'Tables');
  XLSX.utils.book_append_sheet(wb, lineageSheet, 'Lineage');
  XLSX.utils.book_append_sheet(wb, dashboardsSheet, 'Dashboards');
  XLSX.utils.book_append_sheet(wb, mappingsSheet, 'Dashboard_Mappings');
  
  // Generate and download the file
  XLSX.writeFile(wb, 'lineage_template.xlsx');
};