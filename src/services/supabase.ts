import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or API key not found. Column management features will be disabled.');
  console.warn('Expected env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON');
} else {
  console.log('Supabase configured successfully:', { url: supabaseUrl, hasKey: !!supabaseAnonKey });
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseEnabled = !!supabase;