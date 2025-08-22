export type LayerType = 'Raw' | 'Inter' | 'Target' | 'Reporting';
export type TableType = 'Table' | 'View' | 'Query' | 'Sheet';
export type ColumnDataType = 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'TIMESTAMP' | 'DATE' | 'JSON' | 'ARRAY';

export interface Column {
  id: string;
  table_id: string;
  column_name: string;
  data_type: ColumnDataType;
  is_nullable: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  name: string;
  dataset: string;
  layer: LayerType;
  tableType: TableType;
  isScheduledQuery: boolean;
  link?: string;
  description?: string;
  columns?: Column[];
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

// Union type for graph nodes - can be either a table or dashboard
export interface TableGraphNode extends Table {
  nodeType: 'table';
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  connectionCount?: number;
}

export interface DashboardGraphNode extends Dashboard {
  nodeType: 'dashboard';
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  connectionCount?: number;
}

export type GraphNode = TableGraphNode | DashboardGraphNode;

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

export interface CreateColumnRequest {
  table_id: string;
  column_name: string;
  data_type: ColumnDataType;
  is_nullable: boolean;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateColumnRequest {
  column_name?: string;
  data_type?: ColumnDataType;
  is_nullable?: boolean;
  description?: string;
}