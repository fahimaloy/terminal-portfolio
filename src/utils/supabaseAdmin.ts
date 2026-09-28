import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client.
 *
 * SECURITY: the key is read from a server-only variable and never from a
 * `NEXT_PUBLIC_*` one. Next statically inlines every `NEXT_PUBLIC_*`
 * reference into the browser bundle at build time, so a secret read from that
 * namespace ships in the page's JavaScript. A previous version accepted
 * `NEXT_PUBLIC_SUPABASE_SECRET_KEY` as a fallback and only logged a warning —
 * and only outside production, which is the one place it mattered.
 *
 * If you are migrating from the old name, set `SUPABASE_SECRET_KEY` in the
 * server environment. Do not restore the `NEXT_PUBLIC_` fallback.
 *
 * This module is imported by API routes and by `getServerSideProps` bodies
 * only. It must never be imported by a component or by the top level of a
 * page module — top-level page imports land in the client graph.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && supabaseServerKey
    ? createClient(supabaseUrl, supabaseServerKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;
