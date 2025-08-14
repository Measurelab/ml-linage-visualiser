import React, { useState } from 'react';
import { ColumnDataType, CreateColumnRequest } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Loader2 } from 'lucide-react';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (columnData: CreateColumnRequest) => Promise<void>;
  tableId: string;
  tableName: string;
  loading?: boolean;
}

const DATA_TYPES: ColumnDataType[] = [
  'STRING',
  'INTEGER', 
  'FLOAT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATE',
  'JSON',
  'ARRAY'
];

const AddColumnModal: React.FC<AddColumnModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tableId,
  tableName,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    column_name: '',
    data_type: 'STRING' as ColumnDataType,
    is_nullable: false,
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.column_name.trim()) {
      setError('Column name is required');
      return;
    }

    // Validate column name (basic validation)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.column_name.trim())) {
      setError('Column name must start with a letter or underscore and contain only letters, numbers, and underscores');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        table_id: tableId,
        column_name: formData.column_name.trim(),
        data_type: formData.data_type,
        is_nullable: formData.is_nullable,
        description: formData.description.trim() || undefined
      });
      
      // Reset form
      setFormData({
        column_name: '',
        data_type: 'STRING',
        is_nullable: false,
        description: ''
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create column');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        column_name: '',
        data_type: 'STRING',
        is_nullable: false,
        description: ''
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Add Column</SheetTitle>
          <SheetDescription>
            Add a new column to <strong>{tableName}</strong>
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <form onSubmit={handleSubmit} className="space-y-6 pr-4">
            {error && (
              <Card className="border-destructive">
                <CardContent className="p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <label htmlFor="column_name" className="text-sm font-medium">
                Column Name *
              </label>
              <Input
                id="column_name"
                type="text"
                placeholder="e.g., user_id, email, created_at"
                value={formData.column_name}
                onChange={(e) => setFormData({ ...formData, column_name: e.target.value })}
                disabled={submitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                Must start with a letter or underscore, contain only letters, numbers, and underscores
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">
                Data Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DATA_TYPES.map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={formData.data_type === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, data_type: type })}
                    disabled={submitting}
                    className="justify-start"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_nullable"
                checked={formData.is_nullable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_nullable: checked as boolean })}
                disabled={submitting}
              />
              <label
                htmlFor="is_nullable"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Allow null values
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="description"
                type="text"
                placeholder="Optional description of this column"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={submitting}
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Preview</h4>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {formData.column_name || 'column_name'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {formData.data_type}
                    </Badge>
                    {formData.is_nullable && (
                      <Badge variant="outline" className="text-xs">
                        Nullable
                      </Badge>
                    )}
                  </div>
                  {formData.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={submitting || !formData.column_name.trim()}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default AddColumnModal;