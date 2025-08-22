import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Table, LayerType, TableType, GraphNode } from '../types';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface CreateTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (table: Table, autoConnect?: { node: GraphNode; mode: 'upstream' | 'downstream' }) => void;
  existingTableIds: Set<string>;
  connectionNode?: GraphNode;
  connectionMode?: 'upstream' | 'downstream';
}

const CreateTableDialog: React.FC<CreateTableDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingTableIds,
  connectionNode,
  connectionMode
}) => {
  const [formData, setFormData] = useState<Partial<Table>>({
    id: '',
    name: '',
    dataset: '',
    layer: 'Raw',
    tableType: 'Table',
    isScheduledQuery: false,
    link: '',
    description: ''
  });

  // Auto-generate table ID based on dataset and name
  const generateTableId = (dataset: string, name: string): string => {
    if (!dataset.trim() || !name.trim()) return '';
    
    // Convert to lowercase and replace spaces/special chars with underscores
    const cleanDataset = dataset.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    return `${cleanDataset}.${cleanName}`;
  };
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Table name is required';
    }

    if (!formData.dataset?.trim()) {
      newErrors.dataset = 'Dataset is required';
    }

    // Generate the ID and check for duplicates
    const generatedId = generateTableId(formData.dataset || '', formData.name || '');
    if (generatedId && existingTableIds.has(generatedId)) {
      newErrors.name = 'A table with this name already exists in this dataset';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Generate the table ID automatically
      const generatedId = generateTableId(formData.dataset!.trim(), formData.name!.trim());
      
      const newTable = {
        id: generatedId,
        name: formData.name!.trim(),
        dataset: formData.dataset!.trim(),
        layer: formData.layer as LayerType,
        tableType: formData.tableType as TableType,
        isScheduledQuery: formData.isScheduledQuery || false,
        link: formData.link?.trim(),
        description: formData.description?.trim()
      };
      
      if (connectionNode && connectionMode) {
        onConfirm(newTable, { node: connectionNode, mode: connectionMode });
      } else {
        onConfirm(newTable);
      }
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      id: '',
      name: '',
      dataset: '',
      layer: 'Raw',
      tableType: 'Table',
      isScheduledQuery: false,
      link: '',
      description: ''
    });
    setErrors({});
    onClose();
  };

  // Update the generated ID whenever name or dataset changes
  const handleNameChange = (name: string) => {
    const generatedId = generateTableId(formData.dataset || '', name);
    setFormData({ ...formData, name, id: generatedId });
    setErrors({ ...errors, name: '' });
  };

  const handleDatasetChange = (dataset: string) => {
    const generatedId = generateTableId(dataset, formData.name || '');
    setFormData({ ...formData, dataset, id: generatedId });
    setErrors({ ...errors, dataset: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create new table</DialogTitle>
          <DialogDescription>
            {connectionNode && connectionMode ? (
              <div className="space-y-2">
                <p>Add a new table to the lineage visualization.</p>
                <div className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded-md">
                  {connectionMode === 'upstream' ? (
                    <>
                      <span>New table</span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-semibold">{connectionNode.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{connectionNode.name}</span>
                      <ArrowRight className="h-4 w-4" />
                      <span>New table</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              'Add a new table to the lineage visualization. Table ID will be generated automatically from the dataset and name.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {formData.id && (
            <div className="rounded-md bg-muted px-3 py-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Generated table ID
              </Label>
              <p className="text-sm font-mono">{formData.id}</p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">
              Table name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., users_table"
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dataset">
              Dataset *
            </Label>
            <Input
              id="dataset"
              value={formData.dataset}
              onChange={(e) => handleDatasetChange(e.target.value)}
              placeholder="e.g., analytics"
            />
            {errors.dataset && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.dataset}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="layer">Layer</Label>
              <Select
                value={formData.layer}
                onValueChange={(value) => setFormData({ ...formData, layer: value as LayerType })}
              >
                <SelectTrigger id="layer">
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

            <div className="grid gap-2">
              <Label htmlFor="tableType">Table type</Label>
              <Select
                value={formData.tableType}
                onValueChange={(value) => setFormData({ ...formData, tableType: value as TableType })}
              >
                <SelectTrigger id="tableType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Table">Table</SelectItem>
                  <SelectItem value="View">View</SelectItem>
                  <SelectItem value="Materialized View">Materialized view</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="scheduled"
              checked={formData.isScheduledQuery}
              onCheckedChange={(checked) => setFormData({ ...formData, isScheduledQuery: checked })}
            />
            <Label htmlFor="scheduled" className="font-normal">
              Scheduled query
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="link">
              Link (optional)
            </Label>
            <Input
              id="link"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://console.cloud.google.com/bigquery..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the purpose of this table..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTableDialog;