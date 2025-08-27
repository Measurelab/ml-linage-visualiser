import React, { useState, useEffect } from 'react';
import { Table, ParsedData, Column, CreateColumnRequest } from '@/types';
import { getUpstreamTables, getDownstreamTables, getUpstreamTablesWithDistance, getDownstreamTablesWithDistance } from '@/utils/graphBuilder';
import { getTableColumns, createColumn, deleteColumn, createBulkColumns, areColumnsAvailable } from '@/services/columns';
import { updateTable } from '@/services/lineageData';
import { ExternalLink, Clock, Plus, Database, Upload, Edit, Check, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ColumnList from './ColumnList';
import AddColumnModal from './AddColumnModal';
import UploadSchemaModal from './UploadSchemaModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TableDetailsProps {
  table: Table | null;
  parsedData: ParsedData;
  isOpen: boolean;
  onClose: () => void;
  onTableSelect: (tableId: string) => void;
  onConnectUpstream?: (sourceTableId: string, targetTableId: string) => void;
  onConnectDownstream?: (sourceTableId: string, targetTableId: string) => void;
  onConnectDashboard?: (tableId: string, dashboardId: string) => void;
  onDisconnectUpstream?: (sourceTableId: string, targetTableId: string) => void;
  onDisconnectDownstream?: (sourceTableId: string, targetTableId: string) => void;
  onDisconnectDashboard?: (tableId: string, dashboardId: string) => void;
  onTableUpdate?: () => void;
  activeProjectId?: string;
}

const TableDetails: React.FC<TableDetailsProps> = ({
  table,
  parsedData,
  isOpen,
  onClose,
  onTableSelect,
  onConnectUpstream,
  onConnectDownstream,
  onConnectDashboard,
  onDisconnectUpstream,
  onDisconnectDownstream,
  onDisconnectDashboard,
  onTableUpdate,
  activeProjectId
}) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showUploadSchema, setShowUploadSchema] = useState(false);
  const [columnsError, setColumnsError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Table>>({});
  const [upstreamExpanded, setUpstreamExpanded] = useState(false);
  const [downstreamExpanded, setDownstreamExpanded] = useState(false);
  const [dashboardsExpanded, setDashboardsExpanded] = useState(false);

  // Load columns when table changes
  useEffect(() => {
    if (areColumnsAvailable() && table) {
      // Reset error state for new table
      setColumnsError(false);
      
      // Async wrapper to handle errors properly
      const loadColumnsWithErrorHandling = async () => {
        try {
          await loadColumns();
        } catch (error) {
          console.error('Error in useEffect loadColumns:', error);
          setColumns([]);
          setColumnsLoading(false);
          setColumnsError(true);
        }
      };
      
      loadColumnsWithErrorHandling();
    }
  }, [table?.id]);

  // Add error boundary for this component

  // Initialize edit form when table changes
  useEffect(() => {
    if (table) {
      setEditFormData({
        name: table.name,
        dataset: table.dataset,
        layer: table.layer,
        tableType: table.tableType,
        isScheduledQuery: table.isScheduledQuery,
        link: table.link,
        description: table.description
      });
    }
  }, [table]);

  if (!table) return null;

  // Helper function to get table by ID - defined first to avoid reference errors
  const getTableById = (id: string) => parsedData.tables.get(id);
  const getDashboardById = (id: string) => parsedData.dashboards.get(id);

  const upstreamTables = getUpstreamTables(table.id, parsedData);
  const downstreamTables = getDownstreamTables(table.id, parsedData);
  
  // Get connected dashboards for this table
  const connectedDashboards = new Set<string>();
  parsedData.dashboardTables.forEach(dt => {
    if (dt.tableId === table.id) {
      connectedDashboards.add(dt.dashboardId);
    }
  });
  
  // Get tables with distances for grouping
  const upstreamTablesWithDistance = getUpstreamTablesWithDistance(table.id, parsedData);
  const downstreamTablesWithDistance = getDownstreamTablesWithDistance(table.id, parsedData);
  
  // Helper function to group tables by distance
  const groupTablesByDistance = (tablesWithDistance: Map<string, number>) => {
    const groups = new Map<number, string[]>();
    
    tablesWithDistance.forEach((distance, tableId) => {
      if (!groups.has(distance)) {
        groups.set(distance, []);
      }
      groups.get(distance)!.push(tableId);
    });
    
    // Sort each group alphabetically
    groups.forEach((tableIds) => {
      tableIds.sort((a, b) => {
        const tableA = getTableById(a);
        const tableB = getTableById(b);
        return (tableA?.name || '').localeCompare(tableB?.name || '');
      });
    });
    
    return groups;
  };
  
  const upstreamGroups = groupTablesByDistance(upstreamTablesWithDistance);
  const downstreamGroups = groupTablesByDistance(downstreamTablesWithDistance);
  
  // Helper function to get distance badge color
  const getDistanceBadgeColor = (distance: number) => {
    if (distance === 1) return 'bg-green-100 text-green-800 border-green-200';
    if (distance === 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const loadColumns = async () => {
    if (!table) return;
    
    setColumnsLoading(true);
    setColumnsError(false);
    try {
      const tableColumns = await getTableColumns(table.id);
      setColumns(tableColumns);
    } catch (error) {
      console.error('Error loading columns:', error);
      // Set empty columns array on error to prevent UI crashes
      setColumns([]);
      setColumnsError(true);
    } finally {
      setColumnsLoading(false);
    }
  };

  const handleAddColumn = async (columnData: CreateColumnRequest) => {
    try {
      const newColumn = await createColumn(columnData);
      if (newColumn) {
        setColumns([...columns, newColumn]);
      }
    } catch (error) {
      console.error('Error creating column:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleDeleteColumn = async (column: Column) => {
    if (window.confirm(`Are you sure you want to delete column "${column.column_name}"?`)) {
      try {
        await deleteColumn(column.id);
        setColumns(columns.filter(c => c.id !== column.id));
      } catch (error) {
        console.error('Error deleting column:', error);
        alert('Failed to delete column. Please try again.');
      }
    }
  };

  const handleBulkUpload = async (columnRequests: CreateColumnRequest[]) => {
    try {
      const newColumns = await createBulkColumns(columnRequests);
      setColumns([...columns, ...newColumns]);
    } catch (error) {
      console.error('Error creating bulk columns:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const getLayerVariant = (layer: string): "default" | "success" | "info" | "warning" | "destructive" => {
    switch (layer) {
      case 'Raw': return 'success';
      case 'Inter': return 'info';
      case 'Target': return 'warning';
      case 'Reporting': return 'destructive';
      default: return 'default';
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form data when canceling
      setEditFormData({
        name: table?.name,
        dataset: table?.dataset,
        layer: table?.layer,
        tableType: table?.tableType,
        isScheduledQuery: table?.isScheduledQuery,
        link: table?.link,
        description: table?.description
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = async () => {
    if (!table || !activeProjectId) return;
    
    try {
      await updateTable(table.id, editFormData, activeProjectId);
      setIsEditing(false);
      onTableUpdate?.();
    } catch (error) {
      console.error('Error updating table:', error);
      alert('Failed to update table. Please try again.');
    }
  };

  if (!isOpen || !table) return null;

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-card border-l shadow-lg transition-transform duration-300 ease-in-out z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '600px' }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{isEditing ? 'Edit table' : table.name}</h2>
            <p className="text-sm text-muted-foreground">{table.id}</p>
          </div>
          <div className="flex items-center gap-2">
              {activeProjectId && (
                isEditing ? (
                  <>
                    <Button
                      onClick={handleSaveEdit}
                      size="sm"
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      onClick={handleEditToggle}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleEditToggle}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                )
              )}
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
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                    Table name
                  </Label>
                  <Input
                    id="name"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="dataset" className="text-sm font-medium text-muted-foreground">
                    Dataset
                  </Label>
                  <Input
                    id="dataset"
                    value={editFormData.dataset || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, dataset: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Layer
                    </Label>
                    <Select
                      value={editFormData.layer}
                      onValueChange={(value) => setEditFormData({ ...editFormData, layer: value as any })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Raw">Raw</SelectItem>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Target">Target</SelectItem>
                        <SelectItem value="Reporting">Reporting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Table type
                    </Label>
                    <Select
                      value={editFormData.tableType}
                      onValueChange={(value) => setEditFormData({ ...editFormData, tableType: value as any })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Table">Table</SelectItem>
                        <SelectItem value="View">View</SelectItem>
                        <SelectItem value="Query">Query</SelectItem>
                        <SelectItem value="Sheet">Sheet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="scheduled"
                    checked={editFormData.isScheduledQuery || false}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, isScheduledQuery: checked })}
                  />
                  <Label htmlFor="scheduled" className="text-sm font-medium text-muted-foreground">
                    Scheduled query
                  </Label>
                </div>

                <div>
                  <Label htmlFor="link" className="text-sm font-medium text-muted-foreground">
                    Link (optional)
                  </Label>
                  <Input
                    id="link"
                    value={editFormData.link || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, link: e.target.value })}
                    placeholder="https://console.cloud.google.com/bigquery..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Describe the purpose of this table..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Dataset</span>
                  <p className="text-sm mt-1">{table.dataset}</p>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Layer</span>
                    <div className="mt-1">
                      <Badge variant={getLayerVariant(table.layer)}>
                        {table.layer}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Type</span>
                    <p className="text-sm mt-1">{table.tableType}</p>
                  </div>
                </div>

                {table.isScheduledQuery && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Scheduled query</span>
                  </div>
                )}

                {table.description && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{table.description}</p>
                  </div>
                )}

                {table.link && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(table.link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View in BigQuery
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Columns Section */}
            {areColumnsAvailable() && !columnsError && (
              <div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Columns ({columns.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setShowAddColumn(true)}
                      size="sm"
                      className="gap-2 w-full"
                    >
                      <Plus className="h-3 w-3" />
                      Add Column
                    </Button>
                    <Button
                      onClick={() => setShowUploadSchema(true)}
                      size="sm"
                      variant="outline"
                      className="gap-2 w-full"
                    >
                      <Upload className="h-3 w-3" />
                      Upload Schema
                    </Button>
                  </div>
                </div>
                <ColumnList
                  columns={columns}
                  loading={columnsLoading}
                  onDeleteColumn={handleDeleteColumn}
                />
              </div>
            )}

            {(upstreamTables.size > 0 || onConnectUpstream) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button 
                    className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
                    onClick={() => setUpstreamExpanded(!upstreamExpanded)}
                  >
                    {upstreamExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Upstream tables ({upstreamTables.size})
                  </button>
                  {onConnectUpstream && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Plus className="h-3 w-3" />
                          Link upstream
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                        <DropdownMenuItem disabled className="font-semibold text-xs">
                          Select upstream table
                        </DropdownMenuItem>
                        {Array.from(parsedData.tables.values())
                          .filter(t => t.id !== table.id && !upstreamTables.has(t.id))
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(t => (
                            <DropdownMenuItem 
                              key={`upstream-${t.id}`}
                              onClick={() => {
                                try {
                                  onConnectUpstream(t.id, table.id);
                                } catch (error) {
                                  console.error('Error connecting upstream table:', error);
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
                          .filter(t => t.id !== table.id && !upstreamTables.has(t.id))
                          .length === 0 && (
                          <DropdownMenuItem disabled>
                            <p className="text-sm text-muted-foreground">No available tables</p>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {upstreamExpanded && (
                  <div className="space-y-4">
                    {Array.from(upstreamGroups.entries())
                    .sort(([a], [b]) => a - b) // Sort by distance
                    .map(([distance, tableIds]) => (
                      <div key={`upstream-distance-${distance}`} className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {distance === 1 ? 'Direct connections' : `${distance} steps away`}
                        </h4>
                        <div className="space-y-2">
                          {tableIds.map(id => {
                            const upTable = getTableById(id);
                            if (!upTable) return null;
                            return (
                              <Card
                                key={id}
                                className={`hover:shadow-sm transition-all ${
                                  distance === 1 ? 'border-green-200' : 
                                  distance === 2 ? 'border-yellow-200' : 
                                  'border-orange-200'
                                }`}
                              >
                                <CardContent className="p-2">
                                  <div className="flex items-center justify-between">
                                    <div 
                                      className="min-w-0 flex-1 cursor-pointer"
                                      onClick={() => onTableSelect(id)}
                                    >
                                      <p className="text-sm font-medium truncate">{upTable.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{upTable.dataset}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs px-1.5 py-0 h-5 ${getDistanceBadgeColor(distance)}`}
                                      >
                                        {distance}
                                      </Badge>
                                      <Badge variant={getLayerVariant(upTable.layer)} className="ml-0">
                                        {upTable.layer}
                                      </Badge>
                                      {onDisconnectUpstream && distance === 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDisconnectUpstream(id, table.id);
                                          }}
                                          title="Remove upstream connection"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {upstreamTables.size === 0 && (
                      <p className="text-sm text-muted-foreground">No upstream tables</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {(downstreamTables.size > 0 || onConnectDownstream) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button 
                    className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
                    onClick={() => setDownstreamExpanded(!downstreamExpanded)}
                  >
                    {downstreamExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Downstream tables ({downstreamTables.size})
                  </button>
                  {onConnectDownstream && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Plus className="h-3 w-3" />
                          Link downstream
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                        <DropdownMenuItem disabled className="font-semibold text-xs">
                          Select downstream table
                        </DropdownMenuItem>
                        {Array.from(parsedData.tables.values())
                          .filter(t => t.id !== table.id && !downstreamTables.has(t.id))
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(t => (
                            <DropdownMenuItem 
                              key={`downstream-${t.id}`}
                              onClick={() => {
                                try {
                                  onConnectDownstream(table.id, t.id);
                                } catch (error) {
                                  console.error('Error connecting downstream table:', error);
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
                          .filter(t => t.id !== table.id && !downstreamTables.has(t.id))
                          .length === 0 && (
                          <DropdownMenuItem disabled>
                            <p className="text-sm text-muted-foreground">No available tables</p>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {downstreamExpanded && (
                  <div className="space-y-4">
                    {Array.from(downstreamGroups.entries())
                    .sort(([a], [b]) => a - b) // Sort by distance
                    .map(([distance, tableIds]) => (
                      <div key={`downstream-distance-${distance}`} className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {distance === 1 ? 'Direct connections' : `${distance} steps away`}
                        </h4>
                        <div className="space-y-2">
                          {tableIds.map(id => {
                            const downTable = getTableById(id);
                            if (!downTable) return null;
                            return (
                              <Card
                                key={id}
                                className={`hover:shadow-sm transition-all ${
                                  distance === 1 ? 'border-green-200' : 
                                  distance === 2 ? 'border-yellow-200' : 
                                  'border-orange-200'
                                }`}
                              >
                                <CardContent className="p-2">
                                  <div className="flex items-center justify-between">
                                    <div 
                                      className="min-w-0 flex-1 cursor-pointer"
                                      onClick={() => onTableSelect(id)}
                                    >
                                      <p className="text-sm font-medium truncate">{downTable.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{downTable.dataset}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs px-1.5 py-0 h-5 ${getDistanceBadgeColor(distance)}`}
                                      >
                                        {distance}
                                      </Badge>
                                      <Badge variant={getLayerVariant(downTable.layer)} className="ml-0">
                                        {downTable.layer}
                                      </Badge>
                                      {onDisconnectDownstream && distance === 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDisconnectDownstream(table.id, id);
                                          }}
                                          title="Remove downstream connection"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {downstreamTables.size === 0 && (
                      <p className="text-sm text-muted-foreground">No downstream tables</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Connected Dashboards Section */}
            {onConnectDashboard && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button 
                    className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
                    onClick={() => setDashboardsExpanded(!dashboardsExpanded)}
                  >
                    {dashboardsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Connected dashboards
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Plus className="h-3 w-3" />
                        Link dashboard
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                      <DropdownMenuItem disabled className="font-semibold text-xs">
                        Select dashboard to connect
                      </DropdownMenuItem>
                      {Array.from(parsedData.dashboards.values())
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(d => (
                          <DropdownMenuItem 
                            key={`dashboard-${d.id}`}
                            onClick={() => {
                              try {
                                onConnectDashboard(table.id, d.id);
                              } catch (error) {
                                console.error('Error connecting to dashboard:', error);
                              }
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{d.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{d.businessArea || 'No business area'}</p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      }
                      {Array.from(parsedData.dashboards.values()).length === 0 && (
                        <DropdownMenuItem disabled>
                          <p className="text-sm text-muted-foreground">No available dashboards</p>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {dashboardsExpanded && (
                  <div className="space-y-2">
                    {connectedDashboards.size > 0 ? (
                      Array.from(connectedDashboards).map(dashboardId => {
                        const dashboard = getDashboardById(dashboardId);
                        if (!dashboard) return null;
                        return (
                          <Card key={dashboardId} className="hover:shadow-sm transition-all">
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{dashboard.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {dashboard.businessArea || 'No business area'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Dashboard
                                  </Badge>
                                  {onDisconnectDashboard && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDisconnectDashboard(table.id, dashboardId);
                                      }}
                                      title="Remove dashboard connection"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No connected dashboards
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {upstreamTables.size === 0 && downstreamTables.size === 0 && !onConnectDashboard && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No connected tables found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Add Column Modal */}
      {areColumnsAvailable() && (
        <AddColumnModal
          isOpen={showAddColumn}
          onClose={() => setShowAddColumn(false)}
          onSubmit={handleAddColumn}
          tableId={table.id}
          tableName={table.name}
        />
      )}

      {/* Upload Schema Modal */}
      {areColumnsAvailable() && (
        <UploadSchemaModal
          isOpen={showUploadSchema}
          onClose={() => setShowUploadSchema(false)}
          onSubmit={handleBulkUpload}
          tableId={table.id}
          tableName={table.name}
        />
      )}
    </div>
  );
};

export default TableDetails;