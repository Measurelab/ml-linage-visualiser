import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types';
import { getLayerColor } from '../utils/graphBuilder';

interface LineageGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onNodeDelete?: (node: GraphNode) => void;
  onNodeAddUpstream?: (node: GraphNode) => void;
  onNodeAddDownstream?: (node: GraphNode) => void;
  highlightedNodes?: Set<string>;
  focusedNodeId?: string;
  width?: number;
  height?: number;
  connectionMode?: boolean;
  onConnectionCreate?: (source: GraphNode, target: GraphNode) => void;
}

const LineageGraph: React.FC<LineageGraphProps> = ({
  data,
  onNodeClick,
  onNodeDelete,
  onNodeAddUpstream,
  onNodeAddDownstream,
  highlightedNodes = new Set(),
  focusedNodeId,
  width = window.innerWidth,
  height = window.innerHeight - 200,
  connectionMode = false,
  onConnectionCreate
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectionSource, setConnectionSource] = useState<GraphNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Function to calculate node size based on connection count
  const getNodeRadius = (node: GraphNode): number => {
    const baseRadius = 8;
    const maxRadius = 20;
    const minRadius = 6;
    const connectionCount = node.connectionCount || 0;
    
    // Find the maximum connection count in the dataset for scaling
    const maxConnections = Math.max(...data.nodes.map(n => n.connectionCount || 0));
    
    let radius;
    if (maxConnections === 0) {
      radius = baseRadius;
    } else {
      // Linear scaling based on connection count
      const scale = (connectionCount / maxConnections);
      radius = minRadius + (scale * (maxRadius - minRadius));
    }
    
    // Add bonus for scheduled queries
    if (node.isScheduledQuery) {
      radius += 2;
    }
    
    return Math.max(minRadius, Math.min(maxRadius, radius));
  };

  // Function to center the view on a specific node
  const centerOnNode = (nodeId: string) => {
    if (!svgRef.current || !zoomRef.current || !gRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const node = data.nodes.find(n => n.id === nodeId);
    
    if (!node || !node.x || !node.y) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;
    
    const scale = 1.2; // Slight zoom in when focusing
    const x = centerX - node.x * scale;
    const y = centerY - node.y * scale;
    
    svg.transition()
      .duration(750)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(x, y).scale(scale)
      );
  };

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');
    gRef.current = g; // Store reference

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    zoomRef.current = zoom; // Store reference
    svg.call(zoom);

    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrowhead)');

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999');

    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => getLayerColor(d.layer))
      .attr('stroke', d => {
        if (selectedNode === d.id) return '#1f2937';
        if (highlightedNodes.has(d.id)) return '#ef4444';
        return '#fff';
      })
      .attr('stroke-width', d => {
        if (selectedNode === d.id) return 3;
        if (highlightedNodes.has(d.id)) return 2;
        return 1.5;
      })
      .attr('opacity', d => {
        if (highlightedNodes.size === 0) return 1;
        return highlightedNodes.has(d.id) ? 1 : 0.3;
      });

    if (data.nodes.some(d => d.isScheduledQuery)) {
      node.filter(d => d.isScheduledQuery)
        .append('circle')
        .attr('r', d => getNodeRadius(d) + 3)
        .attr('fill', 'none')
        .attr('stroke', d => getLayerColor(d.layer))
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.5);
    }

    node.append('text')
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
      .attr('x', 0)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#1f2937')
      .attr('pointer-events', 'none');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('border', '1px solid #d1d5db')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

    node.on('mouseover', function(_event, d) {
      tooltip.style('visibility', 'visible')
        .html(`
          <strong>${d.name}</strong><br/>
          ID: ${d.id}<br/>
          Dataset: ${d.dataset}<br/>
          Layer: ${d.layer}<br/>
          Type: ${d.tableType}<br/>
          ${d.isScheduledQuery ? '<em>Scheduled query</em><br/>' : ''}
          ${d.description ? `Description: ${d.description}` : ''}
        `);
    })
    .on('mousemove', function(event) {
      tooltip.style('top', (event.pageY - 10) + 'px')
        .style('left', (event.pageX + 10) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('visibility', 'hidden');
    })
    .on('click', function(event, d) {
      event.stopPropagation();
      
      if (connectionMode) {
        if (!connectionSource) {
          setConnectionSource(d);
        } else if (connectionSource.id !== d.id) {
          if (onConnectionCreate) {
            onConnectionCreate(connectionSource, d);
          }
          setConnectionSource(null);
        }
      } else {
        setSelectedNode(d.id);
        if (onNodeClick) {
          onNodeClick(d);
        }
      }
    })
    .on('contextmenu', function(event, d) {
      event.preventDefault();
      event.stopPropagation();
      
      // Get the SVG container's bounding rect for proper positioning
      const svgRect = svgRef.current!.getBoundingClientRect();
      const x = event.clientX - svgRect.left;
      const y = event.clientY - svgRect.top;
      
      setContextMenu({ x, y, node: d });
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = undefined;
      d.fy = undefined;
    }

    // Click outside to close context menu
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    svg.on('click', handleClickOutside);

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, highlightedNodes, selectedNode, onNodeClick, onNodeDelete, width, height, connectionMode, connectionSource, onConnectionCreate]);

  // Handle focusing on a specific node when focusedNodeId changes
  useEffect(() => {
    if (focusedNodeId) {
      // Small delay to ensure the simulation has positioned the nodes
      const timer = setTimeout(() => {
        centerOnNode(focusedNodeId);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [focusedNodeId]);

  // Clear connection source when connection mode is disabled
  useEffect(() => {
    if (!connectionMode) {
      setConnectionSource(null);
    }
  }, [connectionMode]);

  // Handle context menu click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={`w-full h-full ${connectionMode ? 'cursor-crosshair' : ''}`}
      />
      
      {/* Connection mode indicator */}
      {connectionMode && connectionSource && (
        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg">
          <p className="text-sm font-medium">
            Select target table for: <strong>{connectionSource.name}</strong>
          </p>
        </div>
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <div
          className="absolute bg-card border rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
            onClick={() => {
              if (onNodeClick) {
                onNodeClick(contextMenu.node);
              }
              setContextMenu(null);
            }}
          >
            View details
          </button>
          {onNodeDelete && (
            <>
              <div className="border-t my-1" />
              <button
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                onClick={() => {
                  if (onNodeAddUpstream) {
                    onNodeAddUpstream(contextMenu.node);
                  }
                  setContextMenu(null);
                }}
              >
                Add upstream table
              </button>
              <button
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                onClick={() => {
                  if (onNodeAddDownstream) {
                    onNodeAddDownstream(contextMenu.node);
                  }
                  setContextMenu(null);
                }}
              >
                Add downstream table
              </button>
              <div className="border-t my-1" />
              <button
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                onClick={() => {
                  onNodeDelete(contextMenu.node);
                  setContextMenu(null);
                }}
              >
                Delete table
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LineageGraph;