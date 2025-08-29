import { supabase } from './supabase';

export interface NodeLabel {
  id: string;
  project_id: string;
  node_id: string;
  node_type: 'table' | 'dashboard';
  label: string;
  created_at: string;
  updated_at: string;
}

export interface NodeLabelCreate {
  project_id: string;
  node_id: string;
  node_type: 'table' | 'dashboard';
  label: string;
}

// Check if node labels are available (Supabase configured)
export const areNodeLabelsAvailable = (): boolean => {
  return !!supabase;
};

// Get all labels for a specific project
export const getProjectLabels = async (projectId: string): Promise<Map<string, string[]>> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { data, error } = await supabase
    .from('node_labels')
    .select('*')
    .eq('project_id', projectId);
    
  if (error) {
    console.error('Error fetching project labels:', error);
    throw error;
  }
  
  // Group labels by node_id
  const nodeLabelsMap = new Map<string, string[]>();
  data?.forEach((label: NodeLabel) => {
    const existingLabels = nodeLabelsMap.get(label.node_id) || [];
    existingLabels.push(label.label);
    nodeLabelsMap.set(label.node_id, existingLabels);
  });
  
  return nodeLabelsMap;
};

// Get all unique labels in a project for suggestions
export const getProjectUniqueLabels = async (projectId: string): Promise<string[]> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { data, error } = await supabase
    .from('node_labels')
    .select('label')
    .eq('project_id', projectId)
    .order('label');
    
  if (error) {
    console.error('Error fetching unique labels:', error);
    throw error;
  }
  
  // Get unique labels
  const uniqueLabels = Array.from(new Set(data?.map((item: any) => item.label) || []));
  return uniqueLabels;
};

// Add a label to a node
export const addNodeLabel = async (labelData: NodeLabelCreate): Promise<NodeLabel> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { data, error } = await supabase
    .from('node_labels')
    .insert([labelData])
    .select()
    .single();
    
  if (error) {
    console.error('Error adding node label:', error);
    throw error;
  }
  
  return data;
};

// Remove a label from a node
export const removeNodeLabel = async (projectId: string, nodeId: string, label: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { error } = await supabase
    .from('node_labels')
    .delete()
    .eq('project_id', projectId)
    .eq('node_id', nodeId)
    .eq('label', label);
    
  if (error) {
    console.error('Error removing node label:', error);
    throw error;
  }
};

// Set all labels for a node (replace existing labels)
export const setNodeLabels = async (projectId: string, nodeId: string, nodeType: 'table' | 'dashboard', labels: string[]): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  // Start a transaction to ensure consistency
  const { error: deleteError } = await supabase
    .from('node_labels')
    .delete()
    .eq('project_id', projectId)
    .eq('node_id', nodeId);
    
  if (deleteError) {
    console.error('Error removing existing labels:', deleteError);
    throw deleteError;
  }
  
  // Insert new labels if any
  if (labels.length > 0) {
    const labelData = labels.map(label => ({
      project_id: projectId,
      node_id: nodeId,
      node_type: nodeType,
      label
    }));
    
    const { error: insertError } = await supabase
      .from('node_labels')
      .insert(labelData);
      
    if (insertError) {
      console.error('Error adding new labels:', insertError);
      throw insertError;
    }
  }
};

// Get labels for connected nodes (upstream/downstream)
export const getConnectedNodeLabels = async (
  projectId: string, 
  connectedNodeIds: string[]
): Promise<Map<string, string[]>> => {
  if (!supabase || connectedNodeIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('node_labels')
    .select('*')
    .eq('project_id', projectId)
    .in('node_id', connectedNodeIds);
    
  if (error) {
    console.error('Error fetching connected node labels:', error);
    return new Map();
  }
  
  // Group labels by node_id
  const nodeLabelsMap = new Map<string, string[]>();
  data?.forEach((label: NodeLabel) => {
    const existingLabels = nodeLabelsMap.get(label.node_id) || [];
    existingLabels.push(label.label);
    nodeLabelsMap.set(label.node_id, existingLabels);
  });
  
  return nodeLabelsMap;
};

// Clear all labels for a project (useful for project cleanup)
export const clearProjectLabels = async (projectId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized');
  
  const { error } = await supabase
    .from('node_labels')
    .delete()
    .eq('project_id', projectId);
    
  if (error) {
    console.error('Error clearing project labels:', error);
    throw error;
  }
};