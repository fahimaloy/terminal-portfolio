-- ============================================================================
-- DRAFT MIGRATION — DO NOT APPLY without human DBA review
-- File: supabase/migrations/003_reorder_experiences.sql
--
-- Purpose:
--   Atomic reorder for experiences. Admin drag-reorder currently issues N
--   separate updates (one per row), leaving partial order on failure and
--   racing concurrent editors. This migration adds a single-statement,
--   set-based reorder function: one UPDATE driven by array position
--   (1-based sort_order via WITH ORDINALITY), fully atomic.
--
-- Risk:
--   MEDIUM (write path). Function itself is additive and does NOT alter
--   schema, but once the app calls it, a bad id list determines row order.
--   Unknown ids match no rows (ignored); ids missing from the array keep
--   their old sort_order, which can leave duplicates/gaps — the caller
--   must always pass the COMPLETE ordered id list.
--
-- Human review checklist before apply:
--   1. Verified: experiences.id is bigint, sort_order integer exists.
--      The old draft used integer[] — OR REPLACE cannot change the
--      argument type, hence the DROP ... IF EXISTS preamble below.
--   2. Set-based single UPDATE (no row-by-row loop): atomic, no partial
--      order on failure.
--   3. Privileges locked down below: EXECUTE to service_role only,
--      explicitly revoked from anon and PUBLIC.
--   4. Separate reviewed PR required: admin drag-reorder must call
--      supabaseAdmin.rpc('reorder_experiences', { p_ids: orderedIds })
--      instead of N updates, passing the full ordered list (bigint[]).
-- ============================================================================

-- Preamble: OR REPLACE cannot change integer[] -> bigint[], so drop the
-- old-signature function first (no-op if it was never applied).
DROP FUNCTION IF EXISTS public.reorder_experiences(integer[]);

CREATE OR REPLACE FUNCTION public.reorder_experiences(p_ids bigint[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Single atomic statement: array position (1-based) becomes sort_order.
  UPDATE public.experiences e
  SET sort_order = o.pos
  FROM unnest(p_ids) WITH ORDINALITY AS o(id, pos)
  WHERE e.id = o.id;
END;
$$;

COMMENT ON FUNCTION public.reorder_experiences(bigint[]) IS
'DRAFT: atomic set-based drag-reorder for experiences. Caller must pass COMPLETE ordered id array (bigint[]); unknown ids ignored, omitted ids keep old sort_order. Admin must call via rpc instead of N updates (separate reviewed PR).';

-- Least privilege: only the service role (via the admin API route) may
-- execute the reorder; direct client roles are explicitly denied.
GRANT EXECUTE ON FUNCTION public.reorder_experiences(bigint[]) TO service_role;
REVOKE ALL ON FUNCTION public.reorder_experiences(bigint[]) FROM anon, PUBLIC;
