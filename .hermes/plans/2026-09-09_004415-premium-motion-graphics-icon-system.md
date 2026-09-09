# Premium Motion, Graphics & Icon System — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Deliver a premium, colorful, highly interactive public surface — complex SVG graphics, anime.js v4 scope/timeline/stagger/spring/drawable/morph/splitText/draggable/onScroll treatments for BootSequence, hero/chat empty-state, blog list/detail/empty, and 404 — plus an upgraded IconPicker covering Lucide generics plus 3200+ tech-stack icons (Simple Icons) for Admin Projects/Skills CRUD.

**Architecture:** Keep `src/styles/tokens.css` as single source of truth; derived files (`tailwind.tokens.generated.js`, `src/config/generated/tokens.generated.ts`) are generated via `scripts/generate-tokens.mjs`. All motion via `animejs@4.5.0` with `createScope` per root, `createTimeline` for sequences, `stagger`/`spring`/`createDrawable`/`svg.morphTo`/`splitText`/`createDraggable`/`onScroll` where appropriate, gated by `isReducedMotion()`/`canAnimate()`. SVG work lives in `src/components/ui/graphics/` as composable layers (no inline dumps in page files). Icon system lives in `src/components/ui/IconPicker.tsx` v2 + `src/lib/techIcons.ts` registry.

**Tech Stack:** Next 12.1.6 Pages Router, React 18.1, animejs 4.5.0, Tailwind 3.0.24, lucide-react 1.23, react-icons 4.3.1, Simple Icons (new, `simple-icons` npm or `react-icons/si` path), TypeScript 4.6.

---

## 0. Research Summary (what the agent already verified)

### anime.js v4 API surface (installed `animejs@4.5.0`, `Object.keys(require('animejs'))`)

```
Timer, createTimer, JSAnimation, animate, Timeline, createTimeline,
Animatable, createAnimatable, Draggable, createDraggable, Scope, createScope,
ScrollObserver, onScroll, engine, easings, AutoLayout, createLayout, utils,
svg, text, WAAPIAnimation, waapi, globals, cubicBezier, steps, linear,
irregular, Spring, createSpring, spring, eases, stagger, createMotionPath,
createDrawable, morphTo, TextSplitter, split, splitText, scrambleText
```

- **createScope / scope.add / scope.revert:** Mandatory per-component root. Media queries `reduceMotion` + defaults `duration/ease`. Already canonical in `Background.tsx`, `HeroSection.tsx`, `SkillGrid.tsx`, etc.
- **createTimeline:** Ordered sequences with label offsets and `tl.add(target, props, position)` — canonical in `BootSequence.tsx`, `HeroSection.tsx`, `LightingTransition.tsx`.
- **stagger / stagger(value, {from, grid, start}):** Values staggering and timeline-position staggering (`animejs.com/documentation/utilities/stagger/timeline-positions-staggering`). Current use: `stagger(70)`, `stagger(60, {from:'first'})`, `stagger(120, {grid:[cols,rows],from:'center'})`.
- **spring():** `createSpring({stiffness, damping, mass})` → easing fn; also `spring()` factory. Tokens map `--spring-*` in `tokens.css` and `springs.*` in `config/animations.ts`. Used in `useDraggableCard.ts`, `ProjectDetailModal`.
- **onScroll({sync, enter, leave, ...}):** Scroll-driven autoplay — `autoplay: onScroll({sync:true})` in `Background.tsx` (morph scrub) and `ProjectGrid.tsx` (`enter:'bottom-=50 top'` + staggered grid).
- **createDrawable / svg.morphTo:** Drawable line-draw (`createDrawable(selector)` + `draw: ['0 0','0 1']`) and morph (`d: svg.morphTo(targetEl)`). Verified via `https://animejs.com/documentation/svg/morphto` — `svg.morphTo(shapeTarget, precision)` returns `[from,to]` strings for `d` or `points`. Background already uses both (`createDrawable` + `morphTo` via `autoplay:onScroll`).
- **splitText / TextSplitter / scrambleText:** New in 4.1.0 (`import {splitText} from 'animejs/text'` or `animejs`). `splitText(target, {words:{wrap:'clip'}, chars:true})` → `{words, chars, lines}`. Scramble path: `scrambleText`. Docs: `https://animejs.com/documentation/text/splittext`. Not yet used inline (current `GlitchText` is a y+opacity stagger, not `splitText`; `TypewriterText` is `stagger` over letters).
- **createDraggable / createAnimatable:** Untapped. Good for hero chat-strip and project strip drag/throw, parallax blobs, icon-picker preview.
- **Engine / WAAPI / utils:** Low-level — `utils.$`, `utils.set`, `utils.random`, `cleanInlineStyles` — for imperative sugar.

### Current UI baseline (warm editorial v3, just shipped `7aa1ff5`)

- **Tokens (`src/styles/tokens.css`):** Warm charcoal `bg-1 #252423`..`bg-4 #353432`, `fg-1 #f6f4f2`..`fg-4`, 7 accents `yellow #ffcc2a / magenta #e962bf / cyan #26f2d5 / green #8dff55 / red #ff4b4b / purple #a369ff / blue #4d9cff`, muted glows `22%/12%` + zone tints `4%`, `border-subtle #353432`, `glass-bg rgba(42,41,40,.72)`.
- **Generated:** `tailwind.tokens.generated.js` (7 neon + 21 glow + bg/text/glass) and `src/config/generated/tokens.generated.ts` (7 accents, 20 durations, 15 easings) — regenerated correctly in last commit.
- **Background.tsx (168L):** Radial washes + 3 `bg-morph-shape` paths + `TronGrid` + `ParticleField` + `ScanlineOverlay` + warm vignette. Motion: `createScope` + `createTimeline` + `createDrawable` + per-shape `morphTo(...)+onScroll(sync:true)`.
- **BootSequence.tsx (139L):** SessionStorage-guarded, 600ms fade, `isReducedMotion` → 120ms timeout, else `animate(inner {opacity, y})` + root fade-out. Minimal — **primary upgrade target**.
- **Home: `Homepage.tsx` (235L) + `HeroSection.tsx` (331L) + `HeroChat.tsx` (178L) + `ChatInputBar` + `ChatStream` + `ProjectStrip`:** Homepage orchestrates data+chat state, HUD clock, skeleton `StatBar`s. HeroSection does a single `createTimeline` stagger over `data-hero="label|name|title|bio|stats|cta|card"` with `y/opacity/scale`. No drawable, no splitText, no morph, no draggable.
- **Blog: `BlogReels.tsx`, `BlogCard.tsx`, `BlogSearch.tsx`, `LightningTransition.tsx`, `ReadingProgress.tsx`:** Reels uses scroll snap, `LightningTransition` wraps `createTimeline`. Static empty-state (text only).
- **404.tsx (239L):** Glitch 404 + scramble `setInterval` home-brew + 20 floating dots (CSS `animation: float`) + diagnostic panel — not using `splitText`/`scrambleText`/`createDrawable`.
- **IconPicker.tsx (110L) + SearchableMultiSelect / skills & projects CRUD:** IconPicker is **lucide-only** (filters `LucideIcons` object, 6-col grid, 48 max-height). Skills `slug/icon_key` is a lucide name. Projects `icon_key` unused visually, tags/languages are strings. Admin pages `projects.tsx` (large) and `skills.tsx` both `useStagger` lists, `NeonButton/HudPanel` chrome.

### Icon-pack research (web_search + web_extract)

| Pack                                                | Coverage                                                           | Style                                     | License / bundle note                                                                                                                                                                                                                                  | Best for                                                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Simple Icons** (`simpleicons.org`, 3200+ SVGs)    | Exhaustive brand/tech (React, TS, Python, Docker, AWS, Next, etc.) | Monochrome single-path, brand hex in JSON | CC0 for icons? Check per-icon; npm `simple-icons` ships JSON + SVG; tree-shaking is poor if naive `import *`. Recommended bridge: `react-icons/si` already in repo (re-exports Simple Icons as React components) or new `simple-icons` + local mapper. | Tech-stack CRUD — the missing piece. Current `react-icons@4.3.1` already bundles `Si*` (Simple Icons). No new dep strictly required; coverage check shows ~200 tech slugs available via `SiReact`, `SiTypescript`, etc. |
| **Tech Stack Icons** (`tech-stack-icons.com`, 700+) | Curated dev stack, lighter                                         | Colored or monochrome, copy-paste SVG     | MIT-ish; not an npm pack                                                                                                                                                                                                                               | Manual SVG pool, not searchable in picker unless we vendor                                                                                                                                                              |
| **Lucide `^1.23`**                                  | Generic UI (search, x, calendar, …)                                | Stroke, uniform                           | ISC                                                                                                                                                                                                                                                    | Generic picker — keep                                                                                                                                                                                                   |
| **Devicon**                                         | Tech colored + plain + original                                    | 3 variants per tech                       | MIT                                                                                                                                                                                                                                                    | Heavier, fewer brands than Simple Icons                                                                                                                                                                                 |

**Decision:** Do **not** add a new icon CDN dep. Reuse the **Simple Icons already reachable via `react-icons/si`** (already installed) plus keep Lucide. Build a small local registry `src/lib/techIcons.ts` that maps slug→`SiComponent` with brand color and aliases (`next.js`, `nextjs` → `SiNextdotjs`) so IconPicker v2 can present two tabs without extra bytes. If `simple-icons` npm is preferred over `react-icons/si`, install it — cost is identical, but `react-icons/si` keeps bundle smaller via tree-shaking of already-used family. Verify at implementation time with `node -e "console.log(require('react-icons/si').SiReact)"`.

---

## 1. Design Direction (premium modern, editorial warm + saturated motion)

### 1a. Color & shape system

- Keep warm charcoal base (`bg-1..bg-4` + `fg-1..fg-4`) — do not revert to neon void. Layer **saturated motion accents** on top instead: animated mesh aurora (cyan→magenta→yellow→green blur gradients), duotone grain blobs, and thin `createDrawable` strokes in accent hex. Add two new token families:
  - `--aurora-1..3` (large blurred radial meshes, opacity 0.06-0.12, blur 40-80px)
  - `--hairline: var(--border-subtle)` + `--hairline-strong: var(--border-strong)` already exist; add `--ring-*` aliases for glow rings (`ring-yellow` etc.) if needed for SVG strokes.
- Use per-section accent (yellow=hero, magenta=blog, cyan=projects, green=skills, blue=contact) consistent with `accentConfig` in `src/config/animations.ts`.

### 1b. Typography motion

- Adopt `splitText` (anime 4.1+) for all hero/empty/404 headings: clip-wrapped lines/words then `stagger` y/opacity. Keep reduced-motion fallback as static opacity-0→1.
- Use `scrambleText` (anime `text` export) for 404 subtitle already home-brewed today — replace manual `setInterval` char loop with the first-class util.

### 1c. Graphic style

- **Complex SVG illustrations** built as composable React components in `src/components/ui/graphics/`:
  - Strokes use `var(--border-subtle)` / `var(--fg-3)` / accent hex via CSS var (token-safe).
  - Fills use `var(--glow-*-zone)` washes or `var(--bg-3)` solids.
  - Each graphic exposes `data-graphic` selectors for its strokes/fills so anime scopes can target `'.grat-stroke'`, `'.grat-fill'`.
- Decorative system: thin geometric grids, isometric brackets, layered organic morph shapes (already in Background — extend), grain texture (subtle `ScanlineOverlay` already warm grain, keep), confetti burst on boot exit.

### 1d. Interaction vocabulary (anime.js mapping)

| Intent                 | Anime primitive                                      | Where                                                                     |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Letter/word cascade    | `splitText` + `stagger(from: first/last/center)`     | HeroSection name/title, boot wordmark, empty states, blog titles          |
| Line-draw & signature  | `createDrawable` + `animate(draw: ['0 0','0 1'])`    | BootSequence emblem, hero divider, chat/input toprule, blog card top rule |
| Shape morph on scroll  | `svg.morphTo` + `onScroll({sync:true})`              | Background morphs (existing), blog header orb, 404 orb                    |
| Physical release       | `spring({stiffness,damping})` via `springs.*`        | Boot exit, modal/detail reveal, button press, draggable throw             |
| Scroll-progress reveal | `onScroll` + `animate` with `enter:'bottom-=60 top'` | ProjectGrid cards, reels cards, experience timeline                       |
| Throw/drag             | `createDraggable`                                    | Hero quick-cards rail, ProjectStrip, Boot emblem drag hint                |
| Magnetic/tilt          | `createAnimatable` / `Tilt3D` spring                 | Hero quick-cards, hero CTA, chat send button                              |
| State scrub            | `Timeline` + `label` positions                       | BootSequence boot phases, chat stream entrance, blog detail expand        |

All animation values come from `src/config/animations.ts` (`durations.*`, `easings.*`, `springs.*`) which are generated from `tokens.css` — never hardcode ms/ease.

---

## 2. Scope (public pages only; admin excluded except IconPicker)

- **In-scope:**
  - `src/components/ui/BootSequence.tsx` — premium cinematic boot
  - `src/components/ui/Background.tsx` + `TronGrid.tsx` + `ParticleField.tsx` + `ScanlineOverlay.tsx` + `CursorGlow.tsx` — enhanced bottom layer (aurora mesh, refined grain, cursor follower spring)
  - `src/components/Homepage.tsx` / `src/components/home/HeroSection.tsx` / `HeroChat.tsx` / `ProjectStrip.tsx` / `ChatInputBar.tsx` / `ChatStream.tsx` / `HudChrome.tsx` — hero empty state, stats, quick-cards, chat modal/stream
  - `src/pages/404.tsx` — premium 404 illustration
  - `src/pages/blog/index.tsx` + `src/components/blog/*` (`BlogReels.tsx`, `BlogCard.tsx`, `BlogSearch.tsx`, `LightningTransition.tsx`, `ReadingProgress.tsx`) — reels grid, empty/search empty, detail header
  - New `src/components/ui/graphics/*` library
  - New `src/lib/techIcons.ts` + `src/components/ui/IconPicker.tsx` v2 (public consumption + admin CRUD use)
- **Out of scope (skip):** `src/pages/sudosuperuser-ostaad/**` page shells, `src/components/admin/**`, `src/pages/api/**` (except icon registry has no API). IconPicker v2 itself is used by admin but admin shells are not restyled.
- **Do-not-touch (per AGENTS.md):** `src/utils/aiService.ts`, `aiResponseParser.ts`, `intentDetection.ts`, `src/utils/api.ts:945-1014`, `supabase/`, `install/supabase/`.

---

## 3. Proposed Approach (ordered phases, incremental commits)

### Phase A — Tokens & motion foundation (no visual churn yet)

1. Add new token families in `src/styles/tokens.css` (aurora washes, ring/stroke aliases, extra pastel tints if needed). Run `npm run tokens:generate` and verify `tokens:check` + `tokens:check:strict` green before touching components.
2. Extend `src/config/animations.ts` if new springs/easings needed (most already exist — reuse). Ensure `durations`, `easings`, `springs` map correctly.
3. Introduce `src/components/ui/graphics/` index + primitive helpers (`Graticule`, `Bracket`, `MorphOrb`, `AuroraMesh`, `HairlineDivider`) — static SVGs first, no motion yet, so they can be reviewed visually.
4. Verify: `npm run tokens:check && npm run typecheck && npm test && npm run build` green.

### Phase B — Premium Boot/Splash screen

1. Redesign `BootSequence.tsx` as a short cinematic: wordmark via `splitText` (chars/words clip), emblem line-draw via `createDrawable`, phase notches, progress tick with `Timeline` labels (`emblem → wordmark → rule → status → exit`). Exit uses `spring(soft)` scale/opacity + confetti dot burst.
2. Keep existing guardrails: `sessionStorage STORAGE_KEY`, `SKIPPABLE_AFTER_MS`, `TOTAL_MS`, `isReducedMotion()` fallback (120ms timeout), click/key skip. New boot must still be < ~900ms on first visit.
3. Add reduced-motion branch: static wordmark, no drawable/morph/scramble, no confetti.

### Phase C — Home empty state (hero + chat landing)

1. Refine `Background.tsx` aurora mesh blobs (large blurred gradients in `--aurora-*`, `spring` drift) and soften `TronGrid`/`ParticleField` opacities to let hero breathe. Add optional `BackgroundVariant` prop for hero density vs blog density.
2. `HeroSection.tsx`: keep existing `createScope`/`createTimeline` but augment: splitText on `h1` name/title, drawable hairline dividers, stats/bio with staggered spring, quick-cards (`data-hero="card"`) with `createDraggable` rail option + magnetic `Tilt3D`/`createAnimatable` on hover. Ensure existing `QUICK_CARDS` data stays unchanged.
3. `HeroChat.tsx` + `Homepage.tsx` empty-state branch: when `isInitial && !isDataLoading`, show a centered SVG illustration (e.g. wireframe terminal + floating chips) with idle `createDrawable` loop + subtle morph orb behind; animate in after skeleton `StatBar`s resolve. When messages appear, illustration crossfades out via `Timeline`.
4. `ChatInputBar.tsx` / `ChatStream.tsx` / `ChatModalHost.tsx`: micro-interactions — input focus glow, send button spring, stream message stagger (`splitText` words or line-clip), suggestion chips `stagger` entrance.

### Phase D — Blog system (list, empty/search empty, detail header)

1. `pages/blog/index.tsx` + `BlogReels.tsx` / `BlogCard.tsx`: richer card chrome (hairline top, inset orb via `MorphOrb` in accent, `LightningTransition` preserved), reels buffer fetch unchanged. Empty state: illustration (`EmptyStacksGraphic`) + `splitText` headline + CTA to clear filters.
2. `BlogSearch.tsx` + tag filter drawer: entrance stagger for chips, search focus ring via `animate` + `spring`, result-count `AnimatedCounter` bump.
3. `pages/blog/[slug].tsx` + `LightningTransition.tsx` + `ReadingProgress.tsx`: article header with `splitText` on title, drawable rule under meta, soft aurora wash behind cover image, reading progress uses existing scroll observer (no regression).
4. Reuse the same `EmptyStateGraphic` pattern for 404 vs blog empty vs chat empty — one component family, three compositions.

### Phase E — 404 premium redesign

1. Replace current home-brew scramble interval with `scrambleText` (proper). Use `splitText` for `404`/`SIGNAL_LOST`/`NOT_FOUND` + `createDrawable` bracket frame + floating orb morph (reuse `MorphOrb`), keep `HudPanel` diagnostic but with stiffer spring entrance and staggered `diag-item` cascade already in place. Keep route display + return buttons.

### Phase F — Icon system (Simple Icons + Lucide hybrid)

1. Build `src/lib/techIcons.ts`: `export type TechIconId`, `TECH_ICONS: {id, label, aliases, SiComponent, brandHex, category}[]` using `react-icons/si` exports (e.g. `SiReact`, `SiTypescript`, `SiNextdotjs`, `SiPython`, `SiDocker`, …) — aim 80-120 tech slugs covering portfolio reality. Add `resolveTechIcon(slug): {Component, hex}|null` and `allTechIconIds`.
2. Upgrade `src/components/ui/IconPicker.tsx` v2: two tabs (General/Lucide + Stack/Simple Icons), search across both, recent-used row, brand-color preview toggle (`colored` vs `mono` using `var(--fg-1)` mask), categories (Frontend, Backend, Cloud, DB, Design), grid virtualization not needed (120 items fine). Keep existing props (`value: string|null`, `onChange`, `disabled`) but broaden `value` semantics: lucide names like `Code`, si ids like `si:react`. Maintain backward compat — existing `icon_key` values (lucide) still render. Add optional `mode?: 'lucide'|'tech'|'all'` prop for callers that want one tab.
3. Wire into `SearchableMultiSelect` / project/skill skill selection where tags already use `PortfolioSkill.name` — add optional inline icon rendering next to skill chips using the same registry (no API change).
4. Add a small demo page or Storybook-less visual check via existing tests: include `src/components/ui/__tests__/IconPicker.test.tsx` covering search + tab switch + selection + backward compat.

### Phase G — Polish & verification

1. Audit all new motion for `prefers-reduced-motion` and `canAnimate` guards; record in `docs/decisions/premium-motion-*.md` if Phase-6-style decision doc is warranted (likely yes for boot timing).
2. Run `npm run verify` (lint + typecheck + test + tokens:check) + `npm run tokens:check:strict` + `npm run build` after each phase; expect pre-commit hook to re-run `generate-tokens.mjs` if `tokens.css` touched.
3. Manual passes: boot skip, hero stagger no FOUC, chat empty→thread transition, blog reels snap intact, 404 glitch still accessible, icon picker search + save round-trip for skills/projects (no admin restyle required).

---

## 4. Files Likely to Change

```
src/styles/tokens.css                          # new --aurora-*, --ring-*, subtle tints
src/styles/global.css                          # grain/mesh utilities if needed
src/config/animations.ts                       # extend springs/easings only if required (generated durations/easings already present)
# generated — do not hand-edit
src/config/generated/tokens.generated.ts
tailwind.tokens.generated.js
tailwind.config.js                             # only if wrapper change needed

src/components/ui/Background.tsx               # aurora mesh + variant prop + refined orbs
src/components/ui/TronGrid.tsx / ParticleField.tsx / ScanlineOverlay.tsx / CursorGlow.tsx  # subtle motion/opacity refinements
src/components/ui/BootSequence.tsx             # cinematic boot redesign
src/components/ui/GlitchText.tsx               # possibly splitText path for boot/hero (minor)
src/components/ui/HudPanel.tsx / StatBar.tsx / NeonButton.tsx  # micro-interaction polish if needed
src/components/ui/AnimatedDivider.tsx          # hairline drawable variant

src/components/ui/graphics/                    # NEW — illustration system
  index.ts
  primitives/HairlineDivider.tsx
  primitives/MorphOrb.tsx
  primitives/AuroraMesh.tsx
  primitives/Bracket.tsx
  compositions/HeroEmptyGraphic.tsx            # chat landing empty state
  compositions/BlogEmptyGraphic.tsx            # blog empty/search empty
  compositions/NotFoundGraphic.tsx             # 404 orb/frame

src/components/Homepage.tsx                    # empty→thread transition gating
src/components/home/HeroSection.tsx            # splitText + drawable + draggable rail
src/components/home/HeroChat.tsx               # hero chat empty coupling
src/components/home/ProjectStrip.tsx           # draggable strip if adopted
src/components/home/HudChrome.tsx              # no major change; possibly micro-stagger
src/components/home/ChatInputBar.tsx / ChatStream.tsx / ChatModalHost.tsx  # focus/spring/micro stagger

src/pages/404.tsx                              # premium 404 + scrambleText + drawable
src/pages/blog/index.tsx                       # empty state + search integration
src/pages/blog/[slug].tsx
src/components/blog/BlogReels.tsx / BlogCard.tsx / BlogSearch.tsx / LightningTransition.tsx / ReadingProgress.tsx

src/lib/techIcons.ts                           # NEW — Simple Icons registry via react-icons/si
src/components/ui/IconPicker.tsx               # v2 hybrid picker (lucide + si)
src/components/ui/SearchableMultiSelect.tsx    # icon rendering via registry (optional)

src/components/ui/__tests__/IconPicker.test.tsx  # updated/new
```

---

## 5. Step-by-step Tasks (bite-sized, TDD where sensible)

### Task 1 — Token foundation: add aurora/ring families + regenerate

**Files:** Modify `src/styles/tokens.css`; generate `src/config/generated/*` + `tailwind.tokens.generated.js`
**Steps:**

1. Add `--aurora-1: rgba(...)/ --aurora-2 / --aurora-3` + `--ring-*` aliases in `tokens.css` (warm washes, not neon blooms).
2. Run `npm run tokens:generate && npm run tokens:check:strict`.
3. No component changes yet. Commit.
   **Verify:** `npm run tokens:check:strict` OK; `npm run build` green.

### Task 2 — Graphics primitives scaffold (static SVGs, no motion)

**Files:** Create `src/components/ui/graphics/**` (HairlineDivider, MorphOrb, AuroraMesh, Bracket), `src/components/ui/graphics/index.ts`
**Steps:**

1. Create each primitive as pure React SVG using only `var(--*)` tokens (no raw hex, passes `token-lint`).
2. Export from index. Import in `Background.tsx` comment-only (no behavior change yet).
3. Add a quick visual check route/file not committed if needed; otherwise eyeball via dev server.
   **Verify:** `npm run typecheck && npm run tokens:check:strict` OK.

### Task 3 — Cinematic BootSequence (splitText + drawable + timeline + spring exit)

**Files:** Modify `src/components/ui/BootSequence.tsx`
**Steps:**

1. Write failing-free baseline: preserve `STORAGE_KEY`, `TOTAL_MS`, `SKIPPABLE_AFTER_MS`, `isReducedMotion()` fallback, sessionStorage skip, click/key skip.
2. Implement: emblem drawable (`createDrawable` on bracket/wordmark path), wordmark `splitText(chars/words wrap:clip)` cascade via `createTimeline` labels, rule draw, status `stagger`, exit `spring(soft)` + confetti dot burst (4-6 small `span` via `animate` + `spring`). Keep total < 900ms.
3. Fix `token-lint` / prettier.
   **Verify:** `npm test` (BootSequence not currently tested — add minimal render test if feasible); manual: first load shows boot, second does not, click/key skips, reduced-motion disables drawable.

### Task 4 — Background aurora & motion refinement

**Files:** Modify `src/components/ui/Background.tsx`, optionally `ParticleField.tsx`, `TronGrid.tsx`, `ScanlineOverlay.tsx`
**Steps:**

1. Add `AuroraMesh` layer behind morph shapes (blurred radial meshes in `--aurora-*`, opacity 0.06-0.12, `spring` drift via `animate` loop).
2. Soften `TronGrid` opacity and `ParticleField` density for hero readability; ensure `onScroll morphTo sync:true` still runs.
3. No API change. Commit.
   **Verify:** `npm run tokens:check:strict && npm test && npm run build`; manual scroll scrub.

### Task 5 — HeroSection hero motion upgrade (splitText + stagger + draggable)

**Files:** Modify `src/components/home/HeroSection.tsx`
**Steps:**

1. Wrap `h1` name/title with `splitText` (clip wrap) and animate `chars` with `stagger(16-22,{from:'first'/'center'})` inside existing `createTimeline`; keep fallback for reduced motion (no split, simple y+opacity).
2. Insert `HairlineDivider` drawable under label/name and animate via `createDrawable` draw.
3. Optional: apply `createDraggable` to quick-card rail (horizontal drag with snap) gated by `canAnimate()`. Keep `QUICK_CARDS` data unchanged.
4. Clean up `scope.revert()` + ensure `isReducedMotion()` guard.
   **Verify:** `npm test` green; manual: hero letters cascade, divider draws, reduced-motion static.

### Task 6 — Chat/landing empty-state graphic + transition

**Files:** Modify `src/components/Homepage.tsx`, `src/components/home/HeroChat.tsx`, new `src/components/ui/graphics/compositions/HeroEmptyGraphic.tsx`
**Steps:**

1. Create `HeroEmptyGraphic` (wireframe terminal + chips + mini morph orb). Use primitives + `createDrawable` idle loop.
2. In `Homepage.tsx`, render below `HeroChat` when `isInitial && !isDataLoading`, crossfade out (animate opacity + y) when `messages` appear; hide `StatBar` skeletons before graphic animates in.
3. Add to `HeroChat` a subtle idle pulse on suggestion area when empty.
   **Verify:** `npm test`; manual empty→send transition smooth, no layout jank.

### Task 7 — Chat micro-interactions (input, stream, chips)

**Files:** Modify `src/components/home/ChatInputBar.tsx`, `ChatStream.tsx`, `ChatModalHost.tsx`, optionally `ProjectStrip.tsx`
**Steps:**

1. Input: focus glow via `animate(borderColor/boxShadow, spring)`; send button press `scale` via `spring(hard)`.
2. Stream: message entrance uses `splitText` words or y+opacity stagger; `useEffect` on `messages.length`.
3. Suggestion chips: `stagger(30-40)` entrance, hover `scale 1.02` blend.
   **Verify:** `npm test` (ChatStream has no unit test yet — add if trivial); manual type→send→receive.

### Task 8 — Blog empty & list polish

**Files:** Modify `src/pages/blog/index.tsx`, `src/components/blog/BlogReels.tsx`, `BlogCard.tsx`, `BlogSearch.tsx`, new `BlogEmptyGraphic`
**Steps:**

1. Create `BlogEmptyGraphic` (stacked cards/book + search icon + tiny orb).
2. When `items.length===0` or filtered-empty, render graphic + `splitText` headline + clear-filters CTA with staggered entrance.
3. Polish reel card chrome: hairline top via `HairlineDivider` drawable, inset `MorphOrb` at card corner in per-card accent, preserve `LightningTransition`.
   **Verify:** `npm test`; manual: empty, search-no-results, tag filter round-trip.

### Task 9 — Blog detail header motion

**Files:** Modify `src/pages/blog/[slug].tsx`, `LightningTransition.tsx`, `ReadingProgress.tsx`
**Steps:**

1. Title `splitText` cascade, meta drawable rule, cover aurora wash behind image.
2. Preserve SSR `getServerSideProps` and sharing/copy behavior.
3. Keep `prefers-reduced-motion` stacked fallback.
   **Verify:** `npm test && npm run build`; manual blog→detail navigation, ReadingProgress still accurate.

### Task 10 — Premium 404 (scrambleText + splitText + drawable frame + morph orb)

**Files:** Modify `src/pages/404.tsx`, add `src/components/ui/graphics/compositions/NotFoundGraphic.tsx`
**Steps:**

1. Replace manual scramble `setInterval` char loop with `scrambleText` (anime `text`) for the long subtitle.
2. Use `splitText` for `404` + `SIGNAL_LOST` + `NOT_FOUND` cascades; wrap diagnostic `HudPanel` in bracket drawable frame via `createDrawable`.
3. Add small morph orb behind glitch text (reuses `MorphOrb`). Keep particles but reduce count or convert to drawable dots.
   **Verify:** `npm test` green; manual 404 render, reduced-motion disables scramble/drawable.

### Task 11 — techIcons registry (Simple Icons via react-icons/si)

**Files:** Create `src/lib/techIcons.ts`
**Steps:**

1. Import `SiReact`, `SiTypescript`, ... from `react-icons/si` (80-120 entries). Define `TECH_ICONS: {id,label,aliases,icon,hex,category}[]` (brandHex from simple-icons JSON by hand or `hex` property on export if available).
2. Export `resolveTechIcon(slug)`, `allTechIconIds`, `techIconCategories`.
3. Unit-test: `resolveTechIcon('react')`, alias `'next.js'`, unknown→null.
   **Verify:** `node -e "require('react-icons/si')"` smoke; `npm run typecheck` green.

### Task 12 — IconPicker v2 (hybrid Lucide + Stack)

**Files:** Modify `src/components/ui/IconPicker.tsx`
**Steps:**

1. Add tab state `active: 'general'|'stack'`, search unified, recent row (localStorage or prop), grid render branches: Lucide branch unchanged, Stack branch renders `TECH_ICONS` filtered.
2. Support `value` prefixed with `si:` (e.g. `si:react`) for stack icons and plain lucide name for generics. Render preview with `SiComponent` colored vs mono toggle.
3. Keep existing `value: string|null` / `onChange: (string|null)=>void` contract; add optional `mode?: 'lucide'|'tech'|'all'` and `showColor?: boolean`.
4. Backward compat: existing `icon_key='Code'` still matches lucide.
   **Verify:** New `src/components/ui/__tests__/IconPicker.test.tsx` (search, tab switch, select, clear, backward compat, colored toggle). `npm test` green.

### Task 13 — Wiring registry into chip renderers (optional polish, no API drift)

**Files:** Modify `src/components/ui/SearchableMultiSelect.tsx` (and any skill/project chip renderer)
**Steps:**

1. If a skill label matches a tech alias (`react` ≈ `React`), render `Si*` inline before label (small 12-14px, hex color muted to `var(--fg-2)` unless `colored`).
2. No DB migration, no API contract change.
   **Verify:** `npm test`; manual select a React/TS skill → chip shows icon+label.

### Task 14 — Final pass: reduced-motion audit + doc + verify

**Files:** All modified components + `docs/decisions/premium-motion-2026-09-09.md` (optional)
**Steps:**

1. Grep every `animate/createTimeline/splitText/createDrawable/morphTo` path for `isReducedMotion()||!canAnimate()` guard; ensure no scroll-jank via excessive `onScroll sync:true` listeners.
2. Run `npm run verify && npm run tokens:check:strict && npm run build`.
3. Write brief decision doc: boot timing, reduced-motion fallback, icon choice (why `react-icons/si` not new dep), no admin restyle.
   **Verify:** All CI gates green; manual: toggle `prefers-reduced-motion` emulation in devtools and verify static fallbacks across home/404/blog.

---

## 6. Tests / Validation

- **Tokens:** `npm run tokens:generate && npm run tokens:check && npm run tokens:check:strict` — must be OK (no raw hex/rgba, no ad-hoc duration/ease). Remember `scripts/generate-tokens.mjs --check` in CI and pre-commit hook.
- **Type/lint/build:** `npm run typecheck`, `npm run lint`, `npm run build` (Next 12.1.6 production build, all pages `○/λ` table green).
- **Unit tests:** `npm test` (vitest run) — extend `IconPicker.test.tsx`, optionally add `techIcons.test.ts` and minimal graphic render smoke tests. Existing tests: `HudPanel`, `NeonButton`, `GlitchText`, `NeonChip`, `StatBar`, `Tooltip`, `forms`, `suggestionGenerator`, `useFormAnimation`, `useTypeaheadSuggestions`, `smoke`.
- **E2E not required per phase**, but if touched blog routes, run `npm run test:e2e` (playwright) locally when requested.
- **Manual (critical):**
  - Boot: first-visit cinematic (<900ms), sessionStorage skip, click/key skippable after 150ms, reduced-motion static.
  - Home empty: skeleton bars → graphic → cards cascade, no FOUC, drag rail if enabled.
  - Chat: empty → thread transition, stream stagger, input focus glow.
  - Blog: reels snap retained, empty/search-empty graphic, detail header cascade, progress bar accurate.
  - 404: split/scramble + drawable + orb, diagnostic staggered, buttons work.
  - IconPicker: lucide search, stack search, alias match (`next.js`), save round-trip for skill/project CRUD (no admin restyle regression).

---

## 7. Risks, Tradeoffs, Open Questions

- **Bundle size:** `react-icons/si` tree-shakes but importing 100+ `Si*` in one registry can bloat if not tree-shaken carefully. Mitigation: use `react-icons/si` named imports (tree-shakable), not `import * as Si`. If bundle exceeds budget, switch to dynamic `simple-icons` JSON + inline `dangerouslySetInnerHTML` SVG injection for stack tab only.
- **Motion over-enthusiasm:** Too many concurrent `onScroll sync:true` or idle `createDrawable` loops hurt scroll perf. Budget: max 1 scroll-scrub per page (keep Background morph, add at most one more), idle loops at low `duration` and `pause` when off-screen.
- **Pre-commit hook friction:** Any `tokens.css` edit auto-regenerates `tailwind.tokens.generated.js` + `src/config/generated/tokens.generated.ts`. Commit must include those generated diffs or CI `--check` fails. Lint-staged runs `token-lint.mjs --all` — new `var(--aurora-*)` tokens must be added before classes reference them.
- **Icon backward compat:** Existing `skills.icon_key` holds lucide names (`Code`, `Briefcase`...). New `si:` prefix avoids collision. Picker must coerce unknown `si:` → mono fallback and never throw.
- **No admin restyle commitment:** User explicitly said skip admin pages. Do not restyle `AdminLayout` aside from IconPicker v2 integration. Touching `src/pages/api/**` or do-not-touch utils is out of scope.
- **Accessibility:** Every stagger/split must respect `prefers-reduced-motion`; ensure `aria-live`/`aria-label` preserved on BootSequence, and chat/blog empty graphics are `aria-hidden` decorative.
- **Open question:** Exact boot emblem SVG — choose between lettermark `F` in bracket, circuit shard, or isometric terminal silhouette. Decision deferred to Task 3 implementation; any token-safe geometric mark is acceptable if it uses `createDrawable`.

---

## 8. Out-of-Scope / Deferred

- Admin CRUD page restyling (explicit skip).
- Supabase migrations or `install/supabase/*.sql` edits (hosted drift guardrail).
- New npm animation libs (no GSAP/Framer addition; anime.js v4 suffices).
- Adding `simple-icons` as a new npm dep if `react-icons/si` already covers needs — evaluate at Task 11, do not pre-install.
- Any change under `src/utils/aiService.ts`, `aiResponseParser.ts`, `intentDetection.ts`, `src/utils/api.ts:945-1014`, `supabase/`.
