import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphLink, Table } from '../types';
import { getLayerColor } from '../utils/graphBuilder';

interface LineageGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  highlightedNodes?: Set<string>;
  width?: number;
  height?: number;
}

const LineageGraph: React.FC<LineageGraphProps> = ({
  data,
  onNodeClick,
  highlightedNodes = new Set(),
  width = window.innerWidth,
  height = window.innerHeight - 200
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

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
      .attr('r', d => d.isScheduledQuery ? 12 : 10)
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
        .attr('r', 15)
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

    node.on('mouseover', function(event, d) {
      tooltip.style('visibility', 'visible')
        .html(`
          <strong>${d.name}</strong><br/>
          ID: ${d.id}<br/>
          Dataset: ${d.dataset}<br/>
          Layer: ${d.layer}<br/>
          Type: ${d.tableType}<br/>
          ${d.isScheduledQuery ? '<em>Scheduled Query</em><br/>' : ''}
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
      setSelectedNode(d.id);
      if (onNodeClick) {
        onNodeClick(d);
      }
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
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, highlightedNodes, selectedNode, onNodeClick, width, height]);

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg shadow-inner">
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