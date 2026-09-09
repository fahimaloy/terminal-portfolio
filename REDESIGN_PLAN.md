# ULTIMATE PORTFOLIO REDESIGN — Plan & Progress Tracker

> **Project:** Fahim Ahmed — Cyberpunk Portfolio + Personal Blog (Next 12.1.6 / animejs 4.5.0 / Supabase)
> **Date:** 2026-09-10 · **Branch:** `newui` · **Status:** PLANNING — execution starts next
> **Doc type:** Single source of truth for redesign scope, WBS, and progress. Update checkboxes in-place as tasks land.
> **Token contract:** `src/styles/tokens.css` remains sole source of truth. All color/duration/easing/spring changes go there → `npm run tokens:generate`. CI `tokens:check` must stay green.
> **Motion contract:** anime.js v4 only — `createScope` + `createTimeline` + `stagger` + `createDrawable` + `spring()` + `onScroll({sync:true})`. Every path gated by `isReducedMotion()||!canAnimate()` with `scope.revert()` cleanup.

Previous plans under `docs/decisions/` and `.hermes/` have been **removed** per instruction — this file replaces them.

---

## Table of Contents

1. [Forensic Audit — What Is Wrong (Evidence)](#1-forensic-audit--what-is-wrong-evidence)
2. [Design Doctrine — Where We Are Going](#2-design-doctrine--where-we-are-going)
3. [Architecture Decisions (ADRs inlined)](#3-architecture-decisions-adrs-inlined)
4. [Work Breakdown — Phases & Tasks](#4-work-breakdown--phases--tasks)
5. [Progress Tracker (live checkboxes)](#5-progress-tracker-live-checkboxes)
6. [Dependency Graph & Parallelization](#6-dependency-graph--parallelization)
7. [Component Inventory (build / keep / delete)](#7-component-inventory-build--keep--delete)
8. [Risks & Mitigations](#8-risks--mitigations)
9. [Verification & Definition of Done](#9-verification--definition-of-done)
10. [How to Work This Plan](#10-how-to-work-this-plan)

---

## 1. Forensic Audit — What Is Wrong (Evidence)

All findings grounded in repo read on `newui@ef60c03` (9 Sep 2026). File:line citations are real.

### 1.1 Boot / Splash — flickers, unstable, under-designed

| Symptom                                    | Evidence                                                                                                                                                                                                 | Root Cause                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Flicker / flash of unstyled boot, then pop | `BootSequence.tsx:40 finish()` tears down scope + state, but mount check `useEffect:58` reads `sessionStorage` async after first paint; no CSS `visibility` guard, no `contain: paint`.                  | No stable overlay — JS mounts 1 frame late, then paints large SVG/letters. Reduced-motion branch collapses to 120 ms timeout with no crossfade. |
| Feels cheap — no vector loading scope      | Current boot draws letters via `splitText` + 5-dot confetti only. No **scope-ring / HUD vector loader** as design expects. Missing `createDrawable` scope-load affordance.                               | `primitives/` has `MorphOrb`/`Bracket` but boot never uses them as a loading scope.                                                             |
| Timing budget drift                        | `TOTAL_MS=820` but `onComplete` exit uses `spring(soft)` scale + stale `setTimeout 80ms` padding (`BootSequence.tsx:198-218`). No `animation.finished` promise; race with `SKIPPABLE_AFTER_MS=150` skip. | Timers not tied to timeline lifecycle.                                                                                                          |
| Accessibility flicker                      | `role="status"` + `aria-live` present but text changes mid-timeline without `aria-hidden` on decorative confetti.                                                                                        | Decorative layers not hidden.                                                                                                                   |

**Must fix:** Replace boot with a **vector HUD scope** (concentric rings + ticks + loading rail), `createTimeline` labels `scope→rings→wordmark→rule→status→exit`, single `createScope` at `rootRef`, `sessionStorage` check _before_ `setShow(true)`, `scope.revert()` on both `finish` and `unmount`, no raw hex.

### 1.2 Home `/` — hierarchy, color, layout, empty waste

| Symptom                                               | Evidence                                                                                                                                                                                                                                                                                                                           | Root                                                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Visual hierarchy flat — everything same warm charcoal | `tokens.css:12-23` warm scale `#252423→#353432` only; accents `--neon-*` at 0.22 glow, never used as surface. `HudPanel.tsx:37-42` flat `bg-2 + 3px top border` — no elevation, no depth. `global.css` hud-panel identical.                                                                                                        | Warm editorial v3 deliberately muted — now reads as monochrome paper, not AAA game. Zero saturated surfaces, no accent zones. |
| Empty graphic wastes viewport                         | `Homepage.tsx:294-302` `<div class="w-full max-w-xl mt-8 opacity-0"> <HeroEmptyGraphic/> </div>` — `max-w-xl (576px)` + `mt-8` inside `justify-center pb-[18vh] pt-[10vh]` consumes ~148px height + orbit 92px. User pasted HTML shows exactly this `div[data-graphic="hero-empty"]` dominating center while hero text sits above. | Placeholder graphic is decorative wireframe terminal — no data, no action.                                                    |
| Input box below the fold                              | `Homepage.tsx:250-254` wrapper `justify-center pb-[18vh] pt-[10vh]` on initial + `ChatInputBar.tsx:116 mt-8 mb-4` pushes input ~32px+ outside `100dvh` on laptops. No `max-h: calc(100dvh - hud - input)` clamp.                                                                                                                   | Layout uses `min-h-screen` without `100dvh` + safe-area handling.                                                             |
| Header duplicates hero                                | `HudChrome.tsx:22-52` top-left identity badge repeats `profile.full_name` + initial already in `HeroSection.tsx` splitText name. Top-right clock + `siteTexts` status also echoed in hero bio.                                                                                                                                     | Two sources of truth for identity/status.                                                                                     |
| Cards monotonous                                      | `ProjectStrip.tsx:26-61` `flex-wrap justify-center gap-3` with 4× `HudPanel accent yellow` identical. No image, no tags, no hover vector. `InlineProjectCard.tsx:7-12` gradient `from-purple-500/20` uses raw Tailwind opacities, not tokens.                                                                                      | One accent, no category mapping, no icon system beyond generic `Code/Briefcase` lucide.                                       |
| Icons not fun / not colorful                          | `SkillCard` / `IconPicker` do have `techIcons.ts` with brand hex, but home never uses them — `HeroSection.tsx:12-17` only generic lucide.                                                                                                                                                                                          | Brand icon pipeline disconnected from home.                                                                                   |
| No interactivity layer                                | `HeroSection.tsx` has `HairlineDivider` drawable only; no draggable, no hover blend, no particle affordance. `Background.tsx` aurora muted `0.06-0.12` + `TronGrid 0.22` + 3 blobs — invisible on charcoal.                                                                                                                        | Background spec softened for editorial — now unreadable.                                                                      |

### 1.3 Site-wide motion — scattered, not systemic

- Every component calls `createScope` ad-hoc with its own guard `if (isReducedMotion()||!canAnimate()) return;` — correct but duplicated, no shared `useMotionScope` hook, no budget for `onScroll({sync:true})` (only `Background.tsx:81` keeps one — good — but new reels wants another).
- No global motion tokens for `spring(card)`, `stagger(section)`, `draw(hero)`, `morph(bg)`. `durations.stagger 80ms` is one-size-fits-all.
- Hover states are CSS `transition` only except `ChatInputBar` focus glow — missing `composition:'blend'` hover layers.

### 1.4 Blog — missing retro + missing swipe VFX

- `blog/index.tsx:25 REELS_PAGE_SIZE=5` + `BlogReels.tsx:2-7` implements scroll-snap `y mandatory` but **no flash VFX** — plain `snap-start`. User wants: **one post per viewport, swipe animates out + blazing flash in**. Current `LightningTransition` exists but only used as subtle bolt, not full-bleed flash curtain.
- Typography: `tokens.css:169-172` `Space Grotesk` only — no retro mono/display pairing. `blog/[slug].tsx:14-18` uses same sans, no `JetBrains Mono` code voice, no scanline/CRT affordance.
- `BlogCard.tsx:42-61` flat link + Tilt3D 4deg + orb 12% — no cover density, no tag affordance, no reading-time hierarchy.
- Empty state `BlogEmptyGraphic` dual variant `empty|no-results` but animation is `splitText stagger(18)` only — no search affordance.

### 1.5 Chat — components exist but not premium

`ChatMessage.tsx:17-27` already routes:

- `responseType: project_table → ProjectTableView`
- `skill_list → SkillGrid`
- `experience_timeline → ExperienceTimeline`
- markers `[[PROJECT_REF:]] / [[SKILL_REF:]] / [[PROJECT_LIST]]` → inline cards

**Gaps:**

- Inline cards are flat gradients (`InlineProjectCard.tsx:7 Tailwind 500/20`) not token-driven, not HUD-themed, no vector frame, no expand animation.
- No **project list expand** (table → detail drawer), no **project mention chip** with `onClick → ProjectDetailModal` spring transition, no **skill mention pill** with brand icon + hex wash, no **experience node** with timeline rail + drawable line.
- `ProjectPreview`, `ProjectInlineRef`, `SkillCard`, `ExperienceTimeline` exist but styling is inconsistent — `SkillCard` uses `HudPanel`, `InlineProjectCard` uses raw `bg-gradient`, `ExperienceTimeline` uses plain border-l.
- Chat viewport: `ChatStream.tsx:52-111` stagger `34ms` only; no vector backdrop, no message VFX, no typing scope indicator beyond `TypewriterText speed 10`.

### 1.6 Global BG — underpowered

- `Background.tsx:42-135` three `MORPH_PATHS` morphTo + aurora blobs `blur 40-80px opacity 0.06-0.12` + `ParticleField 3 dots` + `TronGrid` — reads as paper texture, not AAA particles. User asked for **bg particles OR vector animations** that feel alive. Current aurora is static except drift, particles are not interactive.

---

## 2. Design Doctrine — Where We Are Going

### 2.1 Positioning — "AAA Game HUD × Editorial Warm"

> **One sentence:** Out of Action–grade saturated HUD accents on a warm charcoal editorial chassis — futuristic, subtle, tactile, never neon vomit.

- **Chassis:** keep warm charcoal `bg-1 #252423` → `bg-4 #353432` as base. It photographs well, lets saturated HUD panels pop.
- **HUD layer:** saturated accent surfaces — not just `3px top border`, but **accent-washed cards** (`--glow-*-zone` now used at 0.06→0.12→0.18 stepped), bracket corners, hairline grids, and **vector scopes**.
- **Editorial layer:** generous macro-whitespace, 16-column grid on desktop, serif? No — keep `Space Grotesk + JetBrains Mono` pairing but add **retro mono display** for blog (`Space Mono` or `JetBrains Mono` at tight `tracking-widest` 0.12em, already in tokens).
- **Futuristic subtle:** motion is **purposeful**, not loop-everywhere. One hero scope-load, one bg aurora drift, hover blends, swipe flashes. No idle wobble.

### 2.2 Color — From Muted Warm to Controlled AAA Saturation

We do **not** repaint everything neon. We add **saturation doors** at specific depths (`@see 2.2.1`).

#### 2.2.1 New token families (all in `tokens.css`, code-gen where eligible)

| Family                  | Vars                                                                                                                                                           | Purpose                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Surface elevation**   | `--surface-0..3` = `bg-1..4` stepped + `--surface-raised: #31302F` (new)                                                                                       | Card depth without shadow.                                    |
| **Accent wash (AAA)**   | `--wash-yellow: rgba(255,204,42,0.12)` etc. at 0.12/0.16/0.20 (raise current 0.04)                                                                             | Card fills, hero chips, chat bubbles.                         |
| **Hairline grid**       | `--grid-1: rgba(246,244,242,0.04)` `--grid-2: 0.06`                                                                                                            | HUD panel inner grids (replaces raw `white/10`).              |
| **HUD stroke**          | `--hud-cyan: var(--neon-cyan)` alias kept, add `--hud-amber`, `--hud-violate`                                                                                  | Bracket strokes, drawable lines.                              |
| **Retro accent (blog)** | `--retro-paper: #FAF8F5`, `--retro-ink: #1A1A18`, `--retro-amber: #FF8C2A` (light-mode tokens scoped under `[data-theme="blog"]` or `.blog-theme`)             | Blog reading surface — warm paper + amber ink, not site-wide. |
| **Spring presets**      | Add `--spring-card: '{"stiffness":150,"damping":14}'`, `--spring-snappy: '{"stiffness":240,"damping":18}'`, `--spring-gentle: '{"stiffness":90,"damping":14}'` | Named presets → `animations.ts springs.*`                     |

**Rule:** No raw hex in components. Brand hex in `techIcons.ts` stays behind `// token-lint-ignore` per-line — already compliant with `--all`.

#### 2.2.2 Tailwind code-gen

`scripts/generate-tokens.mjs` already emits `colors.neon/* glow/* bg/* text/* glass/*` + `durations/easings`. Extend `EXPECTED_ACCENTS` + `parseTokensCss` regex to include `wash-*`, `surface-*`, `grid-*`, `retro-*`. Keep `generateTwContent` mapping accent→wash.

#### 2.2.3 Contrast hierarchy target

- Hero name: `text-neon-*` + `text-shadow-neon-*` at **display 6xl-8xl** isolated above fold — no competing HUD.
- Card titles: `fg-1` 16-18px semibold, chips 10px mono `fg-3`.
- Muted: `fg-4` 10px tracking wide for labels only.

### 2.3 Motion Doctrine — anime.js 4 as Instrument, Not Decoration

**Canon (per AGENTS.md, hardened):**

```ts
// 1. Scope per root — never global animate()
const scope = createScope({
  root,
  mediaQueries: { reduceMotion: { matches: false } },
  defaults: { duration: 800, ease: 'outExpo' },
});
scope.add(() => {
  /* all timelines here */
});

// 2. Timelines for sequences — labels, not ad-hoc delays
const tl = createTimeline({
  defaults: { ease: easings.smooth },
  onComplete: finish,
});
tl.add(orb, { scale: [0.9, 1], duration: durations.enter * 1000 }, 0);
tl.add(letters, { opacity: [0, 1], delay: stagger(18, { from: 'first' }) }, 90);

// 3. Drawable lines — single preset
createDrawable(els, {
  draw: ['0 0', '0 1'],
  duration: durations.draw * 1000,
  ease: easings.smooth,
});

// 4. Springs physical — not easing curves
animate(btn, { scale: [0.96, 1], ease: spring(springs.card) });

// 5. Scroll scrub — ONE per page (Background morph)
animate(morphEl, {
  d: MORPH_PATHS[1],
  autoplay: onScroll({ sync: true, target, container }),
});
```

**New primitives we will author:**

| Primitive          | Token pair                                                                           | Use                                                            |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `vectorScope()`    | `drawPreset + spring(gentle)`                                                        | Boot loader, chat typing indicator, blog flash curtain ring.   |
| `flashCurtain()`   | `durations.exit 320ms + stagger 12ms`                                                | Blog swipe — white-amber flash + directional slide.            |
| `cardLift()`       | `spring(card) + composition:'blend'` hover                                           | Every project/skill/blog card hover.                           |
| `staggerSection()` | `stagger(dur.stagger*1000,{from:'first'})`                                           | Hero stats, blog reels dots, chat messages.                    |
| `washPulse()`      | `animate(bg, {scale:[1,1.02], duration: dur.pulse*1000, alternate:true, loop:true})` | Aurora blobs — only when `canAnimate() && !isReducedMotion()`. |

Every path has **reduced branch** `opacity [0,1]` no-transform only.

**Budget:** max **ONE `onScroll({sync:true})`** per viewport (Background morph keeps privilege; blog reels parallax cover `scrollY*0.18` must become `transform: will-change` + rAF, not second sync listener).

### 2.4 Typography — Retro for Blog, Editorial for Site

- **Site (default):** `Space Grotesk 400/500/600` display+body, `JetBrains Mono 400/500` mono — already wired in `_document.tsx` + `tokens.css:169-172`. Keep.
- **Blog reading:** new **retro voice** — tighten `tracking-widest 0.12em`, mono labels `10-11px uppercase`, article `font-body 16px leading-relaxed 1.7`, code `JetBrains Mono 13px` on `retro-paper` card. Headline uses `splitText chars+clip` + amber underline `createDrawable`.
- No new font fetch until approved — `JetBrains Mono` already loaded covers retro need via weight/tracking shift.

### 2.5 Vector & Particle Language

- **Vector:** all HUD vectors are **hairline (`0.8-1.1px`) stroke** on `var(--hairline) / var(--ring-*)`, `pathLength 1000` for `createDrawable`, `fill: var(--glow-*-zone)` at 0.04→0.12. Primitives: `ScopeRings`, `Bracket`, `HairlineDivider`, `MorphOrb`, `AuroraMesh`. New: `GridLattice`, `SignalTicks`.
- **Particles:** replace `ParticleField 3 dots` with **canvas-starfield 40-60 dots** (`ParticleField v2`) — `requestAnimationFrame` drift, not anime per-dot. Interactive: `CursorGlow` already exists, enhance with `magnetic` near cards.
- Never raw SVG inline without `data-graphic` selectors — always `data-graphic="grat-*"` for anime targeting.

### 2.6 Layout Doctrine — Viewport Truth

- Use `100dvh` everywhere (`dvh`, not `vh`). Fallback `h-screen` kept for older browsers.
- Home shell: `header 56px + hud-safe 16px + chat-input 72px` = predictable clamp. Content `max-h: calc(100dvh - header - input - safe-area)`.
- Input bar is **fixed-bottom or sticky-bottom** inside `flex-col h-[100dvh]`, not pushed by `mt-8`.
- Header identity badge **collapses** when hero is visible (`IntersectionObserver` on hero name → hide chip, stagger back on scroll).

---

## 3. Architecture Decisions (ADRs inlined)

### ADR-01: Boot — Vector HUD Scope Loader

**Decision:** Replace letter-only boot with **concentric `ScopeRings` (3 rings) + `SignalTicks` (12 ticks) + linear loading rail** behind wordmark. Timeline labels `scope(0) → rings(60) → wordmark(120) → rule(260) → status(340) → exit(560)`. Exit is `spring(gentle)` scale `1→0.985` + opacity, confetti `spring(bouncy)` only on first session.

**Why:** User explicitly asked for "proper scope loading like vector graphics and animejs 4 animations". Letters alone feel like a typography demo, not a scope.

**Tokens/motion:** rings `createDrawable ['0 0','0 1']` + rotation `stagger(40,{from:'center'})`; rail `scaleX 0→1` `ease-outExpo`; wordmark `splitText chars stagger 16`.

### ADR-02: Header Dedup

**Decision:** `HudChrome` identity badge is **context-aware**. On `/` with `isInitial` + hero visible → show only `status + clock`, hide name pill. With messages or `not isInitial` → show compact `F· Fahim` chip. Implement via `useInView(heroRef)` + `createTimeline` opacity toggle, no JS layout thrash.

### ADR-03: Kill the Hero Empty Graphic (or Re-home It)

**Decision:** Delete `max-w-xl mt-8 <HeroEmptyGraphic>` block at `Homepage.tsx:294-302`. It is decorative dead weight. Re-home its **good parts** (bracket corners + terminal wireframe) into **hero background lattice** behind stats (`HeroSection` card chrome), not as a standalone panel below hero. If data is loading show `StatBar` skeletons; if loaded and `isInitial` show hero only — no graphic at all.

**Why:** Frees ~160px viewport, fixes input-below-fold. Reduces one `createScope` + `HeroEmptyGraphic` idle drawable loop.

### ADR-04: Home Input — Viewport-Clamped

**Decision:** Restructure `Homepage.tsx:249-335` from `min-h-screen items-center justify-center` to `h-[100dvh] flex flex-col overflow-hidden`. Middle scroll zone `flex-1 min-h-0 overflow-y-auto`. `ChatInputBar` becomes **sticky bottom** `mt-auto` inside same `max-w-4xl` column, always visible at `dvh` bottom + `env(safe-area-inset-bottom)`.

**Acceptance:** On 13" laptop (900px) and iPhone SE (667px dvh) the input top edge is fully inside viewport on initial load.

### ADR-05: AAA Color Pass — Token-Gated Saturation

**Decision:** Raise `--glow-*-zone` washes 0.04→`0.08-0.12` stepped, add `wash-*` tokens, introduce `GridLattice` pattern for card backs. No per-component raw hex; every saturated panel reads `var(--wash-*)` or `var(--aurora-*)`.

**Why:** Achieves Out-of-Action vibrancy without repainting every file — one `tokens.css` change propagates.

### ADR-06: Blog — One Viewport, Flash Swipe

**Decision:** Keep `BlogReels` `scroll-snap-type: y mandatory` + `h-[100dvh]` cards (good), but add **flash VFX layer**: on `snapIndexChange` → `FlashCurtain` full-screen `background: var(--retro-amber) → transparent` + directional slide (`prev` slides up/left, `next` slides down/right) at `stagger 10-16ms` + `spring(snappy)` for the incoming card. Also add **retro paper** card skin for reading surface.

**Why:** User asked for "blazing flash movement like animations and visual effects". Snap alone is System Scroll, not VFX. Flash curtain supplies that.

**Fallback:** `isReducedMotion()` → snap disabled → stacked cards static, no flash.

### ADR-07: Chat — Universal Mention System

**Decision:** All AI mentions are **uniform `MentionChip` family**:

- `ProjectMentionChip` — thumb 28px + title + chevron, `onClick → ProjectDetailDrawer` (right drawer, `spring(card)`), accent `cyan` unless project category maps to `wash-*`.
- `SkillMentionChip` — `techIcons` brand icon at 14px + label, hex wash `hex at 0.10` behind chip (`token-lint-ignore` scoped to chip only), `onClick` opens skill detail inline.
- `ExperienceMention` — timeline rail `createDrawable` vertical line + `MorphOrb` nodes.
- `ProjectListTable → ExpandableGrid` — table rows expand inline to `ProjectStrip v2` cards on tap.

**Parser:** extend `aiResponseParser.ts` to produce `skill_ref` / `project_ref` IDs that map through `techIcons.ts` / `PortfolioProject`. No new LLM contract — parser only.

### ADR-08: Background — Starfield + Interactive Aurora

**Decision:** Promote `Background.tsx` to **AuroraMesh (3 blobs) + Starfield canvas (50 dots) + GridLattice SVG**. Dots drift via `requestAnimationFrame` at 50-60fps (cheap), `CursorGlow` already handles magnetism. TronGrid opacity `0.22→0.14` for depth, not foreground.

### ADR-09: Motion Budget

**Decision:** Only **one** `onScroll({sync:true})` per page. Blog cover parallax becomes `useRaf(() => coverRef.style.transform = translateY(scrollY*0.15))` (no second sync). Flash curtain is timeline-driven, not scroll.

---

## 4. Work Breakdown — Phases & Tasks

> **Notation:** `P#-T##` = Phase-Task. `Est` in half-days (1 = ~4h focused). `DoD` = Definition of Done line.

### Phase 0 — Foundation (blocked hardening, design-token groundwork)

| ID     | Task                               | Why / What                                                                                                                                            | Effort | DoD                                                                   |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- | --- | -------------------------------------------------------------------- |
| P0-T01 | **Token audit & AAA palette PRD**  | Decide exact `wash-* / surface-raised / grid-* / retro-* / spring-*` values, write token spec table, get sign-off                                     | 0.5    | Spec table in this doc §2.2.1 signed with values, no raw hex          |
| P0-T02 | **tokens.css expansion + codegen** | Add new families per §2.2.1, run `generate-tokens.mjs`, extend `EXPECTED_ACCENTS`/`parseTokensCss`, verify `tokens:check` green                       | 0.5    | `npm run tokens:check` OK, `--all` clean (brand hex ignored)          |
| P0-T03 | **Motion hook extraction**         | Create `src/hooks/useMotionScope.ts` + `src/hooks/useFlashCurtain.ts` wrappers around `createScope/createTimeline` with built-in `isReducedMotion     |        | !canAnimate`guard,`scope.revert()` on cleanup; migrate one pilot file | 0.5 | 1 pilot (e.g. `StatBar`) uses hook, `scope.revert()` proven via test |
| P0-T04 | **Viewport shell reset**           | Introduce `h-[100dvh]` shell, `HeaderHeight` token (`--header-h:56px`), safe-area padding; keep `Background` + `CursorGlow` mount order in `_app.tsx` | 0.5    | No visual regression at 1920/1366/375, Lighthouse layout shift 0      |

### Phase 1 — Boot & Background (ship big delight first)

| ID     | Task                                                              | File(s)                                                                         | Effort | DoD                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-T05 | **Vector scope loader — `ScopeRings` + `SignalTicks` primitives** | `src/components/ui/graphics/primitives/ScopeRings.tsx`, `SignalTicks.tsx`       | 0.5    | Hairline strokes `var(--ring-*)`, `pathLength 1000`, `data-graphic` selectors, `isReducedMotion` → static                                                                    |
| P1-T06 | **BootSequence rebuild**                                          | `src/components/ui/BootSequence.tsx`                                            | 1.0    | Timeline `scope→rings→wordmark→rule→status→exit` < 900ms, `animation.finished` drives finish, no flicker, no timers race, `role=status` correct, sessionStorage before mount |
| P1-T07 | **Boot reduced-motion & skippable path**                          | same                                                                            | 0.25   | `prefers-reduced-motion → 120ms opacity` branch, `click/key` skip after 150ms works, decorative layers `aria-hidden`                                                         |
| P1-T08 | **Background v2 — AuroraMesh + Starfield canvas + GridLattice**   | `src/components/ui/Background.tsx`, `ParticleField.tsx` → v2, `GridLattice.tsx` | 1.0    | 50 dots rAF drift 55-60fps on laptop, `AuroraMesh` drift `spring(gentle)`, TronGrid 0.14 as depth, one `onScroll sync` retained, `_app.tsx` mount order unchanged            |
| P1-T09 | **ScanlineOverlay → GrainOverlay**                                | `src/components/ui/ScanlineOverlay.tsx`                                         | 0.25   | Subtle paper grain 0.02 opacity, no CRT scanline animation loop (keeps editorial)                                                                                            |
| P1-T10 | **Boot+BG visual sign-off**                                       | —                                                                               | 0.25   | Screen-recording at 60fps, no flicker on hard reload ×3, `npm run build` OK                                                                                                  |

### Phase 2 — Home Shell & Layout (fix input/viewport/header monotony)

| ID     | Task                                       | File(s)                                                  | Effort | DoD                                                                                                                                                                                                                                |
| ------ | ------------------------------------------ | -------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-T11 | **Homepage viewport clamp**                | `src/components/Homepage.tsx`                            | 1.0    | Shell `h-[100dvh] flex flex-col`; middle `flex-1 min-h-0 overflow-y-auto`; input sticky `mt-auto` + `env(safe-area)`; input fully visible at 667px dvh                                                                             |
| P2-T12 | **Kill hero-empty waste, re-home lattice** | `Homepage.tsx:294-302`, `HeroSection.tsx`                | 0.5    | `HeroEmptyGraphic` block removed; bracket lattice moved into hero stat-card chrome or footer micro; no viewport waste                                                                                                              |
| P2-T13 | **Header dedup + hide-on-hero**            | `src/components/home/HudChrome.tsx`, `Homepage.tsx`      | 0.5    | `IntersectionObserver` on hero name; identity chip hides while hero visible → fades in on scroll; top-right clock persists                                                                                                         |
| P2-T14 | **HeroSection AAA pass**                   | `src/components/home/HeroSection.tsx`                    | 1.0    | AAA palette applied: name at 6xl-7xl with neon wash, bio 15px `fg-2`, CTA `spring(bouncy)` hover `scale 1.02 composition:blend`, stats `stagger 60` with `wash-*` backs, `QUICK_CARDS` with `techIcons` brand icons where possible |
| P2-T15 | **ChatStream viewport fix**                | `src/components/home/ChatStream.tsx`, `ChatInputBar.tsx` | 0.5    | Messages `stagger 34→22ms` + y/opacity, `bottomRef` scrollIntoView uses `{block:'end', behavior: smooth}` only when distance > 120px; focus glow `spring(soft)` as before                                                          |
| P2-T16 | **Responsive pass 320→1920**               | all Phase2 touched                                       | 0.5    | No horizontal scroll at 320px, no overlap at 375px, 1024 grid aligns to 16-col, input never offscreen                                                                                                                              |

### Phase 3 — Premium Component Library (cards, icons, vectors, interactive)

| ID     | Task                                                 | Why                       | File(s)                                                                                                                     | Effort | DoD                                                                                                                                                                                      |
| ------ | ---------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-T17 | **HudPanel v2 — wash + bracket corners + grid back** | Generic card monotone fix | `src/components/ui/HudPanel.tsx`                                                                                            | 0.75   | Props `wash?: Accent`, `bracket?: boolean`, `grid?: boolean`; style reads `var(--wash-*)`, bracket SVG `createDrawable` optional, no notch clip                                          |
| P3-T18 | **ProjectStrip v2 — AAA project cards**              | Monotonous strip fix      | `src/components/home/ProjectStrip.tsx`, new `ProjectCard.tsx`                                                               | 1.0    | Cards: cover 160px + title + tags (`TagInput` tokens) + tech icons row `techIcons` hex wash, hover `cardLift spring(card)`, accent cycles `yellow/magenta/cyan/green` per index, 4up max |
| P3-T19 | **Inline mention chips — Project/Skill/Experience**  | Chat custom UI ask        | `src/components/InlineProjectCard.tsx` → renamed `ProjectMentionChip.tsx`, new `SkillMentionChip.tsx`, `ExperienceNode.tsx` | 1.0    | All chips token-only, `onClick` affordance visible (chevron/ring), spring press `scale 0.98→1`, accessible `role=button`                                                                 |
| P3-T20 | **Icon integration — home + strip**                  | Icons not fun             | `HeroSection QUICK_CARDS`, `ProjectCard`, `SkillMentionChip`                                                                | 0.5    | `resolveTechIcon(id)` used; brand icon at 14-16px + mono label; lucide only where no tech match; shows color when `showColor`, mono otherwise                                            |
| P3-T21 | **Vector hover affordances**                         | Requested interactivity   | `src/components/ui/Tilt3D.tsx` hardened + `MagneticButton.tsx` wired                                                        | 0.5    | `Tilt3D intensity 6` on project/blog cards only, `MagneticButton` on CTAs, `Ripple` on tap, all gated `!isTouchDevice()`                                                                 |
| P3-T22 | **StatBar AAA wash**                                 | Stat hierarchy            | `src/components/ui/StatBar.tsx`                                                                                             | 0.25   | Bar fill `var(--wash-*)` + hairline cap, value `AnimatedCounter` spring                                                                                                                  |
| P3-T23 | **Graphics primitives hardening**                    | Token hygiene             | `src/components/ui/graphics/primitives/*`                                                                                   | 0.25   | All inline SVG reads `var(--*)`, no raw `rgba(` or `#[hex]`; `token-lint --all` clean                                                                                                    |

### Phase 4 — Blog Reborn (retro + one-per-viewport + flash)

| ID     | Task                                        | What                                          | File(s)                                                                    | Effort | DoD                                                                                                                                                                                                                    |
| ------ | ------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P4-T24 | **Blog theme skin — retro paper**           | Warm paper surface for reading, not site-wide | `tokens.css` retro vars, `global.css .blog-theme`, `blog/index.tsx`        | 0.5    | `[data-theme=blog]` scopes `retro-paper/ink/amber`; prose `1.7 leading`; mono labels `tracking-widest`; cover at 100dvh header offset                                                                                  |
| P4-T25 | **Flash curtain + directional swipe**       | Blazing flash VFX ask                         | new `src/components/blog/FlashCurtain.tsx`, `BlogReels.tsx`                | 1.25   | On `snapIndexChange`: `FlashCurtain` full-screen amber→clear `320ms ease-out`, incoming card `slide y [24,0] spring(snappy) stagger 12ms`, outgoing `y [0,-12] opacity 0.8→0`; reduced-motion → no curtain, no stagger |
| P4-T26 | **Single-post full-bleed card redesign**    | Typography hierarchy ask                      | `src/components/blog/BlogCard.tsx` → `BlogReelsCard` + `BlogReels.tsx:390` | 1.0    | Cover `h-[44dvh]` min 240px + title `splitText` amber underline `createDrawable` + tag shelf + reading time + excerpt clamp 3 lines; `Tilt3D` off on mobile                                                            |
| P4-T27 | **Expanded reader — in-place overlay**      | Swipe → rich read                             | `BlogReels.tsx:466 ExpandedOverlay`, `RichTextRenderer.tsx`                | 0.75   | Expanded detail slides up `spring(gentle)` over card, `ReadingProgress` vertical dots, `LightningTransition` retained as subtle edge bolt (not curtain), share `canonical_url` button                                  |
| P4-T28 | **Blog index polish (search/drawer/empty)** | Discoverability                               | `src/components/blog/BlogSearch.tsx`, `BlogEmptyGraphic.tsx`               | 0.5    | Filter drawer `HudPanel v2 wash`, chips `stagger 30` + focus glow, empty `splitText stagger(18)` as before but amber veil; `REELS_PAGE_SIZE=5` + preload `next cover decode()` kept                                    |
| P4-T29 | **blog/[slug] retro polish**                | Still SSR route for SEO                       | `src/pages/blog/[slug].tsx`                                                | 0.5    | Title chars `112%→0% stagger 20` kept, cover parallax via rAF (no second `onScroll sync`), aurora wash tuned to retro paper tints, related `BlogCard` uses v2                                                          |

### Phase 5 — Chat Universe (all custom components premium)

| ID     | Task                                                 | What                                                              | File(s)                                                                                     | Effort | DoD                                                                                                                                                                                            |
| ------ | ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5-T30 | **Mention system — uniform `MentionChip` kit**       | Consolidate inline project/skill refs                             | `src/components/ProjectMentionChip.tsx`, `SkillMentionChip.tsx`, new `MentionChip.tsx` base | 0.75   | Base `HudPanel v2 wash` + leading icon/cover 24-28px + label + chevron; `techIcons` for skill, `thumbnail_url` for project; token-only                                                         |
| P5-T31 | **Project list — from table to expandable grid**     | User: "project list project expand"                               | `src/components/ProjectTableView.tsx` → `ProjectMatchGrid.tsx`                              | 0.75   | Table → 2-col grid on desktop, `expand` chevron pushes `ProjectInlineDetail` with `spring(card)`; respects `skillFilter`                                                                       |
| P5-T32 | **Project mention → detail drawer**                  | User: "project mention and on click opening project details view" | `src/components/ProjectDetailModal.tsx` → `ProjectDetailDrawer.tsx`                         | 0.75   | Right drawer `h-[100dvh]` with `animate x [100%,0] spring(gentle)`, cover + description + tags + links, ESC + backdrop close, `data-graphic` bracket                                           |
| P5-T33 | **Skill mention custom UI**                          | User: "skills mention custom ui"                                  | `src/components/SkillCard.tsx`, `SkillGrid.tsx`                                             | 0.5    | Skill chips show `Si*` brand icon hex wash + level bar `StatBar`; inline vs grid via `inline` prop; `stagger 60` entrance                                                                      |
| P5-T34 | **Experience mention custom UI**                     | User: "experience mentioned custom ui"                            | `src/components/ExperienceTimeline.tsx`                                                     | 0.5    | Vertical rail `createDrawable` + `MorphOrb` nodes per role, company + duration + bullets, accent per index, reduced static rail                                                                |
| P5-T35 | **Chat atmosphere — vector backdrop + typing scope** | Premium chat skin                                                 | `src/components/home/ChatStream.tsx`, `ChatMessage.tsx`                                     | 0.75   | Chat well has subtle `GridLattice` 4% + `AuroraMesh` 0.06; typing indicator is mini `ScopeRings` tick loop; user bubbles `wash-yellow` wash, AI `wash-cyan` with `> AI.RESPONSE` mono label    |
| P5-T36 | **Message parsing & marker hardening**               | Marker pipeline robustness                                        | `src/utils/aiResponseParser.ts`, `src/pages/api/chat.ts` (read-only check)                  | 0.25   | No new LLM contract — parser covers `[[PROJECT_REF:n]]`, `[[SKILL_REF:n]]`, `[[PROJECT_LIST:n,n]]`, `[[SKILL_LIST:n,n]]`; stripMarkers tests added                                             |
| P5-T37 | **Chat input — final viewport pass**                 | Input is the primary action                                       | `src/components/home/ChatInputBar.tsx`, `ChatModalHost.tsx`                                 | 0.5    | Input inside viewport at all breakpoints (reuses P2 shell), `onOpen` affordance visible, send press `spring(bouncy)` `scale 0.98`, focus ring `wash-cyan` glow, `showClear` uses `HudPanel v2` |

### Phase 6 — Global Motion, Polish & QA

| ID     | Task                                   | Effort | DoD                                                                                                                                                                                            |
| ------ | -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P6-T38 | **Motion pass — hover/blend/magnetic** | 0.5    | Every interactive element gets `hoverAnim composition:blend` or `Tilt3D` or `MagneticButton`; tapped shows `Ripple`; verified at 60fps no layout thrash (`transform/opacity` only)             |
| P6-T39 | **Reduced-motion & a11y sweep**        | 0.5    | Every `animate/splitText/createDrawable/morphTo/spring` path has `isReducedMotion()                                                                                                            |     | !canAnimate()`→ opacity-only branch +`scope.revert()`; keyboard skip for boot; flash curtain has `prefers-reduced-motion: reduce → snap: none` |
| P6-T40 | **Performance & budget gate**          | 0.5    | Keep **one** `onScroll({sync:true})` (Background morph); rasterized canvas particles < 3ms/frame at 60fps; no new npm dep (reuse `animejs`, `lucide`, `react-icons`); `next build` 19 pages OK |
| P6-T41 | **Token hygiene pass**                 | 0.25   | `node scripts/generate-tokens.mjs --check` OK, `node scripts/token-lint.mjs --all --warn-legacy` 0 new violations; `techIcons` brand hex stays ignore-scoped                                   |
| P6-T42 | **QA matrix + screen recordings**      | 0.5    | Manual: boot flicker-free ×3 hard reloads, input-in-viewport 320/375/768/1024/1920, hero no duplicate header, blog swipe flash + stacked fallback, chat chips → drawer/grid, 60fps scroll      |
| P6-T43 | **Architecture graph update & docs**   | 0.25   | `docs/architecture-graph.svg` pre-push hook updates; remove any stale `docs/decisions` refs                                                                                                    |

**Total effort:** ~20–24 half-days ≈ **10–12 focused days** (1 engineer). Parallelize P1 boot + P1 bg, P3 panel + P3 chips.

---

## 5. Progress Tracker (live checkboxes)

Update these checkboxes as work merges. Do not delete rows — check them. Blocked items use `[!]` and a note.

### Legend

- `- [ ]` todo · `- [x]` done · `- [!]` blocked · `~` in-progress (write `~ P1-T06` in Daily Focus)
- `Priority`: `P0` must-first → `P1` high → `P2` medium → `P3` nice-to-have (none here — all load-bearing)

### Phase 0 — Foundation

- [ ] **P0-T01** Token audit & AAA palette PRD — P0 — `tokens.css` spec table signed
- [ ] **P0-T02** tokens.css expansion + codegen — P0 — `tokens:check` green
- [ ] **P0-T03** Motion hook extraction (`useMotionScope`, `useFlashCurtain`) — P0 — pilot proven
- [ ] **P0-T04** Viewport shell reset (`100dvh`, `--header-h`) — P0 — no layout shift

### Phase 1 — Boot & Background

- [ ] **P1-T05** `ScopeRings` + `SignalTicks` primitives — P1 — hairline, drawable, gated
- [ ] **P1-T06** `BootSequence` rebuild (scope→rings→wordmark→rule→status→exit) — P1 — <900ms, finished-promise, no flicker
- [ ] **P1-T07** Boot reduced-motion + skippable path — P1 — 120ms fallback, skip after 150ms
- [ ] **P1-T08** Background v2 (AuroraMesh + Starfield 50 + GridLattice) — P1 — 55-60fps, one sync listener
- [ ] **P1-T09** `ScanlineOverlay` → `GrainOverlay` — P2 — 0.02 paper grain, no loop
- [ ] **P1-T10** Boot+BG visual sign-off — P1 — 60fps recordings, `build` OK

### Phase 2 — Home Shell & Layout

- [ ] **P2-T11** Homepage viewport clamp (`100dvh` + sticky input) — **P0** — input visible at 667px
- [ ] **P2-T12** Kill hero-empty waste, re-home lattice — P1 — +160px viewport reclaimed
- [ ] **P2-T13** Header dedup + hide-on-hero `IntersectionObserver` — P1 — no duplicate name
- [ ] **P2-T14** `HeroSection` AAA pass (wash, techIcons, springs) — P1 — HUD chrome reads premium
- [ ] **P2-T15** `ChatStream` viewport + stagger refinement — P1 — smooth autoscroll
- [ ] **P2-T16** Responsive pass 320→1920 — P1 — no overflow, no overlap

### Phase 3 — Premium Component Library

- [ ] **P3-T17** `HudPanel v2` (wash+bracket+grid) — P0 — `wash` + `bracket` props landed
- [ ] **P3-T18** `ProjectStrip v2` AAA project cards — P1 — cover+tags+tech row, `cardLift`
- [ ] **P3-T19** `Project/Skill/Experience` mention chips — P1 — token-only, `role=button`
- [ ] **P3-T20** Icon integration (techIcons on home/strip) — P1 — brand icon where match
- [ ] **P3-T21** Vector hover (Tilt/magnetic/ripple) — P2 — gated `!isTouchDevice()`
- [ ] **P3-T22** `StatBar` AAA wash + `AnimatedCounter` spring — P2 — `wash-*` fills
- [ ] **P3-T23** Graphics primitives hardening + lint — P2 — `token-lint` clean

### Phase 4 — Blog Reborn

- [ ] **P4-T24** Blog theme skin — retro paper — P1 — `[data-theme=blog]` landed
- [ ] **P4-T25** Flash curtain + directional swipe (reels) — **P0** — amber flash + spring snap
- [ ] **P4-T26** Single-post full-bleed card redesign — P0 — `h-[44dvh]` + underline drawable
- [ ] **P4-T27** Expanded reader in-place overlay + `ReadingProgress` dots — P1 — slide up `spring(gentle)`
- [ ] **P4-T28** Blog index polish (search/drawer/empty) — P1 — drawer `HudPanel v2`, `decode()` preload kept
- [ ] **P4-T29** `blog/[slug]` retro polish (rAF parallax, related v2) — P1 — no second `onScroll sync`

### Phase 5 — Chat Universe

- [ ] **P5-T30** `MentionChip` kit (project/skill/experience) — P0 — uniform wash + icon
- [ ] **P5-T31** Project list → expandable grid — P1 — grid 2-col + inline `Detail`
- [ ] **P5-T32** Project mention → detail drawer (right) — P0 — `x [100%,0] spring(gentle)`
- [ ] **P5-T33** Skill mention custom UI (brand wash + bar) — P1 — `stagger 60`
- [ ] **P5-T34** Experience mention custom UI (rail + orbs) — P1 — `createDrawable` rail
- [ ] **P5-T35** Chat atmosphere (vector backdrop + typing scope) — P1 — `GridLattice 4%`, mini `ScopeRings`
- [ ] **P5-T36** Marker parsing & hardening (no new LLM contract) — P2 — unit tests
- [ ] **P5-T37** Chat input final viewport pass — P0 — input never offscreen (reuses P2 shell)

### Phase 6 — Global Motion, Polish & QA

- [ ] **P6-T38** Motion pass — hover/blend/magnetic/ripple — P1 — `transform/opacity` only, 60fps
- [ ] **P6-T39** Reduced-motion & a11y sweep — P0 — all paths gated, keyboard boot skip, flash off when RM
- [ ] **P6-T40** Performance & budget gate (one `onScroll sync`) — P0 — <3ms/frame particles, `build` OK
- [ ] **P6-T41** Token hygiene pass (`generate --check` + `token-lint`) — P0 — 0 new violations
- [ ] **P6-T42** QA matrix + screen recordings — P0 — boot ×3, viewport 320/375/768/1024/1920, chat chips, blog swipe/fallback
- [ ] **P6-T43** Architecture graph + docs — P2 — `architecture-graph.svg` updated, no stale refs

**Progress:** `0 / 43` — execution not yet started. Update this count as boxes check.

**Daily Focus (engineer writes one line per work session):**

```
YYYY-MM-DD — ~ P0-T01 — …
```

---

## 6. Dependency Graph & Parallelization

```
P0-T01 (spec) ──► P0-T02 (tokens+codegen) ──► everything else
                   │
                   ├─► P1 boot+bg chain (T05→T06→T07→T08→T10)  [serial, same files]
                   ├─► P2 shell (T11→T12→T13)  [parallel with P1 after T02]
                   ├─► P3 panel (T17) ──► T18/T19/T20  [T18 & T19 parallel]
                   ├─► P4 blog (T24→T25→T26→T27)  [T25 needs T02+T17]
                   └─► P5 chat (T30→T31→T32)  [T30 needs T02+T17; T35 independent]

P6 polish gates everything (T38-T43 after all phases land).
```

**Max parallel width:** 3 lanes (P1 / P2 / P3) after `P0-T02`. Never edit `tokens.css` concurrently — serialize token writes.

**Shared file ownership rule:** Each phase writes contiguous hunks; cross-phase file conflicts resolved by **token-only** vs **logic** split — Phase 0 owns `tokens.css`, Phase 2 owns `Homepage.tsx` layout, Phase 3 owns `HudPanel.tsx` props, Phase 5 owns `ChatMessage` routing.

---

## 7. Component Inventory (build / keep / delete)

### Keep (harden, not rewrite)

| Component                                                       | Keep Why                                                                           | Harden                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Background.tsx`                                                | Already aurora + single `onScroll sync` — good bones                               | Add starfield canvas, grid lattice, harden reduced guard   |
| `HudPanel.tsx`                                                  | Used 20 call sites (`ChatMessage`, `ProjectStrip`, `SkillCard`, `BlogCard`, `404`) | Extend to v2 (`wash`, `bracket`, `grid`) — not replace     |
| `StatBar.tsx`                                                   | 3 skeletons on home                                                                | Feed `wash-*` fills, keep spring entrance                  |
| `BlogReels.tsx`                                                 | Reels snap + preload already correct (`REELS_PAGE_SIZE=5`, `img.decode()`)         | Add `FlashCurtain`, do not reimplement snap                |
| `ChatStream.tsx`                                                | Correct `stagger` + `bottomRef`                                                    | Add vector backdrop + typing scope                         |
| `aiResponseParser.ts`                                           | Correctly parses `[[PROJECT_REF:` etc.                                             | Extend to `skill_ref` reuse, add `containsAnyMarker` tests |
| `techIcons.ts` + `IconPicker.tsx` + `SearchableMultiSelect.tsx` | 100 icons, category map, recent 8, `si:` prefix — done                             | Just wire to home/strip chips, not rework                  |

### Rebuild / Replace

| From                                               | To                                                      | Reason                                 |
| -------------------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| `BootSequence.tsx` 820ms letters+confetti          | Scope HUD loader (rings/ticks/rail)                     | Flicker + cheap typography             |
| `ScanlineOverlay.tsx` static 0.015 gradient        | `GrainOverlay` paper texture                            | CRT scanline mismatched editorial      |
| `ParticleField.tsx` 3 static blobs                 | `ParticleField v2` rAF starfield 50                     | Invisible on charcoal, not AAA         |
| `InlineProjectCard.tsx` Tailwind gradient          | `ProjectMentionChip.tsx` HUD wash                       | Raw `purple-500/20` not token, not HUD |
| `ProjectTableView.tsx` table                       | `ProjectMatchGrid.tsx` 2-col cards                      | Table not swipe/expand friendly        |
| `ProjectDetailModal.tsx` centered modal            | `ProjectDetailDrawer.tsx` right drawer `spring(gentle)` | Modal breaks chat context              |
| `Homepage.tsx` fixed `max-w-xl mt-8` empty graphic | Deleted hero-empty + lattice re-homed                   | +160px viewport waste, input offscreen |

### New (no existing equivalent)

- `ScopeRings.tsx`, `SignalTicks.tsx`, `GridLattice.tsx` — primitives
- `useMotionScope.ts`, `useFlashCurtain.ts` — hooks
- `FlashCurtain.tsx` — blog swipe VFX
- `MentionChip.tsx` — base for project/skill mentions
- `ProjectCard.tsx` — AAA card used by strip + chat expand
- `ProjectDetailDrawer.tsx` — chat mention detail

---

## 8. Risks & Mitigations

| Risk                                                                            | Likelihood | Impact | Mitigation                                                                                                                                                       |
| ------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boot flicker persists on Safari `sessionStorage` timing                         | Med        | High   | Guard: check `sessionStorage` _synchronously_ before first render, keep overlay `position: fixed; visibility: hidden` → `.is-mounted {visibility: visible}` gate |
| Input still offscreen on 667px dvh after shell fix                              | Med        | High   | Shell task P2-T11 has explicit 667px acceptance test + `calc(100dvh - 56 - 72 - safe)` token, not magic numbers                                                  |
| Adding retro blog theme leaks paper tokens site-wide                            | Low        | Med    | Scope to `[data-theme="blog"]` attribute on blog layout root only; `_app.tsx` never sets it                                                                      |
| Flash curtain janks on low-end Android                                          | Med        | Med    | Flash curtain is CSS `background` + `transform` only, `will-change: transform`, rAF not anime per-frame; reduced-motion → no curtain; QA on Moto G4 profile      |
| Two `onScroll({sync:true})` listeners (bg morph + blog parallax) violate budget | Low        | High   | Budget gate P6-T40 enforces ONE; blog parallax uses rAF transform as decided in ADR-09 — lint with `grep -R "onScroll.*sync.*true"` in CI                        |
| Token wash raise blows out editorial warmth                                     | Low        | Med    | Wash steps are 0.08→0.12 conservative; review at P2-T14 on actual hero before raising further                                                                    |
| Tech icon hex triggers new `token-lint` failures                                | High       | Low    | Per-line `// token-lint-ignore` on brand hex lines is already approved pattern; `tokens:check --warn-legacy` used, `--all` would false-positive                  |
| Chat parser new markers break existing RAG prompts in `api/chat.ts`             | Low        | High   | P5-T36 is parser-only, no prompt contract change; prompt `aiService.ts` kept read-only per AGENTS.md Do-not-touch — never edit it without human review           |

---

## 9. Verification & Definition of Done

### 9.1 Per-Task DoD

Each task row in §4 names its line-level DoD (no prose drift). In addition:

- **No edits** to `src/pages/api/**`, `src/utils/aiService.ts`/`aiResponseParser.ts`/`intentDetection.ts` beyond parser hardening, `src/utils/api.ts:945-1014` (`createExperience*` joins), `supabase/`, `install/supabase/`. If a schema need arises, propose a _migration file_ — do not patch in place.
- Every motion path has `isReducedMotion()||!canAnimate()` guarded branch + `scope.revert()` on unmount. Verified by `grep animate/createTimeline/splitText/createDrawable/spring`.
- Every SVG branch uses `var(--*)` tokens. Verified by `node scripts/token-lint.mjs --all --warn-legacy` (brand hex in `techIcons.ts` excluded).

### 9.2 Global Gate (must be green to merge)

```bash
npm run typecheck             # tsc --noEmit — 0
npm run lint                  # next lint — 0 new warnings
npm test                      # vitest — all suites green
npm run tokens:check          # generate --check + token-lint --warn-legacy — 0 violations
npm run build                 # next build — 19 pages compiled
# manual:
# - Boot flicker-free ×3 hard reloads (chrome, firefox, safari if avail) at 1920 + 375
# - Home input visible inside dvh at 667 / 812 / 844 / 900 / 1080
# - Header identity hides on hero, returns on scroll
# - Project/strip hover cardLift spring at 60fps, no layout shift
# - Blog reels: one card per dvh, swipe flash in/out, stacked fallback when prefers-reduced-motion
# - Chat: project mention → drawer, project list expand, skill chip brand wash + bar, experience rail
# - No input offscreen; no hero-empty waste; no duplicate header name
```

### 9.3 Performance Budget

- Aurora + starfield + grid: **< 3ms/frame** at 60fps on M1, < 8ms on Moto G4 CPU-throttled.
- Bundle delta: **no new npm dep**. `animejs`, `lucide-react`, `react-icons` covers all motion/icons.
- Timeline `TOTAL_MS` boot < 900ms; flash curtain 320ms; chat message stagger < 400ms wall.

---

## 10. How to Work This Plan

1. **Single owner:** one engineer owns the branch, updates this file's checkboxes in-place before each push (never a separate `progress.md`).
2. **Phase 0 first.** Do not start P1/P2/P3 before `P0-T02` (`tokens:check` green) — color is load-bearing.
3. **Small PRs:** land per-phase (P0 → P1 → P2 → P3 → P4 → P5 → P6) so review surfaces regressing.
4. **No scaffolding drift:** `src/styles/tokens.css` is the only token editor; PRs patching `tailwind.config.js` / `animations.ts` for color/duration/easing directly will fail `tokens:check`.
5. **Motion hygiene:** every new file that imports `animejs` must `import {isReducedMotion, canAnimate, durations, easings, springs}` and guard + `scope.revert()`.
6. **When blocked:** mark `[!]` in the tracker with reason (e.g. `waiting on hosted migration human review`) — never silent.
7. **When done:** this file's `0/43` becomes `43/43`, `npm run verify` green, screen recordings attached to PR body.

---

### Appendix A — File Touch Map (to avoid merge conflicts)

```
tokens.css, animations.ts, tailwind.tokens.generated.js .......... P0 only (owner: P0-T02)
BootSequence + ScopeRings + SignalTicks .......................... P1 (P1-T05/06)
Background + ParticleField + GridLattice + GrainOverlay ........... P1 (P1-T08/09)
Homepage + HudChrome + HeroSection + ChatStream .................. P2 (P2-T11..16)
HudPanel + ProjectStrip/ProjectCard + StatBar + Tilt3D ........... P3 (P3-T17..23)
blog/index + BlogReels + FlashCurtain + BlogCard + [slug] ........ P4 (P4-T24..29)
ChatMessage + MentionChip + ProjectMatchGrid + DetailDrawer ...... P5 (P5-T30..37)
Motion/a11y/perf/token sweeps ................................... P6 (P6-T38..43)
```

### Appendix B — References (sessions that led here)

- Past premium motion decisions removed: `docs/decisions/premium-motion-2026-09-09.md`, `phase-6-blog-reels.md` — superseded by this plan (flicker + viewport root causes not solved there).
- Config truth: `src/styles/tokens.css` (sole source), `src/config/animations.ts` (generated re-export), `tailwind.config.js` → `tailwind.tokens.generated.js`.
- App shell: `src/pages/_app.tsx` (Background/CursorGlow/BootSequence order), `src/styles/global.css` (utilities layer).
- Home chain: `Homepage.tsx` → `HudChrome.tsx` → `HeroSection.tsx` → `HeroChat.tsx` → `ChatStream.tsx` → `ChatInputBar.tsx` → `ProjectStrip.tsx`.
- Blog chain: `blog/index.tsx` → `BlogReels.tsx` → `BlogCard.tsx` → `BlogSearch.tsx` + `[slug].tsx` → `ReadingProgress.tsx` / `LightningTransition.tsx` + `RichTextRenderer.tsx`.
- Chat chain: `ChatMessage.tsx` → `aiResponseParser.ts` → `InlineProjectCard`/`SkillCard`/`SkillGrid`/`ExperienceTimeline`/`ProjectTableView`/`ProjectDetailModal` + `lib/techIcons.ts`.

### Appendix C — "Out of Actions" Interpretation

User wrote "kinda Out of Actions game like colors". Closest read is **high-saturation AAA HUD** (think _Out of Action_ / _Action_-genre shooter palette): deep charcoal chassis + saturated cyan/magenta/amber signals, not pastel editorial. This plan leans into that — warmer chassis kept, but accent washes and bracket HUD strokes are saturated and intentional, not muted 0.04 ghosts.

If "Out of Action" was meant literally as a specific game's palette, swap the `wash-*` hex in `P0-T01` spec without changing structure — tokens are the only file that needs editing.

---

_End of plan. Execution starts at P0-T01. Keep this file as the live tracker — do not create `tasks.md` / `progress.md` siblings._
