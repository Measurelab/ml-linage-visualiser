import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, BarChart3 } from 'lucide-react';
import { GraphNode } from '../types';

interface CustomNodeData {
  originalNode: GraphNode;
  label: string;
  layer?: string;
  dataset?: string;
  tableType?: string;
  isScheduledQuery?: boolean;
  connectionCount?: number;
}

export const TableNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const { label, layer, dataset, isScheduledQuery, connectionCount } = data;
  
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <div
        className={`
          px-3 py-2 rounded-lg border-2 shadow-md transition-all duration-200 text-center w-full h-full flex flex-col justify-center
          ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
          ${isScheduledQuery ? 'border-dashed' : 'border-solid'}
        `}
        style={{
          backgroundColor: 'var(--background)',
          borderColor: getBorderColor(layer),
          color: 'var(--foreground)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Database className="w-4 h-4" style={{ color: getBorderColor(layer) }} />
          {connectionCount && connectionCount > 0 && (
            <span 
              className="text-xs px-1 py-0.5 rounded-full"
              style={{
                backgroundColor: getBorderColor(layer),
                color: 'white',
              }}
            >
              {connectionCount}
            </span>
          )}
        </div>
        
        <div className="text-xs font-semibold truncate max-w-[120px]" title={label}>
          {label}
        </div>
        
        {layer && (
          <div className="text-xs opacity-75 mt-1">
            {layer}
          </div>
        )}
        
        {dataset && (
          <div className="text-xs opacity-60 truncate max-w-[120px]" title={dataset}>
            {dataset}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

export const DashboardNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const { label, connectionCount } = data;
  
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <div
        className={`
          w-full h-full rounded-full border-4 border-white shadow-lg transition-all duration-200
          flex flex-col items-center justify-center relative min-w-[120px] min-h-[120px]
          ${selected ? 'ring-4 ring-primary ring-offset-4' : ''}
        `}
        style={{
          backgroundColor: 'var(--chart-5)', // Magenta for dashboards
        }}
      >
        {/* Bar chart icon */}
        <BarChart3 className="w-8 h-8 text-white mb-1" />
        
        {/* Connection count badge */}
        {connectionCount && connectionCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {connectionCount}
          </div>
        )}
        
        {/* Dashboard label */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-xs font-semibold text-foreground truncate max-w-[120px]" title={label}>
            {label}
          </div>
          <div className="text-xs text-muted-foreground">Dashboard</div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

/**
 * Get border color based on layer
 */
const getBorderColor = (layer?: string): string => {
  if (typeof window === 'undefined') return '#6b7280';
  
  const style = getComputedStyle(document.documentElement);
  
  switch (layer) {
    case 'Raw':
      return style.getPropertyValue('--chart-1').trim() || '#6b7280';
    case 'Inter':
      return style.getPropertyValue('--chart-2').trim() || '#6b7280';
    case 'Target':
      return style.getPropertyValue('--chart-3').trim() || '#6b7280';
    case 'Reporting':
      return style.getPropertyValue('--chart-4').trim() || '#6b7280';
    default:
      return style.getPropertyValue('--muted-foreground').trim() || '#6b7280';
  }
};

// Node type mapping for React Flow
export const nodeTypes = {
  tableNode: TableNode,
  dashboardNode: DashboardNode,
};