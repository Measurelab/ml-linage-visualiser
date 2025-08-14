import { supabase } from './supabase';
import { Project } from '../types';

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

// Get all projects
export const getAllProjects = async (): Promise<Project[]> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }

  return data || [];
};

// Create a new project
export const createProject = async (projectData: CreateProjectRequest): Promise<Project> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { data, error } = await supabase
    .from('projects')
    .insert([projectData])
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }

  console.log(`✅ Created project: ${data.name}`);
  return data;
};

// Update a project
export const updateProject = async (projectId: string, updates: UpdateProjectRequest): Promise<Project> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }

  console.log(`✅ Updated project: ${data.name}`);
  return data;
};

// Delete a project (cascades to all related data)
export const deleteProject = async (projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }

  console.log(`✅ Deleted project: ${projectId}`);
};

// Get project by ID
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching project:', error);
    throw error;
  }

  return data;
};

// Check if a project name already exists
export const projectNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  let query = supabase
    .from('projects')
    .select('id')
    .eq('name', name);
    
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking project name:', error);
    throw error;
  }

  return (data || []).length > 0;
};

// Get project statistics (table counts, etc.)
export const getProjectStats = async (projectId: string): Promise<{
  tableCount: number;
  lineageCount: number;
  dashboardCount: number;
}> => {
  if (!supabase) throw new Error('Supabase client not initialized');

  const [tablesResult, lineagesResult, dashboardsResult] = await Promise.all([
    supabase.from('tables').select('id', { count: 'exact' }).eq('project_id', projectId),
    supabase.from('lineages').select('id', { count: 'exact' }).eq('project_id', projectId),
    supabase.from('dashboards').select('id', { count: 'exact' }).eq('project_id', projectId)
  ]);

  return {
    tableCount: tablesResult.count || 0,
    lineageCount: lineagesResult.count || 0,
    dashboardCount: dashboardsResult.count || 0
  };
};