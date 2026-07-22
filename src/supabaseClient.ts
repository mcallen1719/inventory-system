/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export let supabase: SupabaseClient | null = null;

export function initSupabase(url: string, anonKey: string) {
  if (url && anonKey) {
    supabase = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
}

// Try build-time environment variables first (Vite will statically replace these if defined during build)
const BUILD_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const BUILD_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (BUILD_SUPABASE_URL && BUILD_SUPABASE_ANON_KEY) {
  initSupabase(BUILD_SUPABASE_URL, BUILD_SUPABASE_ANON_KEY);
}

export const isSupabaseEnabled = (): boolean => supabase !== null;

