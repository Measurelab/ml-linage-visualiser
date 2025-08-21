import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { Table } from '../types';

interface DeleteConfirmDialogProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  upstreamCount?: number;
  downstreamCount?: number;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  table,
  isOpen,
  onClose,
  onConfirm,
  upstreamCount = 0,
  downstreamCount = 0
}) => {
  if (!table) return null;

  const totalConnections = upstreamCount + downstreamCount;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete table confirmation
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete the table <strong>{table.name}</strong>?
            </p>
            {totalConnections > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
                <p className="font-semibold text-destructive">
                  Warning: This table has {totalConnections} connection{totalConnections !== 1 ? 's' : ''}
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  {upstreamCount > 0 && (
                    <li>• {upstreamCount} upstream table{upstreamCount !== 1 ? 's' : ''}</li>
                  )}
                  {downstreamCount > 0 && (
                    <li>• {downstreamCount} downstream table{downstreamCount !== 1 ? 's' : ''}</li>
                  )}
                </ul>
                <p className="text-sm mt-2">
                  All lineage relationships will be permanently removed.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete table
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;