import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import ProjectModal from './ProjectModal';
import { Project } from '../types';
import { getAllProjects, deleteProject, getProjectStats } from '../services/projects';
import { usePortal } from '../contexts/PortalContext';

interface ProjectTabsProps {
  activeProject: Project | null;
  onProjectSelect: (project: Project) => void;
}

interface ProjectWithStats extends Project {
  tableCount?: number;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({
  activeProject,
  onProjectSelect
}) => {
  const { portalName, isAdmin } = usePortal();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await getAllProjects(portalName, isAdmin);
      
      // Load stats for each project
      const projectsWithStats = await Promise.all(
        allProjects.map(async (project) => {
          try {
            const stats = await getProjectStats(project.id);
            return { ...project, tableCount: stats.tableCount };
          } catch (error) {
            console.warn(`Failed to load stats for project ${project.id}:`, error);
            return { ...project, tableCount: 0 };
          }
        })
      );
      
      setProjects(projectsWithStats);
      
      // Only auto-select first project if we have projects but no active project AND we're not in upload mode
      // This prevents conflicts with new project creation flow
      if (!activeProject && projectsWithStats.length > 0) {
        // Let parent component decide when to auto-select
        // Don't automatically select here to avoid conflicts
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [portalName, isAdmin]);

  const handleProjectCreated = (project: Project) => {
    loadProjects();
    onProjectSelect(project);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? { ...updatedProject, tableCount: p.tableCount } : p
    ));
    if (activeProject?.id === updatedProject.id) {
      onProjectSelect(updatedProject);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) {
      return;
    }

    const projectToDelete = selectedProject;
    
    try {
      // Close dialog first to prevent state conflicts during deletion
      setShowDeleteDialog(false);
      setSelectedProject(null);
      
      setLoading(true);
      
      await deleteProject(projectToDelete.id);
      
      // Use page refresh for all deletions to avoid React component lifecycle issues
      // This ensures reliable cleanup and prevents UI freezes
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Failed to delete project:', error);
      setShowDeleteDialog(false);
      setSelectedProject(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-4 border-b">
        <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
        <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-1 p-4 border-b bg-muted/20">
        <div className="flex items-center space-x-1 flex-1 overflow-x-auto">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center group">
              <Button
                variant={activeProject?.id === project.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onProjectSelect(project)}
                className={`flex items-center space-x-2 whitespace-nowrap ${
                  activeProject?.id === project.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <Database className="h-3 w-3" />
                <span className="max-w-32 truncate">{project.name}</span>
                {project.tableCount !== undefined && project.tableCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {project.tableCount}
                  </Badge>
                )}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedProject(project);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedProject(project);
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Create Project Modal */}
      <ProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
        mode="create"
      />

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProject(null);
        }}
        onProjectCreated={handleProjectUpdated}
        existingProject={selectedProject || undefined}
        mode="edit"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? 
              This will permanently remove all tables, lineages, and dashboards in this project.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProjectTabs;