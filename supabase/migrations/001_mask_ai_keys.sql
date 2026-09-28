-- ============================================================================
-- DRAFT MIGRATION — DO NOT APPLY without human DBA review
-- File: supabase/migrations/001_mask_ai_keys.sql
--
-- Purpose:
--   Mask plaintext api_key values on AI provider reads. The admin API
--   (api/admin/ai index select('*')) currently leaks full api_key values
--   to any caller with read access. This migration adds a masking VIEW so
--   the app layer can switch reads to the view instead of the base table.
--
-- Risk:
--   LOW (additive only). Creates a view + column comment. Does NOT alter,
--   drop, or rewrite any existing table, column, policy, or data.
--   The view name may collide if a view with the same name already exists
--   (CREATE OR REPLACE handles that, but review the prior definition first).
--   Masking is cosmetic in SQL only — full keys remain in the base table
--   until a proper secrets-manager / vault rotation is done separately.
--
-- Human review checklist before apply:
--   1. Columns verified against the real table: ai_providers has
--      (id, name, provider_type, identifier_slug, api_key, base_url,
--      is_active, created_at, updated_at). There are NO provider/model
--      columns — do not re-add them.
--   2. Confirm no existing object named masked_ai_providers would be
--      clobbered unintentionally.
--   3. Apply in a transaction on staging first; verify SELECT from view
--      never returns the raw api_key column.
--   4. Separate reviewed PR required: switch app-layer reads to this view
--      (admin list/show routes) and keep writes on the base table via
--      service-role only.
--   5. NOTE: the anon base-table SELECT policy on ai_providers must be
--      restricted in a separate DBA migration/PR — this view alone does
--      not revoke direct SELECT on ai_providers.api_key.
-- ============================================================================

-- Document the sensitivity of the stored key. Comment is metadata only.
COMMENT ON COLUMN public.ai_providers.api_key IS
'DRAFT: sensitive secret stored plaintext. Reads should go through masked_ai_providers view. Plan vault migration + rotation.';

-- Masked read surface. Mirrors the real ai_providers columns and exposes
-- ONLY api_key_masked — the raw api_key column is never in the view.
-- security_invoker=true: the view runs with the caller's RLS/permissions,
-- not the view owner's, so base-table RLS still applies.
CREATE OR REPLACE VIEW public.masked_ai_providers WITH (security_invoker = true) AS
SELECT
  id,
  name,
  provider_type,
  identifier_slug,
  base_url,
  is_active,
  created_at,
  updated_at,
  CASE
    WHEN api_key IS NULL THEN NULL
    WHEN length(api_key) < 8 THEN '****'
    ELSE substr(api_key, 1, 4) || '****' || substr(api_key, length(api_key) - 3, 4)
  END AS api_key_masked
FROM public.ai_providers;

COMMENT ON VIEW public.masked_ai_providers IS
'DRAFT: masked read surface for ai_providers.api_key (raw key never exposed). App layer must switch list/show reads to this view; anon base-table SELECT policy must be restricted in a separate DBA migration/PR.';
