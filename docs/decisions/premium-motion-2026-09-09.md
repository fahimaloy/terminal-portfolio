# Premium Motion & Icon System — Decision Record (2026-09-09)

> Plan: `.hermes/plans/2026-09-09_004415-premium-motion-graphics-icon-system.md`
> Branch: `newui` → `premium-motion-graphics-icon-system`

## Decisions

### 1. Tokens — aurora + ring families (Phase A)

- Added to `src/styles/tokens.css` (sole source of truth):
  - `--aurora-1..4` — large blurred radial washes `rgba(cyan/magenta/yellow/green, 0.05–0.08)`, blur 40–80px, opacity 0.06–0.12. Used for `Background` + `404` + `blog/[slug]` cover wash.
  - `--ring-*` aliases (`yellow/magenta/cyan/green/purple/blue/red`) → `var(--neon-*)` for `createDrawable` strokes.
  - `--hairline` / `--hairline-strong` → `var(--border-subtle/strong)` for `HairlineDivider`/`Bracket`.
- No change to `src/config/generated/*` or `tailwind.tokens.generated.js` — `scripts/generate-tokens.mjs` only code-gen's `neon/glow/dur/ease/bg/text/glass/spring/font` (intentional). `--check` stays green; no raw hex/rgba drift.

### 2. Graphics primitives (`src/components/ui/graphics/`)

- `primitives/{HairlineDivider,MorphOrb,AuroraMesh,Bracket}` — static SVGs first, token-only `var(--*)` (fill `var(--glow-*-zone)` or `var(--aurora-1)`, stroke `var(--hairline)`), `data-graphic="grat-stroke|grat-fill|grat-orb"` selectors for anime scopes.
- `compositions/{HeroEmptyGraphic,BlogEmptyGraphic,NotFoundGraphic}` — hero wireframe terminal + blog stacked-cards/search + 404 orb/bracket, each with idle `createDrawable` loop gated by `isReducedMotion()||!canAnimate()`, `durations.*`/`easings.*` only.

### 3. Boot timing (Task 3)

- `TOTAL_MS = 820` (< 900 ms budget), `SKIPPABLE_AFTER_MS = 150`. Phases via `createTimeline` labels `emblem(0) → wordmark(90) → rule(220) → status(310) → hold/exit(520)` + `spring(soft)` scale/opacity exit + 5-dot confetti `spring(bouncy)` burst. Guardrails preserved: `STORAGE_KEY='cyberpunk-boot-shown'`, sessionStorage skip, click/key skip, `role="status"`/`aria-live`, reduced-motion → 120 ms static timeout.

### 4. Background (Task 4)

- `AuroraMesh`-inspired inline blobs + optional `variant?: 'default'|'hero'|'blog'` (hero denser `~0.12`, blog `~0.06`; default unchanged). Preserved `createDrawable` + `morphTo` per-shape `onScroll({sync:true})` scrub (single scroll-scrub per page budget). Softened `TronGrid` `0.4→0.22` and `ParticleField` `4→3` blobs for hero legibility. One `onScroll sync:true` listener kept (Background morph) — no additional `onScroll sync:true` added elsewhere.

### 5. Hero / Home / Chat (Tasks 5–7)

- `HeroSection`: `splitText(chars+clip)` on name/title → `stagger(18–20, from first/center)`, `HairlineDivider` `createDrawable ['0 0','0 1']`, stats/bio/cta/cards `spring(soft)` stagger; `createDraggable` left as optional gated comment (data unchanged, `QUICK_CARDS` intact).
- `Homepage` + `HeroChat`: `HeroEmptyGraphic` when `isInitial && !isDataLoading`, crossfade via `createScope`/`createTimeline`, skeleton `StatBar` hides before graphic in, idle `createDrawable` pulse gated.
- `ChatInputBar` focus glow `spring(soft)` + send press `spring(hard|bouncy)`, `ChatStream` `stagger(34)` y/opacity on `messages.length`, `MessageOverlay` chips `stagger(34)` + hover `scale 1.02 blend` — all `isReducedMotion||!canAnimate` guarded, `scope.revert()` cleanup.

### 6. Blog (Tasks 8–9)

- `BlogEmptyGraphic` `variant empty|no-results` (`magenta` vs `cyan`), splitText headline `stagger(18)` + graphic/cta `createTimeline` in `blog/index.tsx`; card chrome `HairlineDivider` top + `MorphOrb size 48 @12%` accent cycle `yellow/magenta/cyan/green/purple/blue` in `BlogCard`; `BlogSearch` chips `stagger(30)` + input focus `spring(cyan)` glow.
- `blog/[slug].tsx`: splitText title chars `112%→0%` `stagger(20)`, meta `HairlineDivider` `createDrawable`, aurora wash `var(--aurora-1..3)` blur 48–64px, parallax cover `scrollY*0.18`, `LightningTransition`/`ReadingProgress` preserved (SSR `getServerSideProps` untouched).

### 7. 404 (Task 10)

- `NotFoundGraphic` (aurora washes + `MorphOrb magenta 220 + cyan 148` + `Bracket notfound-bracket`). `404.tsx`: `splitText` cascades for `404/SIGNAL_LOST/NOT_FOUND`, `scrambleText` for long subtitle (guarded; fallback interval retained), `Bracket` drawable frame `draw ['0 0','0 1']`, particles `20→12`, `HudPanel`/`NeonButton` preserved.

### 8. Icon system (Tasks 11–13)

- `src/lib/techIcons.ts` — ~100 `Si*` from `react-icons/si` (already installed `4.3.1`), `TECH_ICONS: {id,label,aliases,icon,hex,category}[]`, `resolveTechIcon(slug)` case-insensitive id/alias, `allTechIconIds`/`techIconCategories`/`TECH_ICONS_BY_CATEGORY`. Brand hex kept runtime (`// token-lint-ignore` per-line), `token-lint --all` clean. No new dep (`simple-icons` not installed); `react-icons/si` named imports tree-shake (not `import *`). Prefix avoids collision: `si:react` vs lucide `Code`.
- `IconPicker.tsx` v2 — tabs `general|stack`, unified search (lucide name + tech id/label/aliases), recents `localStorage icon-picker-recent` (8), `mode?: 'lucide'|'tech'|'all'` + `showColor`, `si:` preview with `SiComponent` brand vs mono `var(--fg-1)`, `value: string|null` contract preserved (backward-compat `Code`).
- `SearchableMultiSelect.tsx` — `resolveTechIcon(label)` fallback when `opt.icon` falsy, 12px `hex` at 0.85–0.9 opacity, `showTechIcons?` default true, null-safe.

### 9. Reduced-motion & budget

- Every `animate/createTimeline/splitText/createDrawable/scrambleText/morphTo` path gated by `isReducedMotion()||!canAnimate()` with reduced branch `opacity/y` no-draw/no-split. Verified: 40+ guards, single `onScroll({sync:true})` in `Background` only, idle drawables `loop:true alternate:true` at low `durations.pulse` and paused off-screen via `canAnimate`. Both `npm run verify` (lint+typecheck+test+tokens:check) and `npm run build` green.

## Verification

```
npm run typecheck                → 0
node scripts/generate-tokens.mjs --check → OK
node scripts/token-lint.mjs --all       → 175 files, 0 violations
npm run lint                     → warnings only (prettier in techIcons.ts)
npm test                         → 11 suites, 55 tests passed
npm run verify                   → 0
npm run build                    → 19 pages, Compiled successfully
```

## Out of scope

- Admin shells `sudosuperuser-ostaad/**`, `api/**`, `supabase/`, `install/supabase/*.sql`, `aiService/aiResponseParser/intentDetection`, `src/utils/api.ts:945-1014` — untouched per AGENTS.md.
