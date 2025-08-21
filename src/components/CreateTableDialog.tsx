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
import { AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id?.trim()) {
      newErrors.id = 'Table ID is required';
    } else if (existingTableIds.has(formData.id)) {
      newErrors.id = 'This table ID already exists';
    }

    if (!formData.name?.trim()) {
      newErrors.name = 'Table name is required';
    }

    if (!formData.dataset?.trim()) {
      newErrors.dataset = 'Dataset is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const newTable = {
        id: formData.id!.trim(),
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
              'Add a new table to the lineage visualization. All fields marked with * are required.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="id">
              Table ID *
            </Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => {
                setFormData({ ...formData, id: e.target.value });
                setErrors({ ...errors, id: '' });
              }}
              placeholder="e.g., project.dataset.table_name"
            />
            {errors.id && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.id}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">
              Table name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setErrors({ ...errors, name: '' });
              }}
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
              onChange={(e) => {
                setFormData({ ...formData, dataset: e.target.value });
                setErrors({ ...errors, dataset: '' });
              }}
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