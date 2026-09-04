import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Server key priority: SUPABASE_SECRET_KEY > NEXT_PUBLIC_SUPABASE_SECRET_KEY > legacy SUPABASE_SERVICE_ROLE_KEY.
const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const usingExposedPublicSecret =
  !process.env.SUPABASE_SECRET_KEY &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY) &&
  Boolean(supabaseServerKey);

if (usingExposedPublicSecret && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[supabaseAdmin] Using NEXT_PUBLIC_SUPABASE_SECRET_KEY — this exposes the secret key to the browser. Prefer server-only SUPABASE_SECRET_KEY.',
  );
}

export const supabaseAdmin =
  supabaseUrl && supabaseServerKey
    ? createClient(supabaseUrl, supabaseServerKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;
