import { supabase, isSupabaseEnabled } from './supabase';
import { Column, CreateColumnRequest, UpdateColumnRequest } from '../types';

/**
 * Fetch all columns for a specific table
 */
export const getTableColumns = async (tableId: string): Promise<Column[]> => {
  if (!isSupabaseEnabled) {
    console.warn('Supabase is not enabled');
    return [];
  }

  try {
    const { data, error } = await supabase!
      .from('table_columns')
      .select('*')
      .eq('table_id', tableId)
      .order('column_name');

    if (error) {
      console.error('Error fetching table columns:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching table columns:', error);
    return [];
  }
};

/**
 * Create a new column for a table
 */
export const createColumn = async (columnData: CreateColumnRequest): Promise<Column | null> => {
  if (!isSupabaseEnabled) {
    throw new Error('Supabase is not enabled');
  }

  try {
    const { data, error } = await supabase!
      .from('table_columns')
      .insert([columnData])
      .select()
      .single();

    if (error) {
      console.error('Error creating column:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating column:', error);
    throw error;
  }
};

/**
 * Update an existing column
 */
export const updateColumn = async (columnId: string, updates: UpdateColumnRequest): Promise<Column | null> => {
  if (!isSupabaseEnabled) {
    throw new Error('Supabase is not enabled');
  }

  try {
    const { data, error } = await supabase!
      .from('table_columns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', columnId)
      .select()
      .single();

    if (error) {
      console.error('Error updating column:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating column:', error);
    throw error;
  }
};

/**
 * Delete a column
 */
export const deleteColumn = async (columnId: string): Promise<boolean> => {
  if (!isSupabaseEnabled) {
    throw new Error('Supabase is not enabled');
  }

  try {
    const { error } = await supabase!
      .from('table_columns')
      .delete()
      .eq('id', columnId);

    if (error) {
      console.error('Error deleting column:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting column:', error);
    throw error;
  }
};

/**
 * Bulk create columns for a table
 */
export const createBulkColumns = async (columns: CreateColumnRequest[]): Promise<Column[]> => {
  if (!isSupabaseEnabled) {
    throw new Error('Supabase is not enabled');
  }

  try {
    const { data, error } = await supabase!
      .from('table_columns')
      .insert(columns)
      .select();

    if (error) {
      console.error('Error creating bulk columns:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error creating bulk columns:', error);
    throw error;
  }
};

/**
 * Get column count for a table
 */
export const getColumnCount = async (tableId: string): Promise<number> => {
  if (!isSupabaseEnabled) {
    return 0;
  }

  try {
    const { count, error } = await supabase!
      .from('table_columns')
      .select('*', { count: 'exact', head: true })
      .eq('table_id', tableId);

    if (error) {
      console.error('Error getting column count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting column count:', error);
    return 0;
  }
};