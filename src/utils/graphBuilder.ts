import { 
  Table, 
  TableLineage, 
  GraphNode, 
  GraphLink, 
  GraphData, 
  ParsedData,
  FilterOptions 
} from '../types';

export const buildGraphData = (
  parsedData: ParsedData,
  filters?: Partial<FilterOptions>
): GraphData => {
  const { tables, lineages } = parsedData;
  
  const filteredNodes = filterNodes(tables, filters);
  const nodeIds = new Set(Array.from(filteredNodes.values()).map(n => n.id));
  
  const filteredLinks = lineages
    .filter(lineage => 
      nodeIds.has(lineage.sourceTableId) && 
      nodeIds.has(lineage.targetTableId)
    )
    .map(lineage => ({
      source: lineage.sourceTableId,
      target: lineage.targetTableId
    }));

  const nodes = Array.from(filteredNodes.values());
  
  return {
    nodes,
    links: filteredLinks
  };
};

const filterNodes = (
  tables: Map<string, Table>,
  filters?: Partial<FilterOptions>
): Map<string, GraphNode> => {
  const filteredNodes = new Map<string, GraphNode>();
  
  tables.forEach((table, id) => {
    let include = true;
    
    if (filters) {
      if (filters.datasets && filters.datasets.length > 0) {
        include = include && filters.datasets.includes(table.dataset);
      }
      
      if (filters.layers && filters.layers.length > 0) {
        include = include && filters.layers.includes(table.layer);
      }
      
      if (filters.tableTypes && filters.tableTypes.length > 0) {
        include = include && filters.tableTypes.includes(table.tableType);
      }
      
      if (filters.showScheduledOnly) {
        include = include && table.isScheduledQuery;
      }
      
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        include = include && (
          table.name.toLowerCase().includes(searchLower) ||
          table.id.toLowerCase().includes(searchLower) ||
          table.dataset.toLowerCase().includes(searchLower)
        );
      }
    }
    
    if (include) {
      filteredNodes.set(id, { ...table });
    }
  });
  
  return filteredNodes;
};

export const getTablesByDashboard = (
  dashboardId: string,
  parsedData: ParsedData
): Set<string> => {
  const tableIds = new Set<string>();
  
  parsedData.dashboardTables.forEach(dt => {
    if (dt.dashboardId === dashboardId) {
      tableIds.add(dt.tableId);
    }
  });
  
  return tableIds;
};

export const getUpstreamTables = (
  tableId: string,
  lineages: TableLineage[],
  maxDepth: number = -1
): Set<string> => {
  const upstream = new Set<string>();
  const toVisit = [{ id: tableId, depth: 0 }];
  const visited = new Set<string>();
  
  while (toVisit.length > 0) {
    const current = toVisit.shift()!;
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    if (current.id !== tableId) {
      upstream.add(current.id);
    }
    
    if (maxDepth === -1 || current.depth < maxDepth) {
      lineages.forEach(lineage => {
        if (lineage.targetTableId === current.id && !visited.has(lineage.sourceTableId)) {
          toVisit.push({ id: lineage.sourceTableId, depth: current.depth + 1 });
        }
      });
    }
  }
  
  return upstream;
};

export const getDownstreamTables = (
  tableId: string,
  lineages: TableLineage[],
  maxDepth: number = -1
): Set<string> => {
  const downstream = new Set<string>();
  const toVisit = [{ id: tableId, depth: 0 }];
  const visited = new Set<string>();
  
  while (toVisit.length > 0) {
    const current = toVisit.shift()!;
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    if (current.id !== tableId) {
      downstream.add(current.id);
    }
    
    if (maxDepth === -1 || current.depth < maxDepth) {
      lineages.forEach(lineage => {
        if (lineage.sourceTableId === current.id && !visited.has(lineage.targetTableId)) {
          toVisit.push({ id: lineage.targetTableId, depth: current.depth + 1 });
        }
      });
    }
  }
  
  return downstream;
};

export const getLayerColor = (layer: string): string => {
  switch (layer) {
    case 'Raw':
      return '#10b981'; // green
    case 'Inter':
      return '#3b82f6'; // blue
    case 'Target':
      return '#f59e0b'; // amber
    default:
      return '#6b7280'; // gray
  }
};

export const getTableTypeIcon = (type: string): string => {
  switch (type) {
    case 'Table':
      return 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z';
    case 'View':
      return 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z';
    case 'Query':
      return 'M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 00-1.414 1.414L13.586 15H12z';
    case 'Sheet':
      return 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 012-2v-5a2 2 0 012-2 1 1 0 000-2h-1a4 4 0 00-3 1.354A4 4 0 005 4H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2v4H4V5z';
    default:
      return 'M7 2a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 4a1 1 0 000 2h4a1 1 0 100-2h-4z';
  }
};