export type LayerType = 'Raw' | 'Inter' | 'Target';
export type TableType = 'Table' | 'View' | 'Query' | 'Sheet';

export interface Table {
  id: string;
  name: string;
  dataset: string;
  layer: LayerType;
  tableType: TableType;
  isScheduledQuery: boolean;
  link?: string;
  description?: string;
}

export interface TableLineage {
  targetTableId: string;
  sourceTableId: string;
  targetTableName: string;
  sourceTableName: string;
}

export interface Dashboard {
  id: string;
  name: string;
  link?: string;
  owner?: string;
  businessArea?: string;
}

export interface DashboardTable {
  dashboardId: string;
  tableId: string;
  dashboardName: string;
  tableName: string;
}

export interface GraphNode extends Table {
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ParsedData {
  tables: Map<string, Table>;
  lineages: TableLineage[];
  dashboards: Map<string, Dashboard>;
  dashboardTables: DashboardTable[];
}

export interface FilterOptions {
  datasets: string[];
  layers: LayerType[];
  tableTypes: TableType[];
  showScheduledOnly: boolean;
  searchTerm: string;
  selectedDashboard?: string;
}