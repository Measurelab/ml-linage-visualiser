import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink } from '../types';
import { getLayerColor } from '../utils/graphBuilder';

interface LineageGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  highlightedNodes?: Set<string>;
  focusedNodeId?: string;
  width?: number;
  height?: number;
}

const LineageGraph: React.FC<LineageGraphProps> = ({
  data,
  onNodeClick,
  highlightedNodes = new Set(),
  focusedNodeId,
  width = window.innerWidth,
  height = window.innerHeight - 200
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Memoized function to calculate node size based on connection count
  const getNodeRadius = React.useMemo(() => {
    const maxConnections = Math.max(...data.nodes.map(n => n.connectionCount || 0));
    
    return (node: GraphNode): number => {
      const baseRadius = 8;
      const maxRadius = data.nodes.length > 500 ? 15 : 20; // Smaller nodes for large datasets
      const minRadius = data.nodes.length > 500 ? 4 : 6;
      const connectionCount = node.connectionCount || 0;
      
      let radius;
      if (maxConnections === 0) {
        radius = baseRadius;
      } else {
        // Linear scaling based on connection count
        const scale = (connectionCount / maxConnections);
        radius = minRadius + (scale * (maxRadius - minRadius));
      }
      
      // Add bonus for scheduled queries (smaller for large datasets)
      if (node.isScheduledQuery) {
        radius += data.nodes.length > 500 ? 1 : 2;
      }
      
      return Math.max(minRadius, Math.min(maxRadius, radius));
    };
  }, [data.nodes]);

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

    const startTime = performance.now();
    console.log(`🎨 Rendering graph with ${data.nodes.length} nodes and ${data.links.length} links...`);

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

    // Optimize simulation parameters based on dataset size
    const nodeCount = data.nodes.length;
    
    // Scale forces based on dataset size
    const chargeStrength = nodeCount > 500 ? -150 : nodeCount > 200 ? -250 : -300;
    const linkDistance = nodeCount > 500 ? 80 : nodeCount > 200 ? 90 : 100;
    const collisionRadius = nodeCount > 500 ? 25 : 30;
    
    console.log(`📐 Using optimized forces for ${nodeCount} nodes:`, {
      chargeStrength,
      linkDistance,
      collisionRadius
    });

    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(nodeCount > 500 ? 0.5 : 1)) // Reduce link strength for large datasets
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(collisionRadius))
      .alphaDecay(nodeCount > 500 ? 0.05 : 0.028); // Faster convergence for large datasets

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
    .on('click', function(_event, d) {
      setSelectedNode(d.id);
      if (onNodeClick) {
        onNodeClick(d);
      }
    });

    // Optimize tick updates for large datasets
    let tickCount = 0;
    const maxTicks = nodeCount > 500 ? 100 : nodeCount > 200 ? 200 : 300;
    
    simulation.on('tick', () => {
      tickCount++;
      
      // For large datasets, skip some tick updates to improve performance
      if (nodeCount > 500 && tickCount % 2 !== 0) return;
      
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
      
      // Stop simulation early for large datasets to prevent excessive computation
      if (tickCount > maxTicks) {
        simulation.stop();
        console.log(`⏹️ Simulation stopped early after ${tickCount} ticks for performance`);
      }
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

    // Add completion timing
    simulation.on('end', () => {
      const renderTime = performance.now() - startTime;
      console.log(`✅ Graph rendering completed in ${Math.round(renderTime)}ms`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, highlightedNodes, selectedNode, onNodeClick, width, height]);

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

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
};

export default LineageGraph;