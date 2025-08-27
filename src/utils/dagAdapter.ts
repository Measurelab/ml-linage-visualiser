import { Node, Edge, MarkerType } from 'reactflow';
import { GraphData, GraphNode, GraphLink } from '../types';
import { getNodeColor } from './graphBuilder';
import * as dagre from 'dagre';

export interface DAGNode extends Node {
  width?: number;
  height?: number;
  measured?: {
    width?: number;
    height?: number;
  };
  data: {
    originalNode: GraphNode;
    label: string;
    layer?: string;
    dataset?: string;
    tableType?: string;
    isScheduledQuery?: boolean;
    connectionCount?: number;
  };
}

export interface DAGEdge extends Edge {
  data?: {
    originalLink: GraphLink;
  };
}

export interface DAGData {
  nodes: DAGNode[];
  edges: DAGEdge[];
}

/**
 * Convert GraphData (D3 format) to React Flow format for DAG visualization
 */
export const convertToDAGFormat = (graphData: GraphData): DAGData => {

  // Convert nodes
  const dagNodes: DAGNode[] = graphData.nodes.map((node, index) => {
    const nodeData = node as any; // Cast to access layer, dataset, etc.
    const width = getNodeWidth(node);
    const height = getNodeHeight(node);
    
    return {
      id: node.id,
      type: node.nodeType === 'dashboard' ? 'dashboardNode' : 'tableNode',
      position: { x: 0, y: 0 }, // Will be set by dagre layout
      // React Flow expects width/height at the top level, not in style
      width,
      height,
      data: {
        originalNode: node,
        label: node.name,
        layer: nodeData.layer,
        dataset: nodeData.dataset,
        tableType: nodeData.tableType,
        isScheduledQuery: nodeData.isScheduledQuery,
        connectionCount: node.connectionCount || 0,
      },
      style: {
        backgroundColor: getNodeColor(node),
        color: '#ffffff',
        border: '2px solid #ffffff',
        borderRadius: node.nodeType === 'dashboard' ? '50%' : '8px',
        fontSize: '12px',
        fontWeight: '600',
      },
      draggable: true,
    };
  });

  // Convert edges/links
  const dagEdges: DAGEdge[] = graphData.links.map((link, index) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    return {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'default',
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6b7280',
      },
      style: {
        stroke: '#6b7280',
        strokeWidth: 1.5,
        strokeOpacity: 0.4,
      },
      data: {
        originalLink: link,
      },
    };
  });

  return {
    nodes: dagNodes,
    edges: dagEdges,
  };
};

/**
 * Get node width based on type and connection count
 */
const getNodeWidth = (node: GraphNode): number => {
  if (node.nodeType === 'dashboard') {
    return 120; // Larger for dashboards
  }
  
  // Base width for tables, with scaling based on connections
  const baseWidth = 80;
  const maxWidth = 140;
  const connectionCount = node.connectionCount || 0;
  
  // Scale width based on connection count (similar to radius scaling in D3 version)
  const scale = Math.min(connectionCount / 10, 1); // Max scale at 10 connections
  return Math.round(baseWidth + (scale * (maxWidth - baseWidth)));
};

/**
 * Get node height based on type
 */
const getNodeHeight = (node: GraphNode): number => {
  if (node.nodeType === 'dashboard') {
    return 120; // Square/circular dashboards
  }
  
  return 60; // Standard height for table nodes
};

/**
 * Get layer priority for left-to-right positioning (lower number = leftmost position)
 */
export const getLayerPriority = (layer: string): number => {
  const priorities = {
    'Raw': 0,      // Leftmost - data sources
    'Inter': 1,    // Second - intermediate processing  
    'Target': 2,   // Third - processed outputs
    'Reporting': 3, // Fourth - final reports
  };
  
  return priorities[layer as keyof typeof priorities] || 1;
};

/**
 * Apply dagre layout algorithm to position nodes hierarchically
 */
export const applyDAGLayout = (nodes: DAGNode[], edges: DAGEdge[]): { nodes: DAGNode[]; edges: DAGEdge[] } => {
  const g = new dagre.graphlib.Graph();
  
  // Calculate optimal spacing based on node dimensions
  const avgNodeWidth = nodes.reduce((sum, node) => {
    const measuredWidth = (node as any).measured?.width;
    const width = measuredWidth || node.width || 80;
    return sum + width;
  }, 0) / nodes.length;
  
  const avgNodeHeight = nodes.reduce((sum, node) => {
    const measuredHeight = (node as any).measured?.height;
    const height = measuredHeight || node.height || 60;
    return sum + height;
  }, 0) / nodes.length;

  // Configure dagre graph with spacing optimized for reducing congestion
  g.setGraph({ 
    rankdir: 'LR', // Left to right for layer-based grouping
    ranksep: Math.max(avgNodeWidth * 4.5, 350), // Even wider horizontal spacing between layers
    nodesep: Math.max(avgNodeHeight * 3, 150),  // Much more vertical spacing to spread nodes
    edgesep: 80,   // Significant space between parallel edges
    marginx: Math.max(avgNodeWidth * 2, 120),  // Larger horizontal margins
    marginy: Math.max(avgNodeHeight * 1, 50), // More vertical margins
    acyclicer: 'greedy', // Handle cycles better
    ranker: 'network-simplex', // Use network-simplex for better results
  });
  
  g.setDefaultEdgeLabel(() => ({}));

  // Validate nodes have required dimensions (prefer measured, fallback to declared)
  const validNodes = nodes.filter(node => {
    const hasId = !!node.id;
    const measuredWidth = (node as any).measured?.width;
    const measuredHeight = (node as any).measured?.height;
    const declaredWidth = node.width;
    const declaredHeight = node.height;
    
    const hasWidth = measuredWidth > 0 || declaredWidth > 0;
    const hasHeight = measuredHeight > 0 || declaredHeight > 0;
    
    return hasId && hasWidth && hasHeight;
  });


  // Add nodes to dagre graph with measured dimensions and layer-based ranking
  validNodes.forEach((node) => {
    // Prefer measured dimensions from React Flow, fallback to declared dimensions
    const measuredWidth = (node as any).measured?.width;
    const measuredHeight = (node as any).measured?.height;
    const width = measuredWidth || node.width || 80;
    const height = measuredHeight || node.height || 60;
    
    // Assign rank based on layer for left-to-right positioning
    let rank = getLayerPriority(node.data.layer || '');
    
    // Dashboards go to the far right (highest rank)
    if (node.type === 'dashboardNode') {
      rank = 10; // Ensure dashboards are always on the far right
    }
    
    
    g.setNode(node.id, { 
      width,
      height,
      label: node.data.label || node.id,
      rank: rank, // Add rank for dagre to respect layer ordering
    });
  });

  // Add edges to dagre graph with validation
  const validEdges = edges.filter(edge => 
    edge.source && 
    edge.target && 
    g.hasNode(edge.source) && 
    g.hasNode(edge.target)
  );

  validEdges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Apply layout
  try {
    dagre.layout(g);
  } catch (error) {
    console.error('Dagre layout failed:', error);
    // Fallback to simple grid layout
    return applyFallbackLayout(validNodes, validEdges);
  }

  // Update node positions with proper coordinate system
  const layoutNodes = validNodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    
    if (!nodeWithPosition) {
      console.warn(`No position found for node ${node.id}`);
      return {
        ...node,
        position: { x: Math.random() * 200, y: Math.random() * 200 },
      };
    }

    // Get the actual dimensions used in dagre calculation
    const actualWidth = nodeWithPosition.width;
    const actualHeight = nodeWithPosition.height;

    return {
      ...node,
      position: {
        // Convert from dagre coordinate system (center-center) to React Flow (top-left)
        x: Math.round(nodeWithPosition.x - (actualWidth / 2)),
        y: Math.round(nodeWithPosition.y - (actualHeight / 2)),
      },
    };
  });


  return {
    nodes: layoutNodes,
    edges: validEdges,
  };
};

/**
 * Fallback layout when dagre fails
 */
const applyFallbackLayout = (nodes: DAGNode[], edges: DAGEdge[]): { nodes: DAGNode[]; edges: DAGEdge[] } => {
  
  // Group nodes by layer for better organization
  const nodesByLayer: { [key: string]: DAGNode[] } = {};
  nodes.forEach(node => {
    const layer = node.data.layer || 'Unknown';
    if (!nodesByLayer[layer]) nodesByLayer[layer] = [];
    nodesByLayer[layer].push(node);
  });

  const layers = ['Raw', 'Inter', 'Target', 'Reporting', 'Unknown'];
  
  // Calculate spacing based on node dimensions
  const maxNodeWidth = nodes.reduce((max, node) => {
    const measuredWidth = (node as any).measured?.width;
    const width = measuredWidth || node.width || 80;
    return Math.max(max, width);
  }, 0);
  
  const maxNodeHeight = nodes.reduce((max, node) => {
    const measuredHeight = (node as any).measured?.height;
    const height = measuredHeight || node.height || 60;
    return Math.max(max, height);
  }, 0);

  const horizontalSpacing = maxNodeWidth * 4; // Even wider spacing between layers
  const verticalSpacing = maxNodeHeight + 20;   // Reduced gap within layers
  
  const layoutNodes = nodes.map(node => {
    const layer = node.data.layer || 'Unknown';
    const layerNodes = nodesByLayer[layer];
    const nodeIndex = layerNodes.indexOf(node);
    
    // Calculate position for left-to-right layout
    const layerX = layers.indexOf(layer) * horizontalSpacing + 50;
    const startY = 50;
    const y = startY + (nodeIndex * verticalSpacing);

    // Dashboards go to the far right
    const x = node.type === 'dashboardNode' 
      ? (layers.length * horizontalSpacing) + 100 // Far right
      : layerX;

    return {
      ...node,
      position: { x, y },
    };
  });


  return { nodes: layoutNodes, edges };
};