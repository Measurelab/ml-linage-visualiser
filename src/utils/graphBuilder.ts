import { 
  GraphNode, 
  GraphData, 
  ParsedData,
  FilterOptions 
} from '../types';

export const buildGraphData = (
  parsedData: ParsedData,
  filters?: Partial<FilterOptions>
): GraphData => {
  const { lineages, dashboardTables } = parsedData;
  
  // Get filtered table nodes
  const filteredTableNodes = filterNodes(parsedData, filters);
  const tableIds = new Set(Array.from(filteredTableNodes.values()).map(n => n.id));
  
  // Get dashboard nodes (all dashboards for now - could add filtering later)
  const dashboardNodes = getDashboardNodes(parsedData, filters);
  const dashboardIds = new Set(Array.from(dashboardNodes.values()).map(n => n.id));
  
  // Combine all nodes
  const allNodes = new Map([...filteredTableNodes, ...dashboardNodes]);
  
  // Table-to-table connections
  console.log('🔍 Building graph with lineages:', lineages.length);
  console.log('🔍 Available table IDs:', Array.from(tableIds));
  
  const tableLinks = lineages
    .filter(lineage => {
      const hasSource = tableIds.has(lineage.sourceTableId);
      const hasTarget = tableIds.has(lineage.targetTableId);
      if (!hasSource || !hasTarget) {
        console.log(`⚠️ Filtering out lineage ${lineage.sourceTableId} → ${lineage.targetTableId} (source: ${hasSource}, target: ${hasTarget})`);
      }
      return hasSource && hasTarget;
    })
    .map(lineage => ({
      source: lineage.sourceTableId,
      target: lineage.targetTableId
    }));
  
  console.log('🔗 Created table links:', tableLinks.length, tableLinks);

  // Table-to-dashboard connections
  const dashboardLinks = dashboardTables
    .filter(dt => 
      tableIds.has(dt.tableId) && 
      dashboardIds.has(dt.dashboardId)
    )
    .map(dt => ({
      source: dt.tableId,
      target: dt.dashboardId
    }));

  const allLinks = [...tableLinks, ...dashboardLinks];
  const nodes = Array.from(allNodes.values());
  
  // Calculate connection count for each node
  const connectionCounts = new Map<string, number>();
  
  // Initialize all nodes with 0 connections
  nodes.forEach(node => {
    connectionCounts.set(node.id, 0);
  });
  
  // Count connections (both incoming and outgoing)
  allLinks.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
    
    connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
    connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
  });
  
  // Add connection count to each node
  const nodesWithConnections = nodes.map(node => ({
    ...node,
    connectionCount: connectionCounts.get(node.id) || 0
  }));
  
  return {
    nodes: nodesWithConnections,
    links: allLinks
  };
};

const filterNodes = (
  parsedData: ParsedData,
  filters?: Partial<FilterOptions>
): Map<string, GraphNode> => {
  const filteredNodes = new Map<string, GraphNode>();
  const { tables } = parsedData;
  
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
      
      // Filter by selected dashboard - show only tables connected to this dashboard
      if (filters.selectedDashboard) {
        const tablesInDashboard = getTablesByDashboard(filters.selectedDashboard, parsedData);
        include = include && tablesInDashboard.has(table.id);
      }
    }
    
    if (include) {
      const graphNode = { ...table, nodeType: 'table' };
      
      // If table has an initial position from canvas click, apply it
      if ((table as any).initialPosition) {
        graphNode.x = (table as any).initialPosition.x;
        graphNode.y = (table as any).initialPosition.y;
        // Don't fix the position immediately - let D3 handle it naturally
      }
      
      filteredNodes.set(id, graphNode);
    }
  });
  
  return filteredNodes;
};

const getDashboardNodes = (
  parsedData: ParsedData,
  filters?: Partial<FilterOptions>
): Map<string, GraphNode> => {
  const dashboardNodes = new Map<string, GraphNode>();
  const { dashboards } = parsedData;
  
  dashboards.forEach((dashboard, id) => {
    let include = true;
    
    if (filters) {
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        include = include && (
          dashboard.name.toLowerCase().includes(searchLower) ||
          dashboard.id.toLowerCase().includes(searchLower) ||
          (dashboard.owner?.toLowerCase().includes(searchLower) || false) ||
          (dashboard.businessArea?.toLowerCase().includes(searchLower) || false)
        );
      }
      
      // If filtering by selected dashboard, only show that dashboard
      if (filters.selectedDashboard) {
        include = include && dashboard.id === filters.selectedDashboard;
      }
    }
    
    if (include) {
      const graphNode = { ...dashboard, nodeType: 'dashboard' };
      
      // If dashboard has an initial position from canvas click, apply it
      if ((dashboard as any).initialPosition) {
        graphNode.x = (dashboard as any).initialPosition.x;
        graphNode.y = (dashboard as any).initialPosition.y;
        // Don't fix the position immediately - let D3 handle it naturally
      }
      
      dashboardNodes.set(id, graphNode);
    }
  });
  
  return dashboardNodes;
};

// Get all tables directly connected to a dashboard
export const getDirectTablesByDashboard = (
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

// Get all upstream tables (sources) for a given table
export const getUpstreamTables = (
  tableId: string,
  parsedData: ParsedData,
  visited = new Set<string>()
): Set<string> => {
  const upstreamTables = new Set<string>();
  
  if (visited.has(tableId)) {
    return upstreamTables; // Avoid infinite loops
  }
  visited.add(tableId);
  
  // Find all tables that feed into this table
  parsedData.lineages.forEach(lineage => {
    if (lineage.targetTableId === tableId) {
      upstreamTables.add(lineage.sourceTableId);
      // Recursively get upstream tables of the source
      const recursiveUpstream = getUpstreamTables(lineage.sourceTableId, parsedData, new Set(visited));
      recursiveUpstream.forEach(id => upstreamTables.add(id));
    }
  });
  
  return upstreamTables;
};

// Get all downstream tables (targets) for a given table
export const getDownstreamTables = (
  tableId: string,
  parsedData: ParsedData,
  visited = new Set<string>()
): Set<string> => {
  const downstreamTables = new Set<string>();
  
  if (visited.has(tableId)) {
    return downstreamTables; // Avoid infinite loops
  }
  visited.add(tableId);
  
  // Find all tables that this table feeds into
  parsedData.lineages.forEach(lineage => {
    if (lineage.sourceTableId === tableId) {
      downstreamTables.add(lineage.targetTableId);
      // Recursively get downstream tables of the target
      const recursiveDownstream = getDownstreamTables(lineage.targetTableId, parsedData, new Set(visited));
      recursiveDownstream.forEach(id => downstreamTables.add(id));
    }
  });
  
  return downstreamTables;
};

// Get all tables connected to a dashboard (direct + upstream + downstream)
export const getTablesByDashboard = (
  dashboardId: string,
  parsedData: ParsedData
): Set<string> => {
  const allTableIds = new Set<string>();
  
  // Get directly connected tables
  const directTables = getDirectTablesByDashboard(dashboardId, parsedData);
  directTables.forEach(id => allTableIds.add(id));
  
  // For each directly connected table, get all upstream and downstream tables
  directTables.forEach(tableId => {
    // Add the table itself
    allTableIds.add(tableId);
    
    // Get all upstream tables
    const upstreamTables = getUpstreamTables(tableId, parsedData);
    upstreamTables.forEach(id => allTableIds.add(id));
    
    // Get all downstream tables
    const downstreamTables = getDownstreamTables(tableId, parsedData);
    downstreamTables.forEach(id => allTableIds.add(id));
  });
  
  return allTableIds;
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

export const getNodeColor = (node: GraphNode): string => {
  if (node.nodeType === 'dashboard') {
    return '#8b5cf6'; // purple for dashboards
  }
  // For table nodes, use the existing layer color
  return getLayerColor((node as any).layer);
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