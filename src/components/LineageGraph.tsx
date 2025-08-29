import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types';
import { getNodeColor } from '../utils/graphBuilder';
import { Button } from '@/components/ui/button';

// Helper function to get CSS variable color for D3
const getCSSColor = (variableName: string, fallback: string = '#999'): string => {
  if (typeof window !== 'undefined') {
    const computedStyle = getComputedStyle(document.documentElement);
    const color = computedStyle.getPropertyValue(variableName).trim();
    return color || fallback;
  }
  return fallback;
};

interface LineageGraphProps {
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

const LineageGraph: React.FC<LineageGraphProps> = ({
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
  height = window.innerHeight - 200
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState<{ x: number; y: number; svgX: number; svgY: number } | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [isLayoutFrozen, setIsLayoutFrozen] = useState(false);
  const positionsRef = useRef<Map<string, {x: number, y: number}>>(new Map());

  // Function to calculate node size based on connection count
  const getNodeRadius = (node: GraphNode): number => {
    // Dashboard nodes get the largest size to make them most prominent
    if (node.nodeType === 'dashboard') {
      return 25; // Larger than any table node (max table is 20)
    }
    
    // For table nodes, use connection-based sizing
    const baseRadius = 8;
    const maxRadius = 20;
    const minRadius = 6;
    const connectionCount = node.connectionCount || 0;
    
    // Find the maximum connection count among table nodes for scaling
    const tableNodes = data.nodes.filter(n => n.nodeType === 'table');
    const maxConnections = Math.max(...tableNodes.map(n => n.connectionCount || 0));
    
    let radius;
    if (maxConnections === 0) {
      radius = baseRadius;
    } else {
      // Linear scaling based on connection count
      const scale = (connectionCount / maxConnections);
      radius = minRadius + (scale * (maxRadius - minRadius));
    }
    
    // Add bonus for scheduled queries (table nodes only)
    if ((node as any).isScheduledQuery) {
      radius += 2;
    }
    
    return Math.max(minRadius, Math.min(maxRadius, radius));
  };

  // Function to center the view on a specific node or all visible nodes
  const centerOnNode = useCallback((nodeId?: string) => {
    if (!svgRef.current || !zoomRef.current || !gRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const svgRect = svgRef.current.getBoundingClientRect();
    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;
    
    if (nodeId) {
      // Center on specific node
      const node = data.nodes.find(n => n.id === nodeId);
      if (!node || !node.x || !node.y) return;
      
      const scale = 1.2; // Slight zoom in when focusing
      const x = centerX - node.x * scale;
      const y = centerY - node.y * scale;
      
      svg.transition()
        .duration(750)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(x, y).scale(scale)
        );
    } else {
      // Fit all visible nodes in view
      const visibleNodes = data.nodes.filter(n => n.x !== undefined && n.y !== undefined);
      if (visibleNodes.length === 0) return;
      
      const xExtent = d3.extent(visibleNodes, d => d.x!) as [number, number];
      const yExtent = d3.extent(visibleNodes, d => d.y!) as [number, number];
      
      const width = xExtent[1] - xExtent[0];
      const height = yExtent[1] - yExtent[0];
      const midX = (xExtent[0] + xExtent[1]) / 2;
      const midY = (yExtent[0] + yExtent[1]) / 2;
      
      // Calculate scale to fit all nodes with padding
      const scale = Math.min(
        svgRect.width * 0.8 / width,
        svgRect.height * 0.8 / height,
        1.2 // Max zoom
      );
      
      const x = centerX - midX * scale;
      const y = centerY - midY * scale;
      
      svg.transition()
        .duration(750)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(x, y).scale(scale)
        );
    }
  }, [data.nodes]);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    // Store current zoom transform before clearing
    let currentTransform = d3.zoomIdentity;
    if (gRef.current) {
      const transform = d3.zoomTransform(gRef.current.node()!);
      if (transform) {
        currentTransform = transform;
      }
    }

    // Store positions before clearing if layout was frozen
    if (isLayoutFrozen) {
      data.nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          positionsRef.current.set(node.id, { x: node.x, y: node.y });
        }
      });
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Restore positions if we had them stored, and position new nodes near their connections
    data.nodes.forEach(node => {
      const stored = positionsRef.current.get(node.id);
      if (stored && isLayoutFrozen) {
        node.x = stored.x;
        node.y = stored.y;
        node.fx = stored.x; // Fix in place
        node.fy = stored.y;
      } else if (isLayoutFrozen && !stored) {
        // This is a new node - try to position it near a connected node
        const connectedLink = data.links.find(link => 
          (typeof link.source === 'string' ? link.source : link.source.id) === node.id ||
          (typeof link.target === 'string' ? link.target : link.target.id) === node.id
        );
        
        if (connectedLink) {
          // Find the connected node that already has a position
          const connectedNodeId = (typeof connectedLink.source === 'string' ? connectedLink.source : connectedLink.source.id) === node.id
            ? (typeof connectedLink.target === 'string' ? connectedLink.target : connectedLink.target.id)
            : (typeof connectedLink.source === 'string' ? connectedLink.source : connectedLink.source.id);
          
          const connectedPosition = positionsRef.current.get(connectedNodeId);
          if (connectedPosition) {
            // Position new node near the connected node with some random offset
            const angle = Math.random() * 2 * Math.PI;
            const distance = 80 + Math.random() * 40; // 80-120px away
            node.x = connectedPosition.x + Math.cos(angle) * distance;
            node.y = connectedPosition.y + Math.sin(angle) * distance;
            // Don't fix new nodes immediately - let them settle briefly
          }
        }
      }
    });

    const g = svg.append('g');
    gRef.current = g; // Store reference

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    zoomRef.current = zoom; // Store reference
    svg.call(zoom);

    // Restore the previous zoom transform (only if it's not the default identity transform)
    if (currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0) {
      svg.call(zoom.transform, currentTransform);
    }

    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(isLayoutFrozen ? -50 : -300)) // Weaker forces when frozen
      .force('center', isLayoutFrozen ? null : d3.forceCenter(width / 2, height / 2)) // No centering when frozen
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // If frozen, use minimal simulation energy
    if (isLayoutFrozen) {
      simulation.alpha(0.2).alphaDecay(0.05); // Slightly more energy for new nodes to settle
      
      // After a short time, fix any new nodes that have settled
      setTimeout(() => {
        data.nodes.forEach(node => {
          if (!positionsRef.current.has(node.id) && node.x !== undefined && node.y !== undefined) {
            // This is a new node that has settled - fix it in place
            positionsRef.current.set(node.id, { x: node.x, y: node.y });
            node.fx = node.x;
            node.fy = node.y;
          }
        });
        if (simulationRef.current) {
          simulationRef.current.alpha(0.01); // Reduce to minimal energy
        }
      }, 1500); // Give new nodes 1.5 seconds to settle
    }

    // Auto-freeze after initial layout (4 seconds for new layouts)
    if (!isLayoutFrozen) {
      setTimeout(() => {
        if (simulationRef.current) {
          // Save all current positions
          data.nodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
              positionsRef.current.set(node.id, { x: node.x, y: node.y });
              node.fx = node.x; // Fix nodes in place
              node.fy = node.y;
            }
          });
          
          simulationRef.current.stop();
          setIsLayoutFrozen(true);
        }
      }, 4000);
    }

    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', getCSSColor('--muted-foreground', '#999'))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)
      .attr('marker-end', (d: any) => {
        // Only add arrows for table-to-table connections (not dashboard connections)
        const target = typeof d.target === 'object' ? d.target : data.nodes.find(n => n.id === d.target);
        if (target && target.nodeType === 'table') {
          return 'url(#arrowhead)';
        }
        return null;
      });

    // Clear any existing defs to avoid conflicts
    svg.select('defs').remove();
    
    const defs = svg.append('defs');
    
    // Create arrow marker - position it right at the end of the line
    // The line endpoint calculation will handle the offset
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 9) // Position close to line end
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', getCSSColor('--muted-foreground', '#666'))
      .attr('stroke', 'none');

    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)) as d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>;

    // Add different shapes for different node types
    node.each(function(d) {
      const nodeGroup = d3.select(this);
      const isFocused = focusedNodeId === d.id;
      const isSelected = selectedNode === d.id;
      const isHighlighted = highlightedNodes.has(d.id);
      
      // Determine stroke and opacity based on focus/selection state
      const getStroke = () => {
        if (isFocused) return getCSSColor('--primary', '#2563eb'); // Primary for focused node
        if (isSelected) return getCSSColor('--foreground', '#1f2937'); // Foreground for selected
        if (isHighlighted) return getCSSColor('--destructive', '#ef4444'); // Destructive for highlighted
        return getCSSColor('--background', '#fff'); // Background default
      };
      
      const getStrokeWidth = () => {
        if (isFocused) return 4; // Thickest for focused
        if (isSelected) return 3;
        if (isHighlighted) return 2;
        return 1.5;
      };
      
      const getOpacity = () => {
        // When a node is focused, show full opacity for focused node
        if (focusedNodeId) return isFocused ? 1 : 0.7;
        // Regular highlighting behavior
        if (highlightedNodes.size === 0) return 1;
        return isHighlighted ? 1 : 0.3;
      };
      
      if (d.nodeType === 'dashboard') {
        const radius = getNodeRadius(d);
        // Dashboard icon using chart/bar chart symbol
        nodeGroup.append('circle')
          .attr('r', radius)
          .attr('fill', getNodeColor(d))
          .attr('stroke', getStroke())
          .attr('stroke-width', getStrokeWidth())
          .attr('opacity', getOpacity());
          
        // Add chart bars icon inside the circle
        const iconScale = radius * 0.06; // Scale bars to node size
        nodeGroup.append('path')
          .attr('d', `M${-6 * iconScale},${4 * iconScale} h${3 * iconScale} v${-8 * iconScale} h${-3 * iconScale} z
                     M${-1 * iconScale},${4 * iconScale} h${3 * iconScale} v${-6 * iconScale} h${-3 * iconScale} z
                     M${4 * iconScale},${4 * iconScale} h${3 * iconScale} v${-10 * iconScale} h${-3 * iconScale} z`)
          .attr('fill', 'white')
          .attr('opacity', 0.9)
          .attr('pointer-events', 'none');
      } else {
        // Circle for tables
        nodeGroup.append('circle')
          .attr('r', getNodeRadius(d))
          .attr('fill', getNodeColor(d))
          .attr('stroke', getStroke())
          .attr('stroke-width', getStrokeWidth())
          .attr('opacity', getOpacity());
      }
      
      // Add a subtle glow effect for the focused node
      if (isFocused) {
        const glowElement = nodeGroup.insert('circle', ':first-child');
        glowElement
          .attr('r', getNodeRadius(d) + 4)
          .attr('fill', 'none')
          .attr('stroke', getCSSColor('--primary', '#2563eb'))
          .attr('stroke-width', 2)
          .attr('opacity', 0.3);
      }
    });

    // Add scheduled query indicator for table nodes
    if (data.nodes.some(d => d.nodeType === 'table' && (d as any).isScheduledQuery)) {
      node.filter(d => d.nodeType === 'table' && (d as any).isScheduledQuery)
        .append('circle')
        .attr('r', d => getNodeRadius(d) + 3)
        .attr('fill', 'none')
        .attr('stroke', d => getNodeColor(d))
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
      .attr('fill', getCSSColor('--foreground', '#1f2937'))
      .attr('pointer-events', 'none');

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', getCSSColor('--popover', 'white'))
      .style('border', `1px solid ${getCSSColor('--border', '#d1d5db')}`)
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
      .style('color', getCSSColor('--popover-foreground', '#000'));

    node.on('mouseover', function(_event, d) {
      const tooltipContent = d.nodeType === 'dashboard' 
        ? `
          <strong>${d.name}</strong><br/>
          <em>Dashboard</em><br/>
          ID: ${d.id}<br/>
          ${(d as any).owner ? `Owner: ${(d as any).owner}<br/>` : ''}
          ${(d as any).businessArea ? `Business Area: ${(d as any).businessArea}<br/>` : ''}
          ${(d as any).link ? `<a href="${(d as any).link}" target="_blank">View Dashboard</a><br/>` : ''}
        `
        : `
          <strong>${d.name}</strong><br/>
          ID: ${d.id}<br/>
          Dataset: ${(d as any).dataset}<br/>
          Layer: ${(d as any).layer}<br/>
          Type: ${(d as any).tableType}<br/>
          ${(d as any).isScheduledQuery ? '<em>Scheduled query</em><br/>' : ''}
          ${(d as any).description ? `Description: ${(d as any).description}` : ''}
        `;
      
      tooltip.style('visibility', 'visible').html(tooltipContent);
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
      setSelectedNode(d.id);
      if (onNodeClick) {
        onNodeClick(d);
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
        .attr('x2', d => {
          const source = d.source as GraphNode;
          const target = d.target as GraphNode;
          
          // Calculate the angle from source to target
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance === 0) return target.x!;
          
          // Get target node radius
          const targetRadius = getNodeRadius(target);
          
          // Stop the line before it reaches the node center
          // Add extra offset for the arrow to be visible
          const offset = targetRadius + 5; // 5px extra for arrow visibility
          const ratio = (distance - offset) / distance;
          
          return source.x! + dx * ratio;
        })
        .attr('y2', d => {
          const source = d.source as GraphNode;
          const target = d.target as GraphNode;
          
          // Calculate the angle from source to target
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance === 0) return target.y!;
          
          // Get target node radius
          const targetRadius = getNodeRadius(target);
          
          // Stop the line before it reaches the node center
          // Add extra offset for the arrow to be visible
          const offset = targetRadius + 5; // 5px extra for arrow visibility
          const ratio = (distance - offset) / distance;
          
          return source.y! + dy * ratio;
        });

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
      setCanvasContextMenu(null);
    };
    svg.on('click', handleClickOutside);

    // Handle SVG canvas right-click for creating new nodes
    svg.on('contextmenu', function(event) {
      // Only handle direct right-clicks on the SVG (not on nodes)
      if (event.target === event.currentTarget || event.target.tagName === 'svg') {
        event.preventDefault();
        event.stopPropagation();
        
        if (onCanvasCreateTable || onCanvasCreateDashboard) {
          // Get click coordinates relative to SVG
          const svgRect = svgRef.current?.getBoundingClientRect();
          if (svgRect) {
            const svgX = event.clientX - svgRect.left;
            const svgY = event.clientY - svgRect.top;
            
            // Convert to graph coordinates
            const transform = d3.zoomTransform(svgRef.current!);
            const graphX = (svgX - transform.x) / transform.k;
            const graphY = (svgY - transform.y) / transform.k;
            
            // Try viewport coordinates directly
            const menuX = event.clientX;
            const menuY = event.clientY;
            
            
            // Show canvas context menu at the correct position
            setCanvasContextMenu({
              x: menuX,
              y: menuY,
              svgX: graphX,
              svgY: graphY
            });
          }
        }
      }
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, highlightedNodes, selectedNode, focusedNodeId, onNodeClick, onNodeDelete, onNodeAddUpstream, onNodeAddDownstream, width, height]);

  // Handle focusing when filtering changes
  useEffect(() => {
    if (focusedNodeId || data.nodes.length < 50) {
      // Small delay to ensure the simulation has positioned the nodes
      const timer = setTimeout(() => {
        if (focusedNodeId) {
          // When filtering to a specific node's lineage, center on that node
          centerOnNode(focusedNodeId);
        } else if (data.nodes.length < 50) {
          // When filtered to a small set of nodes, fit them all in view
          centerOnNode(); // No nodeId = fit all visible nodes
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [focusedNodeId, data.nodes.length, centerOnNode]);


  // Handle context menu click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close context menus if clicking on UI elements
      const target = event.target as Element;
      if (target && (
        // Dropdown menu elements
        target.closest('[data-radix-dropdown-menu-content]') ||
        target.closest('[data-radix-dropdown-menu-trigger]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[role="menu"]') ||
        // Sheet/Dialog elements
        target.closest('[data-radix-dialog-content]') ||
        target.closest('[data-radix-sheet-content]') ||
        target.closest('[data-radix-dialog-overlay]') ||
        target.closest('[data-radix-sheet-overlay]') ||
        target.closest('.sheet-content') ||
        target.closest('[role="dialog"]') ||
        // Any UI component that might contain dropdowns
        target.closest('.lucide') || // Icon buttons
        target.closest('button') || // All buttons
        target.closest('[data-state="open"]') // Any open dropdown/popover
      )) {
        return;
      }

      if (contextMenu) {
        setContextMenu(null);
      }
      if (canvasContextMenu) {
        setCanvasContextMenu(null);
      }
    };

    if (contextMenu || canvasContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, canvasContextMenu]);

  // Function to reorganize layout (unfreeze)
  const reorganizeLayout = () => {
    if (!simulationRef.current) return;
    
    // Clear stored positions
    positionsRef.current.clear();
    setIsLayoutFrozen(false);
    
    // Release all nodes and restart simulation
    data.nodes.forEach(node => {
      node.fx = undefined;
      node.fy = undefined;
    });
    
    // Restart simulation with full energy
    simulationRef.current
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .alpha(0.7)
      .restart();
    
    // Auto-freeze again after 4 seconds
    setTimeout(() => {
      if (simulationRef.current) {
        data.nodes.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            positionsRef.current.set(node.id, { x: node.x, y: node.y });
            node.fx = node.x;
            node.fy = node.y;
          }
        });
        
        simulationRef.current.stop();
        setIsLayoutFrozen(true);
      }
    }, 4000);
  };

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
      
      {/* Layout control */}
      <div className="absolute top-16 left-4 z-20">
        <div className="bg-card border rounded-lg p-1 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={reorganizeLayout}
            title="Reorganize the layout of all nodes"
            className="text-xs h-8 px-3"
            disabled={!isLayoutFrozen}
          >
            {isLayoutFrozen ? 'Reorganize layout' : 'Organizing...'}
          </Button>
        </div>
      </div>
      
      {/* Layout status indicator */}
      {!isLayoutFrozen && (
        <div className="absolute top-16 left-4 z-20">
          <div className="bg-card border rounded-lg p-1 shadow-sm">
            <div className="text-xs h-8 px-3 flex items-center text-muted-foreground font-semibold">
              Layout organizing...
            </div>
          </div>
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
          {onFilterToLineage && (
            <button
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onFilterToLineage(contextMenu.node);
                setContextMenu(null);
              }}
            >
              Filter to lineage
            </button>
          )}
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
              {onDashboardAdd && contextMenu.node.nodeType === 'table' && (
                <button
                  className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    onDashboardAdd(contextMenu.node);
                    setContextMenu(null);
                  }}
                >
                  Add connected dashboard
                </button>
              )}
              <div className="border-t my-1" />
              <button
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                onClick={() => {
                  onNodeDelete(contextMenu.node);
                  setContextMenu(null);
                }}
              >
                {contextMenu.node.nodeType === 'dashboard' ? 'Delete dashboard' : 'Delete table'}
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Canvas context menu */}
      {canvasContextMenu && (onCanvasCreateTable || onCanvasCreateDashboard) && (
        <div
          className="fixed bg-card border rounded-md shadow-lg py-1 z-50"
          style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
        >
          {onCanvasCreateTable && (
            <button
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onCanvasCreateTable(canvasContextMenu.svgX, canvasContextMenu.svgY);
                setCanvasContextMenu(null);
              }}
            >
              Create new table here
            </button>
          )}
          {onCanvasCreateDashboard && (
            <button
              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              onClick={() => {
                onCanvasCreateDashboard(canvasContextMenu.svgX, canvasContextMenu.svgY);
                setCanvasContextMenu(null);
              }}
            >
              Create new dashboard here
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LineageGraph;