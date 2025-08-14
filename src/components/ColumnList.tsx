import React from 'react';
import { Column, ColumnDataType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit2, Trash2 } from 'lucide-react';

interface ColumnListProps {
  columns: Column[];
  loading?: boolean;
  onEditColumn?: (column: Column) => void;
  onDeleteColumn?: (column: Column) => void;
}

const getDataTypeVariant = (dataType: ColumnDataType): "default" | "secondary" | "destructive" | "outline" => {
  switch (dataType) {
    case 'STRING':
      return 'default';
    case 'INTEGER':
    case 'FLOAT':
      return 'secondary';
    case 'BOOLEAN':
      return 'outline';
    case 'TIMESTAMP':
    case 'DATE':
      return 'destructive';
    default:
      return 'default';
  }
};

const getDataTypeColor = (dataType: ColumnDataType): string => {
  switch (dataType) {
    case 'STRING':
      return 'text-blue-600';
    case 'INTEGER':
    case 'FLOAT':
      return 'text-green-600';
    case 'BOOLEAN':
      return 'text-purple-600';
    case 'TIMESTAMP':
    case 'DATE':
      return 'text-orange-600';
    case 'JSON':
      return 'text-yellow-600';
    case 'ARRAY':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const ColumnList: React.FC<ColumnListProps> = ({
  columns,
  loading = false,
  onEditColumn,
  onDeleteColumn
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No columns defined for this table</p>
        <p className="text-xs mt-1">Add columns to document the table schema</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {columns.map((column) => (
        <Card key={column.id} className="hover:shadow-sm transition-all">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {column.column_name}
                  </span>
                  <Badge 
                    variant={getDataTypeVariant(column.data_type)}
                    className={`text-xs ${getDataTypeColor(column.data_type)}`}
                  >
                    {column.data_type}
                  </Badge>
                  {column.is_nullable && (
                    <Badge variant="outline" className="text-xs">
                      Nullable
                    </Badge>
                  )}
                </div>
                {column.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {column.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                {onEditColumn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEditColumn(column)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
                {onDeleteColumn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDeleteColumn(column)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ColumnList;