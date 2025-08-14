import * as XLSX from 'xlsx';
import { ParsedData } from '../types';
import { parseTablesCSV, parseLineageCSV, parseDashboardsCSV, parseDashboardTablesCSV } from './dataParser';

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
  const result: ExcelParseResult = {
    success: false,
    errors: [],
    sheetInfo: {
      tables: { found: false, rowCount: 0 },
      lineage: { found: false, rowCount: 0 },
      dashboards: { found: false, rowCount: 0 },
      mappings: { found: false, rowCount: 0 }
    }
  };

  try {
    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Expected sheet names (case-insensitive)
    const expectedSheets = ['tables', 'lineage', 'dashboards', 'dashboard_mappings'];
    const foundSheets = workbook.SheetNames.map(name => name.toLowerCase());

    // Check for required sheets
    const missingSheets: string[] = [];
    expectedSheets.forEach(sheetName => {
      if (!foundSheets.includes(sheetName)) {
        missingSheets.push(sheetName);
      }
    });

    if (missingSheets.length > 0) {
      result.errors.push(`Missing required sheets: ${missingSheets.join(', ')}`);
      return result;
    }

    // Parse each sheet
    const parsedData: ParsedData = {
      tables: new Map(),
      lineages: [],
      dashboards: new Map(),
      dashboardTables: []
    };

    // Parse Tables sheet
    try {
      const tablesSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase() === 'tables'
      );
      if (tablesSheetName) {
        const tablesSheet = workbook.Sheets[tablesSheetName];
        const tablesCSV = XLSX.utils.sheet_to_csv(tablesSheet);
        parsedData.tables = parseTablesCSV(tablesCSV);
        result.sheetInfo.tables = { found: true, rowCount: parsedData.tables.size };
      }
    } catch (error) {
      result.errors.push(`Error parsing Tables sheet: ${error}`);
    }

    // Parse Lineage sheet
    try {
      const lineageSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase() === 'lineage'
      );
      
      if (lineageSheetName) {
        const lineageSheet = workbook.Sheets[lineageSheetName];
        const lineageCSV = XLSX.utils.sheet_to_csv(lineageSheet);
        parsedData.lineages = parseLineageCSV(lineageCSV);
        result.sheetInfo.lineage = { found: true, rowCount: parsedData.lineages.length };
      } else {
        result.errors.push('Lineage sheet not found');
      }
    } catch (error) {
      result.errors.push(`Error parsing Lineage sheet: ${error}`);
    }

    // Parse Dashboards sheet
    try {
      const dashboardsSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase() === 'dashboards'
      );
      if (dashboardsSheetName) {
        const dashboardsSheet = workbook.Sheets[dashboardsSheetName];
        const dashboardsCSV = XLSX.utils.sheet_to_csv(dashboardsSheet);
        parsedData.dashboards = parseDashboardsCSV(dashboardsCSV);
        result.sheetInfo.dashboards = { found: true, rowCount: parsedData.dashboards.size };
      }
    } catch (error) {
      result.errors.push(`Error parsing Dashboards sheet: ${error}`);
    }

    // Parse Dashboard Mappings sheet
    try {
      const mappingsSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase() === 'dashboard_mappings'
      );
      if (mappingsSheetName) {
        const mappingsSheet = workbook.Sheets[mappingsSheetName];
        const mappingsCSV = XLSX.utils.sheet_to_csv(mappingsSheet);
        parsedData.dashboardTables = parseDashboardTablesCSV(mappingsCSV);
        result.sheetInfo.mappings = { found: true, rowCount: parsedData.dashboardTables.length };
      }
    } catch (error) {
      result.errors.push(`Error parsing Dashboard Mappings sheet: ${error}`);
    }

    // Check if we have data
    if (parsedData.tables.size === 0) {
      result.errors.push('No tables found in the Excel file');
    }

    if (result.errors.length === 0) {
      result.success = true;
      result.data = parsedData;
    }

    return result;
  } catch (error) {
    result.errors.push(`Failed to parse Excel file: ${error}`);
    return result;
  }
};

export const generateExampleExcel = () => {
  // Create example data for each sheet
  const tablesData = [
    ['Table_ID', 'Table_Name', 'Dataset/CustomQuery', 'Layer', 'Table_Type', 'Scheduled Query', 'Link', 'Description'],
    ['TBL001', 'users', 'analytics', 'Raw', 'Table', 'No', 'https://example.com/tables/users', 'User data table'],
    ['TBL002', 'orders', 'analytics', 'Raw', 'Table', 'Yes', 'https://example.com/tables/orders', 'Order transactions'],
    ['TBL003', 'user_orders', 'analytics', 'Inter', 'View', 'No', '', 'Join of users and orders'],
    ['TBL004', 'revenue_dashboard', 'analytics', 'Target', 'Query', 'No', '', 'Revenue metrics for dashboard']
  ];

  const lineageData = [
    ['Target_Table_ID', 'Source_Table_ID', 'Target_Table_Name', 'Source_Table_Name'],
    ['TBL003', 'TBL001', 'user_orders', 'users'],
    ['TBL003', 'TBL002', 'user_orders', 'orders'],
    ['TBL004', 'TBL003', 'revenue_dashboard', 'user_orders']
  ];

  const dashboardsData = [
    ['Dashboard_ID', 'Dashboard_Name', 'Link', 'Owner', 'Business_Area'],
    ['DASH001', 'Revenue Analytics', 'https://example.com/dashboards/revenue', 'John Doe', 'Finance'],
    ['DASH002', 'User Metrics', 'https://example.com/dashboards/users', 'Jane Smith', 'Product']
  ];

  const mappingsData = [
    ['Dashboard ID', 'Table ID', 'Dashboard_Name', 'Table_Name'],
    ['DASH001', 'TBL004', 'Revenue Analytics', 'revenue_dashboard'],
    ['DASH002', 'TBL003', 'User Metrics', 'user_orders']
  ];

  // Create workbook with sheets
  const workbook = XLSX.utils.book_new();
  
  const tablesSheet = XLSX.utils.aoa_to_sheet(tablesData);
  XLSX.utils.book_append_sheet(workbook, tablesSheet, 'Tables');
  
  const lineageSheet = XLSX.utils.aoa_to_sheet(lineageData);
  XLSX.utils.book_append_sheet(workbook, lineageSheet, 'Lineage');
  
  const dashboardsSheet = XLSX.utils.aoa_to_sheet(dashboardsData);
  XLSX.utils.book_append_sheet(workbook, dashboardsSheet, 'Dashboards');
  
  const mappingsSheet = XLSX.utils.aoa_to_sheet(mappingsData);
  XLSX.utils.book_append_sheet(workbook, mappingsSheet, 'Dashboard_Mappings');

  // Download the file
  XLSX.writeFile(workbook, 'lineage_template.xlsx');
};