import { localBackend } from './local';
import { createSupabaseBackend } from './supabase';
import type { Backend } from './types';
import { cleanKey, cleanSupabaseUrl } from './url';

export * from './types';

/**
 * Live sync turns on when both values are set (in a .env file, see README):
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 * Without them the app runs in demo mode (everything on this device).
 */
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const url = cleanSupabaseUrl(rawUrl);
const key = cleanKey(rawKey);

export const backend: Backend = url && key ? createSupabaseBackend(url, key) : localBackend;
export const isDemoMode = backend.mode === 'local';
/** Keys were provided but the URL couldn't be used, so the app fell back to demo mode. */
export const syncConfigProblem: string | null =
  isDemoMode && (rawUrl || rawKey)
    ? !url
      ? 'check the Supabase URL'
      : 'check the Supabase key'
    : null;
