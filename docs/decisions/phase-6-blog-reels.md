# Phase 6 — Blog Reels Redesign: Pre-Implementation Decisions

> Required by Phase 0 guardrail (resolve `blog_posts` DDL source before any schema change)
> and Phase 6 spec (state filter/search disposition before implementing).

## 1. Schema / migration source — where `blog_posts` DDL lives (Open Question #1)

**Finding:** `blog_posts` table is **hosted-only** — there is no `CREATE TABLE blog_posts` committed in the repo.

- `install/supabase/schema.sql` (424L), `ai_schema.sql` (121L), `experiences_schema.sql` (56L) contain no `blog_posts` reference.
- `supabase/` is only `.temp/` + `.gitignore`; no `migrations/` or `config.toml`.
- No `src/types/supabase.ts` generated types.
- Inferred schema: `src/types/blog.ts:12-35` + `src/pages/api/blogs/index.ts:5-6` `LIST_COLUMNS` + admin payloads at `src/pages/api/admin/blogs/index.ts:72-91` (insert) and `src/pages/api/admin/blogs/[id].ts:108-126` (update), all via `supabaseAdmin` (service_role). Public reads filter `status='published'` (`api/blogs/index.ts:61`).

**Decision: No reels-specific column will be added in this phase** (e.g. no `teaser` / `reels_excerpt`). The existing `excerpt` field will be used for the full-bleed card chrome and the expanded-post header. Rationale: adding a column without a committed migration would create hosted-vs-repo drift — exactly the class of drift Phase 0 asks to prevent. If a separate short teaser is wanted later, it will be proposed as a new migration file in `install/supabase/` for review, not as an in-place `ALTER TABLE` guess.

## 2. Paginated grid + SSR single-post → scroll-snap reels

- **Container:** `CSS scroll-snap-type: y mandatory` rendering near-full-viewport cards (`h-[100dvh]` with header offset). SSR-hydrated with an initial buffer; **no route swap per swipe** (avoids visible latency).
- **Buffer sizing:** Initial buffer `5` via `getBlogPosts({ pageSize: 5 })` (replaces grid `PAGE_SIZE=9`). Lazy-append next batch (`page+1`) when the user is within 2 cards of buffer end. Uses existing `getBlogPosts` pagination (`page`, `search`, `tag`, `sort`, `pageSize`); `hasMore` gates further fetches.
- **Why 5 not 9:** Reels shows 1 card at a time; 5 gives ~4 swipes before a fetch and keeps initial payload small for fast FCP. `hasMore` already returned by `BlogListResponse`; no API contract change.
- **Existing `/blog/[slug]` SSR route is preserved** for deep links, SEO, and sharing (`getServerSideProps` at `src/pages/blog/[slug].tsx:276`). Reels expanded view is an **in-place overlay** inside the snap container (via `RichTextRenderer`) — it does not `router.push` per card. A “Permalink / share” affordance copies `canonical_url` / `/blog/[slug]` instead.

## 3. Animation + content primitives — reuse, not rebuild

- `BlogCard` (already `Tilt3D + HudPanel`) → scaled to near-fullscreen card chrome (pass `reels` prop to toggle chrome layout vs grid layout; no new card component).
- `LightningTransition` → per-card enter/exit (replaces route change; driven by `onSnapIndexChange` + `isReducedMotion` guard).
- `ReadingProgress` → adapted into reels pager/progress indicator (vertical dots + linear progress; existing `targetRef` → snap container ref).
- `RichTextRenderer` (DOMPurify-sanitized) → expanded-post content view inside the active card.

animates via `src/config/animations.ts` tokens + respects `isReducedMotion()`/`canAnimate()`.

## 4. Tag filtering & search — where they live in reels mode

**Options considered:**

- **A) Separate list view** (reels vs grid toggle, two routes) — preserves existing controls verbatim but fragments experience and duplicates layout/SEO.
- **B) Filter drawer inside reels** — single route; controls slide in as an overlay drawer without leaving snap context.

**Decision: B — a reels-mode filter drawer.** Rationale:

- Keeps reels immersive (one continuous snap, no route churn) while preserving every existing capability: `search` (debounced at `src/components/blog/BlogSearch.tsx:33-37`), `tag` (chip filter), `sort` (`recent`/`popular`), `resultCount`.
- No silent feature drop: `BlogSearch` controls are re-hosted inside a `HudPanel` drawer triggered by a `FILTER` affordance; empty-state and result count remain visible.
- Lower routing surface: no new `/blog/list` route to index, no divergence between grid and reels data fetching.
- Drawer state is local to `/blog` (no URL churn per swipe); `page` still resets to `1` on `search`/`tag`/`sort` change (existing invariant at `src/pages/blog/index.tsx:26-28` preserved). Pagination appends rather than replacing.

Drawer placement: top-right `FILTER` `NeonButton` → `HudPanel` drawer (same vocabulary as `ai/models.tsx` clip-notch pattern). On mobile, drawer is full-width bottom sheet.

## 5. Image bottleneck — data-fetching first, animation second

- **Preload/decode next card’s cover** before its snap completes: on buffer append and on `activeIndex` change, create `new Image()` for `items[activeIndex+1]?.cover_image_url` and await `img.decode()` (guarded; fallback to `onload`). This is implemented as a hook before tuning any transition timing, as the spec requires.
- Uses existing `cover_image_url` field; no new column. `next/image` already used in `BlogCard.tsx:48-53` with `width=400 height=225` will benefit from browser cache primed by the preload `Image` instance (same URL).

## 6. `prefers-reduced-motion` fallback

Full fallback: **static stacked cards with normal scroll** instead of `scroll-snap-type: y mandatory` + `LightningTransition`. Implemented as `if (isReducedMotion()) return <StackedBlogList ...>` branch that renders the same `items` as a plain vertical list (no snap, no bolts) with native scroll. `ReadingProgress` still renders as a static progress bar. Extra `@media (prefers-reduced-motion: reduce)` CSS ensures any remaining durations collapse (already present at `src/styles/tokens.css:244-263`).

## 7. Out of scope / deferred

- Short `teaser` column (requires committed migration — deferred per §1).
- Any changes under `src/pages/api/**`, `src/utils/aiService.ts`, `aiResponseParser.ts`, `intentDetection.ts`, `src/utils/api.ts:945-1014`, `supabase/` or `install/supabase/` — untouched.
- No new npm dependency; reuse existing `animejs@4.5.0` + `next/image`.

## 8. Verification before merge (Phase 6 gate)

- `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` green.
- `npm run tokens:check` (`generate-tokens --check` + `token-lint --all`) green — no new raw hex/rgba or ad-hoc duration/ease.
- Manual: reduce-motion stacked mode, drawer filter+search round-trip, buffer append at end, image preload avoids flash, LightningTransition drives enter/exit not route change.

## 9. Commit plan

- `feat(blog): reels snap container + drawer + reduced-motion fallback` (this phase, single PR).
- Future (if desired): `chore(supabase): add blog_posts teaser column migration` — separate human-reviewed migration file; not bundled with reels.

— Recorded before any Phase 6 patch per AGENTS.md Data-layer contract & Phase 0 guardrail.

## 10. Numbering note — Phase 2 label gap on `newui`

`git log newui ^main` shows `bcceb44 (Phase 1) → 26af3c2 (Phase 3)` with no
commit labelled Phase 2. This is a label gap only, not missing work:
the original `c4ca123 docs(plan): cyberpunk gaming UI redesign, 31 tasks
across 4 phases` plan already used Phase 2 for "Public surface" (later
landed across the large `3ab29…`/`7d4c67…`/`91fbfa…`/`b4ff60…` refactor
stack before `bcceb44`), while the post-`bcceb44` sequence re-numbered
fresh from Phase 1. No docs rewrite or history rewrite is warranted for
this cosmetic numbering gap; the `newui` head (`0d6e246`) is 6 commits
ahead with Phases 1, 3–6 represented.
