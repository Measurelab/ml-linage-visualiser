import React, { useState } from 'react';
import { ColumnDataType, CreateColumnRequest } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Loader2, AlertTriangle, Check } from 'lucide-react';

interface UploadSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (columns: CreateColumnRequest[]) => Promise<void>;
  tableId: string;
  tableName: string;
}

interface ParsedColumn {
  name: string;
  type: ColumnDataType;
  mode: 'NULLABLE' | 'REQUIRED' | 'REPEATED';
  description?: string;
}

// Map BigQuery types to our supported types
const mapBigQueryType = (type: string): ColumnDataType => {
  const typeUpper = type.toUpperCase();
  switch (typeUpper) {
    case 'STRING':
    case 'TEXT':
      return 'STRING';
    case 'INTEGER':
    case 'INT64':
    case 'INT':
      return 'INTEGER';
    case 'FLOAT':
    case 'FLOAT64':
    case 'NUMERIC':
    case 'DECIMAL':
      return 'FLOAT';
    case 'BOOLEAN':
    case 'BOOL':
      return 'BOOLEAN';
    case 'TIMESTAMP':
    case 'DATETIME':
      return 'TIMESTAMP';
    case 'DATE':
      return 'DATE';
    case 'JSON':
    case 'STRUCT':
    case 'RECORD':
      return 'JSON';
    case 'ARRAY':
    case 'REPEATED':
      return 'ARRAY';
    default:
      return 'STRING';
  }
};

const UploadSchemaModal: React.FC<UploadSchemaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tableId,
  tableName
}) => {
  const [parsedColumns, setParsedColumns] = useState<ParsedColumn[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError(null);

    try {
      const text = await file.text();
      setFileContent(text);
      const schema = JSON.parse(text);
      const columns = parseSchema(schema);
      setParsedColumns(columns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
      setParsedColumns([]);
    } finally {
      setParsing(false);
    }
  };

  const parseSchema = (schema: any): ParsedColumn[] => {
    const columns: ParsedColumn[] = [];

    // Handle BigQuery schema format (array of field objects)
    if (Array.isArray(schema)) {
      schema.forEach(field => {
        if (field.name && field.type) {
          columns.push({
            name: field.name,
            type: mapBigQueryType(field.type),
            mode: field.mode || 'NULLABLE',
            description: field.description
          });
        }
      });
    }
    // Handle nested schema format
    else if (schema.fields && Array.isArray(schema.fields)) {
      schema.fields.forEach((field: any) => {
        if (field.name && field.type) {
          columns.push({
            name: field.name,
            type: mapBigQueryType(field.type),
            mode: field.mode || 'NULLABLE',
            description: field.description
          });
        }
      });
    }
    // Handle simple object format
    else if (typeof schema === 'object') {
      Object.entries(schema).forEach(([name, fieldInfo]) => {
        if (typeof fieldInfo === 'object' && fieldInfo !== null) {
          const field = fieldInfo as any;
          columns.push({
            name,
            type: mapBigQueryType(field.type || 'STRING'),
            mode: field.mode || field.nullable === false ? 'REQUIRED' : 'NULLABLE',
            description: field.description
          });
        } else if (typeof fieldInfo === 'string') {
          // Simple format: { "column_name": "STRING" }
          columns.push({
            name,
            type: mapBigQueryType(fieldInfo),
            mode: 'NULLABLE'
          });
        }
      });
    }

    return columns;
  };

  const handleSubmit = async () => {
    if (parsedColumns.length === 0) return;

    setUploading(true);
    try {
      const columnRequests: CreateColumnRequest[] = parsedColumns.map(col => ({
        table_id: tableId,
        column_name: col.name,
        data_type: col.type,
        is_nullable: col.mode === 'NULLABLE',
        description: col.description
      }));

      await onSubmit(columnRequests);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create columns');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading && !parsing) {
      setParsedColumns([]);
      setError(null);
      setFileContent('');
      onClose();
    }
  };

  const getDataTypeColor = (dataType: ColumnDataType): string => {
    switch (dataType) {
      case 'STRING': return 'text-blue-600';
      case 'INTEGER':
      case 'FLOAT': return 'text-green-600';
      case 'BOOLEAN': return 'text-purple-600';
      case 'TIMESTAMP':
      case 'DATE': return 'text-orange-600';
      case 'JSON': return 'text-yellow-600';
      case 'ARRAY': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-[600px] sm:w-[800px]">
        <SheetHeader>
          <SheetTitle>Upload JSON Schema</SheetTitle>
          <SheetDescription>
            Upload a JSON schema file to populate columns for <strong>{tableName}</strong>
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-6 pr-4">
            {error && (
              <Card className="border-destructive">
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <div className="space-y-3">
              <label htmlFor="schema-file" className="text-sm font-medium">
                Select JSON Schema File
              </label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                <Input
                  id="schema-file"
                  type="file"
                  accept=".json,.txt"
                  onChange={handleFileUpload}
                  disabled={parsing || uploading}
                  className="hidden"
                />
                <label
                  htmlFor="schema-file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {parsing ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {parsing ? 'Parsing...' : 'Click to upload JSON schema'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports BigQuery schema format, custom JSON, or simple key-value pairs
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Schema Examples */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-2">Supported formats:</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-medium">BigQuery Schema:</p>
                    <code className="text-xs bg-muted p-1 rounded">
                      [{"{'name': 'id', 'type': 'INTEGER', 'mode': 'REQUIRED'}"}]
                    </code>
                  </div>
                  <div>
                    <p className="font-medium">Simple format:</p>
                    <code className="text-xs bg-muted p-1 rounded">
                      {"{'id': 'INTEGER', 'name': 'STRING', 'active': 'BOOLEAN'}"}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parsed Columns Preview */}
            {parsedColumns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-4 w-4 text-green-600" />
                  <h4 className="text-sm font-medium">
                    Parsed {parsedColumns.length} columns
                  </h4>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedColumns.map((column, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {column.name}
                              </span>
                              <Badge 
                                variant="secondary"
                                className={`text-xs ${getDataTypeColor(column.type)}`}
                              >
                                {column.type}
                              </Badge>
                              {column.mode === 'REQUIRED' ? (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Nullable
                                </Badge>
                              )}
                            </div>
                            {column.description && (
                              <p className="text-xs text-muted-foreground">
                                {column.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={uploading || parsing || parsedColumns.length === 0}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Columns...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Create {parsedColumns.length} Columns
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={uploading || parsing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default UploadSchemaModal;