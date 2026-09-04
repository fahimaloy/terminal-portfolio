import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// New Supabase Cloud publishable key first, legacy anon key as transition fallback.
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseProjectRef =
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_NAME;

function resolveStorageKey(url: string | undefined, projectRef: string | undefined): string {
  const fromUrl = url?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];
  if (fromUrl) return `sb-${fromUrl}-auth-token`;
  if (projectRef) return `sb-${projectRef}-auth-token`;
  return 'sb-portfolio-auth-token';
}

function warnDevOnly(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message, ...args);
  }
}

let _supabase: SupabaseClient | null = null;
let warnedMissing = false;

if (supabaseUrl && supabasePublishableKey) {
  try {
    _supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: resolveStorageKey(supabaseUrl, supabaseProjectRef),
        lock: async <R>(
          _name: string,
          _acquireTimeout: number,
          fn: () => Promise<R>,
        ): Promise<R> => {
          return await fn();
        },
      },
    });
  } catch (e) {
    warnDevOnly('[supabase] Failed to create client:', e);
    _supabase = null;
  }
} else if (!warnedMissing) {
  warnedMissing = true;
  warnDevOnly(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (legacy NEXT_PUBLIC_SUPABASE_ANON_KEY also unset) — client not created. Data fetches will return empty.',
  );
}

export const supabase = _supabase;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && supabasePublishableKey && _supabase,
);

export const hasSupabaseConfig = (): boolean =>
  Boolean(supabaseUrl && supabasePublishableKey && _supabase);

export function getSupabaseClientOrNull(): SupabaseClient | null {
  return _supabase;
}
