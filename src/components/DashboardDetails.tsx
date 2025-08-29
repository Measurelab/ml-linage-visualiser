import React, { useState } from 'react';
import { X, ExternalLink, Users, Building, Eye, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getDirectTablesByDashboard } from '../utils/graphBuilder';
import { ParsedData, Dashboard, Table } from '../types';

interface DashboardDetailsProps {
  dashboard: Dashboard | null;
  parsedData: ParsedData;
  isOpen: boolean;
  onClose: () => void;
  onTableSelect: (tableId: string) => void;
  onConnectTable?: (tableId: string, dashboardId: string) => void;
  onDisconnectTable?: (tableId: string, dashboardId: string) => void;
}

const DashboardDetails: React.FC<DashboardDetailsProps> = ({
  dashboard,
  parsedData,
  isOpen,
  onClose,
  onTableSelect,
  onConnectTable,
  onDisconnectTable
}) => {
  const [tablesExpanded, setTablesExpanded] = useState(false);
  
  if (!isOpen || !dashboard) return null;

  // Get all tables connected to this dashboard
  const connectedTableIds = getDirectTablesByDashboard(dashboard.id, parsedData);
  const connectedTables = Array.from(connectedTableIds)
    .map(id => parsedData.tables.get(id))
    .filter(table => table) as Table[];

  // Group tables by dataset and layer for better organization
  const tablesByDataset = connectedTables.reduce((acc, table) => {
    if (!acc[table.dataset]) {
      acc[table.dataset] = [];
    }
    acc[table.dataset].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  const getLayerBadgeVariant = (layer: string) => {
    switch (layer) {
      case 'Raw': return 'default';
      case 'Inter': return 'secondary'; 
      case 'Target': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-card border-l shadow-lg transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '420px' }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{dashboard.name}</h2>
            <p className="text-sm text-muted-foreground">Dashboard details</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Dashboard Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Dashboard information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{dashboard.name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID</p>
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                  {dashboard.id}
                </p>
              </div>

              {dashboard.owner && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Owner
                  </p>
                  <p className="text-sm">{dashboard.owner}</p>
                </div>
              )}

              {dashboard.businessArea && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Business area
                  </p>
                  <p className="text-sm">{dashboard.businessArea}</p>
                </div>
              )}

              {dashboard.link && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Link</p>
                  <a 
                    href={dashboard.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Tables */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <button 
                    className="flex items-center gap-2 text-base font-semibold hover:text-primary transition-colors"
                    onClick={() => setTablesExpanded(!tablesExpanded)}
                  >
                    {tablesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Connected tables ({connectedTables.length})
                  </button>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tables that feed data to this dashboard
                  </p>
                </div>
                {onConnectTable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                      {Array.from(parsedData.tables.values())
                        .filter(t => !connectedTableIds.has(t.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(t => (
                          <DropdownMenuItem 
                            key={`table-${t.id}`}
                            onClick={() => {
                              try {
                                console.log('DashboardDetails: Connect table', t.id, 'to dashboard:', dashboard.id);
                                onConnectTable(t.id, dashboard.id);
                              } catch (error) {
                                console.error('Error connecting table to dashboard:', error);
                              }
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{t.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{t.dataset}</p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      }
                      {Array.from(parsedData.tables.values())
                        .filter(t => !connectedTableIds.has(t.id))
                        .length === 0 && (
                        <DropdownMenuItem disabled>
                          <p className="text-sm text-muted-foreground">No available tables</p>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {tablesExpanded && (
                <>
                  {connectedTables.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No tables connected to this dashboard
                    </p>
                  ) : (
                    <div className="space-y-4">
                  {Object.entries(tablesByDataset).map(([dataset, tables]) => (
                    <div key={dataset} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                        {dataset}
                      </h4>
                      <div className="space-y-2">
                        {tables.map((table) => (
                          <div
                            key={table.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => onTableSelect(table.id)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm truncate">
                                  {table.name}
                                </p>
                                <Badge variant={getLayerBadgeVariant(table.layer)} className="text-xs">
                                  {table.layer}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{table.tableType}</span>
                                {table.isScheduledQuery && (
                                  <Badge variant="outline" className="text-xs">
                                    Scheduled
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              {onDisconnectTable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDisconnectTable(table.id, dashboard.id);
                                  }}
                                  title="Remove table from dashboard"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </>
            )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Total tables</p>
                  <p className="text-lg font-semibold">{connectedTables.length}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Datasets</p>
                  <p className="text-lg font-semibold">{Object.keys(tablesByDataset).length}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Raw tables</p>
                  <p className="text-lg font-semibold">
                    {connectedTables.filter(t => t.layer === 'Raw').length}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Target tables</p>
                  <p className="text-lg font-semibold">
                    {connectedTables.filter(t => t.layer === 'Target').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardDetails;