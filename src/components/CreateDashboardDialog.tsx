import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraphNode } from '../types';

interface CreateDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dashboardData: DashboardFormData) => void;
  sourceNode: GraphNode | null;
}

export interface DashboardFormData {
  name: string;
  owner?: string;
  businessArea?: string;
  link?: string;
  sourceTableId?: string;
}

const CreateDashboardDialog: React.FC<CreateDashboardDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sourceNode
}) => {
  const [formData, setFormData] = useState<DashboardFormData>({
    name: '',
    owner: '',
    businessArea: '',
    link: '',
    sourceTableId: sourceNode?.id
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Dashboard name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit form with source table connection
    onConfirm({
      ...formData,
      sourceTableId: sourceNode?.id
    });
    
    // Reset form
    setFormData({
      name: '',
      owner: '',
      businessArea: '',
      link: '',
      sourceTableId: sourceNode?.id
    });
    setErrors({});
  };

  const handleInputChange = (field: keyof DashboardFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg font-semibold">Add connected dashboard</CardTitle>
            <CardDescription className="mt-1">
              {sourceNode && `Connect a new dashboard to "${sourceNode.name}"`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="dashboardName" className="text-sm font-medium">
                Dashboard name *
              </label>
              <input
                id="dashboardName"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter dashboard name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="owner" className="text-sm font-medium">
                Owner (optional)
              </label>
              <input
                id="owner"
                type="text"
                value={formData.owner}
                onChange={(e) => handleInputChange('owner', e.target.value)}
                placeholder="Enter dashboard owner"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="businessArea" className="text-sm font-medium">
                Business area (optional)
              </label>
              <input
                id="businessArea"
                type="text"
                value={formData.businessArea}
                onChange={(e) => handleInputChange('businessArea', e.target.value)}
                placeholder="Enter business area"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="link" className="text-sm font-medium">
                Dashboard link (optional)
              </label>
              <input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => handleInputChange('link', e.target.value)}
                placeholder="https://..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Create dashboard
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateDashboardDialog;