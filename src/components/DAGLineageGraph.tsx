import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  OnConnect,
  ConnectionMode,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { GraphData, GraphNode } from '../types';
import { convertToDAGFormat, applyDAGLayout, DAGNode } from '../utils/dagAdapter';
import { TableNode, DashboardNode } from './DAGCustomNode';
import { Database, BarChart3 } from 'lucide-react';

interface DAGLineageGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onFilterToLineage?: (node: GraphNode) => void;
  onNodeDelete?: (node: GraphNode) => void;
  onNodeAddUpstream?: (node: GraphNode) => void;
  onNodeAddDownstream?: (node: GraphNode) => void;
  onDashboardAdd?: (node: GraphNode) => void;
  onCanvasCreateTable?: (x: number, y: number) => void;
  onCanvasCreateDashboard?: (x: number, y: number) => void;
  highlightedNodes?: Set<string>;
  focusedNodeId?: string;
  width?: number;
  height?: number;
}

const DAGLineageGraph: React.FC<DAGLineageGraphProps> = ({
  data,
  onNodeClick,
  onFilterToLineage,
  onNodeDelete,
  onNodeAddUpstream,
  onNodeAddDownstream,
  onDashboardAdd,
  onCanvasCreateTable,
  onCanvasCreateDashboard,
  highlightedNodes = new Set(),
  focusedNodeId,
  width = window.innerWidth,
  height = window.innerHeight - 200,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeContextMenu, setNodeContextMenu] = useState<{
    x: number;
    y: number;
    node: GraphNode;
  } | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
  } | null>(null);

  // Memoize nodeTypes to prevent React Flow warnings
  const nodeTypes = useMemo(() => ({
    tableNode: TableNode,
    dashboardNode: DashboardNode,
  }), []);

  // Simplified approach: convert data and apply layout immediately without loading state
  useEffect(() => {
    if (!data.nodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    
    try {
      // Convert GraphData to DAG format
      const dagData = convertToDAGFormat(data);
      
      // Apply dagre layout immediately
      const layoutedData = applyDAGLayout(dagData.nodes, dagData.edges);
      
      setNodes(layoutedData.nodes);
      setEdges(layoutedData.edges);
      
    } catch (error) {
      console.error('Error in DAG processing:', error);
      // Fallback to simple positioning
      try {
        const dagData = convertToDAGFormat(data);
        // Apply simple grid positions as fallback
        const fallbackNodes = dagData.nodes.map((node, index) => ({
          ...node,
          position: {
            x: (index % 5) * 200 + 100,
            y: Math.floor(index / 5) * 100 + 100
          }
        }));
        setNodes(fallbackNodes);
        setEdges(dagData.edges);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setNodes([]);
        setEdges([]);
      }
    }
  }, [data, setNodes, setEdges]);

  // Apply highlighting to nodes and edges
  useEffect(() => {
    if (highlightedNodes.size > 0 || focusedNodeId) {
      setNodes((nds) =>
        nds.map((node) => {
          const opacity = highlightedNodes.size > 0 
            ? (highlightedNodes.has(node.id) ? 1 : 0.3)
            : (focusedNodeId ? (node.id === focusedNodeId ? 1 : 0.3) : 1);
          
          
          return {
            ...node,
            style: {
              ...node.style,
              opacity,
              filter: focusedNodeId === node.id ? 'drop-shadow(0 0 10px var(--primary))' : 'none',
            },
          };
        })
      );
      
      // Highlight edges that connect highlighted nodes or connect to/from focused node
      setEdges((eds) =>
        eds.map((edge) => {
          const isHighlightedConnection = highlightedNodes.size > 0 && 
            highlightedNodes.has(edge.source) && 
            highlightedNodes.has(edge.target);
          
          const isFocusedConnection = focusedNodeId && 
            (edge.source === focusedNodeId || edge.target === focusedNodeId);
          
          const isHighlighted = isHighlightedConnection || isFocusedConnection;
          
          return {
            ...edge,
            style: {
              ...edge.style,
              strokeOpacity: isHighlighted ? 0.8 : 0.15,
              strokeWidth: isHighlighted ? 2 : 1,
              stroke: isHighlighted ? 'var(--primary)' : '#6b7280',
            },
          };
        })
      );
    } else {
      // Reset all nodes to full opacity
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity: 1,
            filter: 'none',
          },
        }))
      );
      
      // Reset all edges to default styling
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          style: {
            ...edge.style,
            strokeOpacity: 0.4,
            strokeWidth: 1.5,
            stroke: '#6b7280',
          },
        }))
      );
    }
  }, [highlightedNodes, focusedNodeId, setNodes, setEdges]);

  // Handle node clicks - single click for selection or dashboard filtering
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const dagNode = node as DAGNode;
    const originalNode = dagNode.data.originalNode;
    
    // For dashboard nodes, handle filtering behavior like in the force layout
    if (originalNode.nodeType === 'dashboard' && onNodeClick) {
      // Dashboard click triggers filtering - this matches the force layout behavior
      onNodeClick(originalNode);
    } else if (onNodeClick) {
      // Regular table click for opening details panel
      onNodeClick(originalNode);
    }
  }, [onNodeClick]);

  // Handle node double clicks - same as single click for now
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (onNodeClick) {
      const dagNode = node as DAGNode;
      onNodeClick(dagNode.data.originalNode);
    }
  }, [onNodeClick]);

  // Handle node context menu with actions
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const dagNode = node as DAGNode;
    const originalNode = dagNode.data.originalNode;
    
    setNodeContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: originalNode
    });
  }, []);

  // Disable connections (this is a read-only visualization)
  const onConnect: OnConnect = useCallback(() => {
    // Do nothing - we don't allow manual connections
  }, []);

  // Handle pane context menu for creating new nodes
  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    if (onCanvasCreateTable || onCanvasCreateDashboard) {
      event.preventDefault();
      
      // Get the React Flow instance bounds
      const rect = event.currentTarget.getBoundingClientRect();
      const flowX = event.clientX - rect.left;
      const flowY = event.clientY - rect.top;
      
      setCanvasContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowX,
        flowY,
      });
    }
  }, [onCanvasCreateTable, onCanvasCreateDashboard]);

  // Handle pane click to close context menus
  const handlePaneClick = useCallback(() => {
    setNodeContextMenu(null);
    setCanvasContextMenu(null);
  }, []);


  return (
    <div style={{ width, height }} className="bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        elevateEdgesOnSelect={false}
        edgesFocusable={false}
        edgesUpdatable={false}
        connectionRadius={50}
      >
        <Background 
          color="var(--muted-foreground)" 
          gap={20}
        />
        <Controls 
          showInteractive={false}
          className="react-flow-controls"
        />
        <MiniMap
          nodeColor={(node) => {
            const dagNode = node as DAGNode;
            return dagNode.style?.backgroundColor || 'var(--muted)';
          }}
          nodeStrokeWidth={2}
          pannable
          zoomable
          className="react-flow-minimap"
        />
        
      </ReactFlow>

      {/* Layer Legend */}
      <div className="absolute top-4 right-4 bg-card border rounded-lg p-3 shadow-lg z-20">
        <h3 className="text-sm font-semibold mb-2">Data Layers</h3>
        <div className="space-y-1">
          <LayerIndicator color="var(--chart-4)" label="Reporting" />
          <LayerIndicator color="var(--chart-3)" label="Target" />
          <LayerIndicator color="var(--chart-2)" label="Inter" />
          <LayerIndicator color="var(--chart-1)" label="Raw" />
          <LayerIndicator color="var(--chart-5)" label="Dashboards" />
        </div>
      </div>

      {/* Node context menu */}
      {nodeContextMenu && (
        <div
          className="fixed bg-card border rounded-md shadow-lg py-1 z-50"
          style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}
        >
          <button
            className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
            onClick={() => {
              if (onNodeClick) {
                onNodeClick(nodeContextMenu.node);
              }
              setNodeContextMenu(null);
            }}
          >
            View details
          </button>
          {onFilterToLineage && (
            <button
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onFilterToLineage(nodeContextMenu.node);
                setNodeContextMenu(null);
              }}
            >
              Filter to lineage
            </button>
          )}
          {onNodeDelete && (
            <>
              <div className="border-t my-1" />
              {onNodeAddUpstream && (
                <button
                  className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    onNodeAddUpstream(nodeContextMenu.node);
                    setNodeContextMenu(null);
                  }}
                >
                  Add upstream table
                </button>
              )}
              {onNodeAddDownstream && (
                <button
                  className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    onNodeAddDownstream(nodeContextMenu.node);
                    setNodeContextMenu(null);
                  }}
                >
                  Add downstream table
                </button>
              )}
              {onDashboardAdd && nodeContextMenu.node.nodeType === 'table' && (
                <button
                  className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    onDashboardAdd(nodeContextMenu.node);
                    setNodeContextMenu(null);
                  }}
                >
                  Add connected dashboard
                </button>
              )}
              <button
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                onClick={() => {
                  onNodeDelete(nodeContextMenu.node);
                  setNodeContextMenu(null);
                }}
              >
                {nodeContextMenu.node.nodeType === 'dashboard' ? 'Delete dashboard' : 'Delete table'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Canvas context menu for creating new nodes */}
      {canvasContextMenu && (onCanvasCreateTable || onCanvasCreateDashboard) && (
        <div
          className="fixed bg-card border rounded-md shadow-lg py-1 z-50"
          style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
        >
          {onCanvasCreateTable && (
            <button
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onCanvasCreateTable(canvasContextMenu.flowX, canvasContextMenu.flowY);
                setCanvasContextMenu(null);
              }}
            >
              <Database className="w-4 h-4" />
              Create table
            </button>
          )}
          {onCanvasCreateDashboard && (
            <button
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onCanvasCreateDashboard(canvasContextMenu.flowX, canvasContextMenu.flowY);
                setCanvasContextMenu(null);
              }}
            >
              <BarChart3 className="w-4 h-4" />
              Create dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Helper component for layer legend
const LayerIndicator: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2 text-xs">
    <div 
      className="w-3 h-3 rounded border"
      style={{ backgroundColor: color }}
    />
    <span className="text-muted-foreground">{label}</span>
  </div>
);

export default DAGLineageGraph;