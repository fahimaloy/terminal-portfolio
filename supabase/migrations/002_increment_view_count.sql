-- ============================================================================
-- DRAFT MIGRATION — DO NOT APPLY without human DBA review
-- File: supabase/migrations/002_increment_view_count.sql
--
-- Purpose:
--   Fix lost-update on blog view_count. The current read-modify-write
--   increment (read count, +1 client-side, void update) drops concurrent
--   views. This migration adds a single-statement atomic increment
--   function so each call is exactly one row-level atomic UPDATE.
--
-- Risk:
--   LOW (additive only). Creates one SQL-language function. Does NOT alter
--   blog_posts schema, data, or policies. Concurrent callers serialize on
--   the row lock, so throughput is bounded by row contention — fine for
--   blog view traffic, not for hot counters.
--
-- Human review checklist before apply:
--   1. Verified: blog_posts(slug, view_count) exists.
--   2. No GRANTs issued here by design — service-role-via-API only.
--      The API route calls this via supabaseAdmin (service role), so no
--      EXECUTE grant to anon/authenticated is needed or wanted.
--   3. Separate reviewed PR required: API route must call
--      supabaseAdmin.rpc('increment_view_count', { p_slug: slug })
--      instead of the current void update.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_view_count(p_slug text)
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.blog_posts
  SET view_count = coalesce(view_count, 0) + 1
  WHERE slug = p_slug
  RETURNING view_count;
$$;

COMMENT ON FUNCTION public.increment_view_count(text) IS
'DRAFT: atomic blog view counter. p_slug param avoids slug=slug ambiguity. API route must call supabaseAdmin.rpc instead of void update (separate reviewed PR). No GRANTs: service-role-via-API only. Returns new view_count, or no row if slug not found.';
