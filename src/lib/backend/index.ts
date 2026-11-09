import { localBackend } from './local';
import { createSupabaseBackend } from './supabase';
import type { Backend } from './types';

export * from './types';

/**
 * Live sync turns on when both values are set (in a .env file, see README):
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * Without them the app runs in demo mode (everything on this device).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const backend: Backend = url && key ? createSupabaseBackend(url, key) : localBackend;
export const isDemoMode = backend.mode === 'local';
