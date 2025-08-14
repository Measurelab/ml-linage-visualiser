import React, { useState, useEffect } from 'react';
import { Table, ParsedData, Column, CreateColumnRequest } from '@/types';
import { getUpstreamTables, getDownstreamTables } from '@/utils/graphBuilder';
import { getTableColumns, createColumn, deleteColumn, createBulkColumns } from '@/services/columns';
import { isSupabaseEnabled } from '@/services/supabase';
import { ExternalLink, Clock, Plus, Database, Upload } from 'lucide-react';
import ColumnList from './ColumnList';
import AddColumnModal from './AddColumnModal';
import UploadSchemaModal from './UploadSchemaModal';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface TableDetailsProps {
  table: Table | null;
  parsedData: ParsedData;
  isOpen: boolean;
  onClose: () => void;
  onTableSelect: (tableId: string) => void;
}

const TableDetails: React.FC<TableDetailsProps> = ({
  table,
  parsedData,
  isOpen,
  onClose,
  onTableSelect
}) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showUploadSchema, setShowUploadSchema] = useState(false);

  // Load columns when table changes
  useEffect(() => {
    if (isSupabaseEnabled && table) {
      loadColumns();
    }
  }, [table?.id]);

  // Add error boundary for this component
  useEffect(() => {
    console.log('TableDetails component mounted/updated', { 
      tableId: table?.id, 
      supabaseEnabled: isSupabaseEnabled 
    });
  }, [table?.id]);

  if (!table) return null;

  const upstreamTables = getUpstreamTables(table.id, parsedData);
  const downstreamTables = getDownstreamTables(table.id, parsedData);

  const loadColumns = async () => {
    if (!table) return;
    
    setColumnsLoading(true);
    try {
      const tableColumns = await getTableColumns(table.id);
      setColumns(tableColumns);
    } catch (error) {
      console.error('Error loading columns:', error);
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

  const getTableById = (id: string) => parsedData.tables.get(id);

  const getLayerVariant = (layer: string): "default" | "success" | "info" | "warning" => {
    switch (layer) {
      case 'Raw': return 'success';
      case 'Inter': return 'info';
      case 'Target': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[800px]">
        <SheetHeader>
          <SheetTitle>{table.name}</SheetTitle>
          <SheetDescription>{table.id}</SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-4 px-2">
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

            {/* Columns Section */}
            {isSupabaseEnabled && (
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

            {upstreamTables.size > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Upstream tables ({upstreamTables.size})
                </h3>
                <div className="space-y-2">
                  {Array.from(upstreamTables).map(id => {
                    const upTable = getTableById(id);
                    if (!upTable) return null;
                    return (
                      <Card
                        key={id}
                        className="cursor-pointer hover:shadow-sm transition-all"
                        onClick={() => onTableSelect(id)}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{upTable.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{upTable.dataset}</p>
                            </div>
                            <Badge variant={getLayerVariant(upTable.layer)} className="ml-2">
                              {upTable.layer}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {downstreamTables.size > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Downstream tables ({downstreamTables.size})
                </h3>
                <div className="space-y-2">
                  {Array.from(downstreamTables).map(id => {
                    const downTable = getTableById(id);
                    if (!downTable) return null;
                    return (
                      <Card
                        key={id}
                        className="cursor-pointer hover:shadow-sm transition-all"
                        onClick={() => onTableSelect(id)}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{downTable.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{downTable.dataset}</p>
                            </div>
                            <Badge variant={getLayerVariant(downTable.layer)} className="ml-2">
                              {downTable.layer}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {upstreamTables.size === 0 && downstreamTables.size === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No connected tables found
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>

      {/* Add Column Modal */}
      {isSupabaseEnabled && (
        <AddColumnModal
          isOpen={showAddColumn}
          onClose={() => setShowAddColumn(false)}
          onSubmit={handleAddColumn}
          tableId={table.id}
          tableName={table.name}
        />
      )}

      {/* Upload Schema Modal */}
      {isSupabaseEnabled && (
        <UploadSchemaModal
          isOpen={showUploadSchema}
          onClose={() => setShowUploadSchema(false)}
          onSubmit={handleBulkUpload}
          tableId={table.id}
          tableName={table.name}
        />
      )}
    </Sheet>
  );
};

export default TableDetails;