import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ConnectionMode,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { GraphData, GraphNode } from '../types';
import { convertToDAGFormat, applyDAGLayout, DAGNode, DAGEdge } from '../utils/dagAdapter';
import { TableNode, DashboardNode } from './DAGCustomNode';
import { Database, BarChart3 } from 'lucide-react';

interface DAGLineageGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
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
  const [nodes, setNodes, onNodesChange] = useNodesState<DAGNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DAGEdge>([]);
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

    console.log('Converting and laying out DAG data...');
    
    try {
      // Convert GraphData to DAG format
      const dagData = convertToDAGFormat(data);
      console.log('Conversion successful, applying layout...');
      
      // Apply dagre layout immediately
      const layoutedData = applyDAGLayout(dagData.nodes, dagData.edges);
      console.log('Layout completed');
      
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

  // Apply highlighting to nodes
  useEffect(() => {
    if (highlightedNodes.size > 0 || focusedNodeId) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity: highlightedNodes.size > 0 
              ? (highlightedNodes.has(node.id) ? 1 : 0.3)
              : 1,
            filter: focusedNodeId === node.id ? 'drop-shadow(0 0 10px var(--primary))' : 'none',
          },
        }))
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
    }
  }, [highlightedNodes, focusedNodeId, setNodes]);

  // Handle node clicks - single click for selection or dashboard filtering
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
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
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
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
    
    // Create context menu actions
    const menuItems = [];
    
    if (onNodeDelete) {
      menuItems.push({
        label: 'Delete table',
        action: () => onNodeDelete(originalNode),
        className: 'text-destructive'
      });
    }
    
    if (onNodeAddUpstream) {
      menuItems.push({
        label: 'Add upstream table',
        action: () => onNodeAddUpstream(originalNode)
      });
    }
    
    if (onNodeAddDownstream) {
      menuItems.push({
        label: 'Add downstream table', 
        action: () => onNodeAddDownstream(originalNode)
      });
    }
    
    if (onDashboardAdd && originalNode.nodeType !== 'dashboard') {
      menuItems.push({
        label: 'Add to dashboard',
        action: () => onDashboardAdd(originalNode)
      });
    }
    
    // For now, just log the available actions
    console.log('Context menu for node:', originalNode.id, 'Available actions:', menuItems.map(item => item.label));
    
    // TODO: Implement actual context menu UI
    // This could be done with a portal/overlay or by updating state to show a menu
  }, [onNodeDelete, onNodeAddUpstream, onNodeAddDownstream, onDashboardAdd]);

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

  // Handle pane click to close context menu
  const handlePaneClick = useCallback(() => {
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
      >
        <Background 
          color="var(--muted-foreground)" 
          gap={20}
          variant="dots" 
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