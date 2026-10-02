# AGENTS.md — Portfolio

> Read this before writing code. Stack facts verified against `package.json` and the
> working tree on 2026-09-28. If this file and `package.json` disagree, **`package.json`
> wins** — and fix this file in the same commit.

## Project

Cyberpunk portfolio for Fahim Ahmed. Pages Router chat experience (AI chat, project
matching), filterable project grid, blog (`/blog`, `/blog/[slug]`), and an admin panel
at `/sudosuperuser-ostaad`. Persistence is entirely Supabase.

**Stack (exact):** `next@16.3.6` (Pages Router, `distDir: build`), `react@19.3.0` /
`react-dom@19.3.0`, `animejs@4.5.0` (v4 API), `three@0.186` + `@react-three/fiber@9.8` +
`@react-three/drei@10.7` (the scene layer), `tailwindcss@3.4` + `postcss@8.5`,
`@supabase/supabase-js@2.99`, `vitest@4.1` (+ `jsdom@24`, `@testing-library/react@16`),
`@playwright/test@1.63`, `typescript@5.9`, `eslint@9.39` (flat config) +
`eslint-config-next@16.3`.

> ⚠️ An earlier revision of this file claimed `next@12.1.6 / react@18.1 / typescript@4.6`.
> That was wrong by three major versions and cost real debugging time. **Read
> `package.json`, not this file, when the two disagree.**

## Directory map

| Path                       | What lives there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`               | Pages Router — `index.tsx`, `_app.tsx`, `_document.tsx`, `404.tsx`, `sitemap.xml.ts`, `blog/index.tsx`, `blog/[slug].tsx`, `sudosuperuser-ostaad/**` (admin), `api/**`                                                                                                                                                                                                                                                                                                                                                              |
| `src/components/` (root)   | `Homepage.tsx` (chat orchestration + project grid), `AdvancedFeaturesBar.tsx`, `ContactForm.tsx`, `MeetingForm.tsx`, `ProjectMatchForm.tsx`, `ProjectMatchGrid.tsx`, `ProjectDetailDrawer.tsx`, `ProjectInlineRef.tsx`, `InlineProjectCard.tsx`, `ProjectPreview.tsx`, `SkillCard/SkillFilterPanel/SkillGrid.tsx`, `ChatMessage.tsx`, `MessageOverlay.tsx`, `MentionChip.tsx`, `ExperienceTimeline.tsx`, `RichTextRenderer.tsx`, `SEOMeta.tsx`, `ErrorBoundary.tsx`                                                                 |
| `src/components/home/`     | `HeroSection.tsx` (**sole owner of hero choreography**), `HeroChat.tsx` (counters + state switch only), `HudChrome.tsx`, `ChatStream.tsx`, `ChatInputBar.tsx`, `ChatModalHost.tsx`, `ProjectStrip.tsx`                                                                                                                                                                                                                                                                                                                              |
| `src/components/scene/`    | The single background owner — `SceneLayer.tsx` (route-aware host, picks the variant and decides WebGL vs fallback), `SceneCanvas.tsx` (r3f canvas + per-variant art direction), `ParticleField.tsx` (GPU points, custom vertex/fragment shader, message shockwave), `FloorGrid.tsx` (shader perspective floor), `CoreObject.tsx` (fresnel icosahedron + `ParallaxRig`), `NeonTubes.tsx`, `TubeStrip.tsx`, `palette.ts`                                                                                                              |
| `src/components/ui/`       | `BootSequence.tsx` (splash timeline), `HudPanel.tsx`, `NeonButton.tsx`, `NeonChip.tsx`, `GlitchText.tsx`, `StatBar.tsx`, `Tilt3D.tsx`, `CursorGlow.tsx`, `TypewriterText.tsx`, `AnimatedCounter.tsx`, `AccentSwitcher.tsx`, `RouteTransition.tsx`, `Ripple.tsx`, `MagneticButton.tsx`, `Toast.tsx`, `Tooltip.tsx`, `IconPicker.tsx`, `SearchableMultiSelect.tsx`, `RichTextEditor.tsx`, `TypeaheadSuggestions.tsx`, `useTypeaheadSuggestions.ts`, plus `forms/` and `graphics/` (`primitives/`, `compositions/`, `seededRandom.ts`) |
| `src/components/blog/`     | `BlogHeader.tsx` (sticky header: search + filter icon buttons), `BlogGrid.tsx` (default view), `BlogReels.tsx` (opt-in view), `BlogCard.tsx`, `ReadingProgress.tsx`, `LightningTransition.tsx`, `FlashCurtain.tsx`                                                                                                                                                                                                                                                                                                                  |
| `src/components/admin/`    | `AdminLayout.tsx`, `BlogForm.tsx`, `ConfirmDeleteModal.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/components/HUD/`      | `ScrollIndicator.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/hooks/`               | `useSceneQuality.ts` (WebGL probe + device tier + tab visibility), `useMotionScope.ts`, `useScrollAnimation.ts`, `useHover.ts`, `useDraggableCard.ts`, `useTimeline.ts`, `useStagger.ts`, `useTypewriter.ts`, `useTextScramble.ts`, `useFormAnimation.ts`, `useEnhancedSuggestions.ts`, `useFlashCurtain.ts`, `useCoverPreload.ts`, `useMotionPreference.ts`, `useScenePointer.ts`, `index.ts`                                                                                                                                      |
| `src/utils/`               | Public data layer `api.ts`; browser client `supabase.ts`; **server-only** `supabaseAdmin.ts`; `aiService.ts`, `aiApi.ts`, `aiResponseParser.ts`, `intentDetection.ts`, `suggestionGenerator.ts`; `adminAuth.ts`, `adminPageGuard.ts`, `blogApi.ts`, `csrf.ts`, `rateLimit.ts`, `errorMessage.ts`, `animatable.ts`                                                                                                                                                                                                                   |
| `src/config/identity.ts`   | **Single source of truth for the site owner name/handle.** `config.json` → Supabase, with CMS placeholders ("Your Name") rejected. Every surface reads this.                                                                                                                                                                                                                                                                                                                                                                        |
| `src/config/animations.ts` | Duration/easing/spring/accent presets — **generated from `tokens.css`** (see contract)                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/lib/techIcons.ts`     | Tech-name → icon mapping                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/types/`               | Shared types (`blog.ts`, `project.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/styles/tokens.css`    | Single source of truth — v5 "Aurora Nocturne". 3 primary accents (`--neon-cyan` `--neon-violet` `--neon-coral`) + 3 supports (`--neon-amber` `--neon-lime` `--neon-ice`), plus `--key-light` / `--rim-light` / `--scene-*` depth tokens                                                                                                                                                                                                                                                                                             |
| `src/styles/global.css`    | Tailwind layers + utilities (`.clip-notch-*` — border-radius aliases, `.accent-hairline`, `.rounded-card`, `.glass`, `.reveal`, local `.sr-only`) — imports `tokens.css`. **`hud-glow-*` / `text-shadow-neon-*` / `border-glow-*` are gone**; `accent-hairline` replaced them                                                                                                                                                                                                                                                       |
| `install/supabase/`        | Canonical SQL — `schema.sql`, `ai_schema.sql`, `blog_schema.sql`, `experiences_schema.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `supabase/migrations/`     | `001_mask_ai_keys.sql`, `002_increment_view_count.sql`, `003_reorder_experiences.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `e2e/`                     | Playwright specs — `homepage.spec.ts`, `chat-api.spec.ts`, `admin.spec.ts`, `blog-admin.spec.ts`, `global-setup.ts`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `scripts/`                 | `generate-tokens.mjs` (codegen), `token-lint.mjs` (guard), `graphify.mjs` (regenerates `docs/architecture-graph.svg`, via `npm run graph`), `dev.sh`, `build.sh`                                                                                                                                                                                                                                                                                                                                                                    |

## Design-token contract

**`src/styles/tokens.css` is the ONLY source of truth** for color (`--neon-*`, `--glow-*`,
`--bg-*`, `--text-*`, `--glass-*`), duration (`--dur-*`), easing (`--ease-*`), and spring
(`--spring-*`) tokens.

Derived files are **generated** — never hand-edited:

- `tailwind.tokens.generated.js` (`colors` + `fontFamily` + `transitionDuration` +
  `transitionTimingFunction`) ← `src/styles/tokens.css` via `scripts/generate-tokens.mjs`
- `src/config/generated/tokens.generated.ts` (+ `accentConfig`, `durations`, `easings`,
  `springs`, re-exported by `src/config/animations.ts`) ← same generator

**Accent vocabulary:** exactly six names — `cyan`, `violet`, `coral` (primary) and `amber`,
`lime`, `ice` (support). They are declared once in
`scripts/generate-tokens.mjs:34` (`EXPECTED_ACCENTS`) and re-exported as `AccentColor` from
`src/config/animations.ts`. **Components import that type; they never declare their own
union and never add a "legacy alias" branch.** Twelve duplicate local unions plus a
14-entry `NeonButton` map were the reason a 15-hue palette existed. To add an accent: add
`--neon-x` + `--glow-x` + `--glow-x-sm` to `tokens.css`, add the name to
`EXPECTED_ACCENTS`, add a `[data-accent='x']` block, regenerate.

`token-lint` fails on raw `#[0-9a-fA-F]{3,8}` and raw `rgba(` outside `tokens.css`, and on
ad-hoc `duration-*`/`ease-*` Tailwind classes not backed by `--dur-*`/`--ease-*`. It also
fails on stock-Tailwind colour utilities that bypass `tokens.css` (`text-amber-500`,
`bg-purple-200`, shade-less `text-cyan`); the allowed set is derived from
`tailwind.tokens.generated.js` rather than a hardcoded accent list, and unlike legacy debt
this rule is never downgraded by `--warn-legacy`. Escape a single line with a
`// token-lint-ignore` comment.

## Scene contract (Three.js)

`src/components/scene/SceneLayer.tsx` is mounted **once**, from `_app.tsx`. No page or
component may mount a second background — doing so doubled the particle field, grid,
scanlines and aurora.

- **One canvas per route.** `SceneLayer` picks `hero | chat | blog` and hands it to
  `SceneCanvas`, which owns the per-variant art direction (density, size, grid strength,
  camera distance). Do not scatter those numbers into components.
- **Fail closed.** `useSceneQuality.ts:32-34` probes `webgl2` → `webgl` →
  `experimental-webgl`, reads `prefers-reduced-motion` at `:95`, and falls back to
  `StaticField` (defined inside `SceneLayer.tsx:114`) on failure, on reduced motion, and on
  low-power devices. It fails to _no scene_, never to a thrown error — this repo has been
  bitten by WebGL in headless environments before.
- **Shaders must not need extensions.** An `fwidth()` call in `FloorGrid` needed the
  derivatives extension on WebGL1 and silently took the whole floor offline. Anti-alias by
  passing a width uniform instead.
- **Uniforms live in a `useMemo`, not in a ref effect.** r3f's material ref is null on the
  first effect pass.
- **Chat ties into the scene via window events.** `Homepage.tsx` dispatches
  `portfolio:chat-send` (`:129`) and `portfolio:chat-mode` (`:181`); `src/pages/_app.tsx:35-39`
  owns the listener and its cleanup.
- **The accent reaches the WebGL field through one render, not through CSS.**
  `palette.ts` memoises `--token` reads by name in a module-level `Map`, and scene
  colours are captured in `useMemo`ed `THREE.Color` uniforms rather than sampled per
  frame — so repainting CSS alone leaves the canvas on the old accent. The chain is:
  `AccentSwitcher` writes `data-accent` on `<html>` → calls `resetPaletteCache()` →
  which clears the memo **and** dispatches `portfolio:accent-change` on `window` →
  `SceneLayer.tsx` listens and bumps one render → `SCENE_ACCENTS()` returns a fresh
  array → memo deps change → r3f re-uploads `uColorA/B/C`. Both halves of
  `resetPaletteCache` are load-bearing; neither alone works. That listener is gated on
  `useWebGL` so the `StaticField` fallback adds no window listener.
- **The scene samples scroll inside the frame loop, never in its own listener.**
  `SceneAmbientDriver` reads `window.scrollY` once per `useFrame`. r3f's `frameloop` is
  `'always'` when visible and `'never'` when hidden, so scroll is read exactly as often
  as it can be needed and never while backgrounded — no rAF coalescer, nothing to tear
  down. Do not add a `scroll` listener or a `getBoundingClientRect` read here.
- **Scene-time constants are deliberately NOT `durations.*`.** `ambient.ts` holds
  simulation constants (a 2600 ms idle release, ~146 s / ~367 s attract periods, a 0.9 s
  shockwave decay). `durations.*` are anime.js UI timings and do not cover them; the
  precedent is `ParticleField`'s hardcoded `0.9` and `CoreObject`'s `speed = 0.08`. Do
  not "fix" these into `tokens.css` — they are physics, not motion design.
- **Ambient effects on the field must be a lift, never a dim.** `aliveGain()` is bounded
  below by exactly 1.0, so a resting scene can only make a chat send brighter. If you add
  a resting effect that can subtract from `uOpacity`, a message shockwave can get swallowed.

## Animation contract (anime.js v4)

All motion uses `animejs@4.5.0` v4 API. Durations/easings come from
`src/config/animations.ts` which is itself generated from `tokens.css` — do not hardcode
`duration` / `ease` literals.

| Pattern                                       | Canonical usage — copy this shape                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **`createScope` per component root**          | `createScope({ root, mediaQueries:{reduceMotion…}, defaults:{duration:800,ease:'outExpo'}})` · always `scope.revert()` in cleanup |
| **`createTimeline` for sequences**            | `createTimeline({defaults:{ease:'outExpo'},onComplete…})` then `tl.add(target, params, position)`                                 |
| **`stagger` for grids**                       | `delay: stagger(durations.stagger*1000, {from:'first'})`                                                                          |
| **`onScroll({sync:true})` for scroll-driven** | `autoplay: onScroll({target,container,sync,start,end,threshold,onUpdate})`                                                        |
| **`spring()` for physical release**           | `createSpring({stiffness:200,damping:20})`. CSS token presets: `--spring-stiff/--spring-soft/--spring-bouncy` → `springs`         |
| Tokens                                        | `durations.*` / `easings.*` / `springs.*` from `animations.ts` (generated)                                                        |

Usage counts as a sanity signal for the API surface in play: `stagger(` ×84,
`animate(` ×58, `createScope(` ×24, `createTimeline(` ×10, `onScroll(` ×2.

Rules: respect `prefers-reduced-motion` (`isReducedMotion()` / `canAnimate()`), use
`composition:'blend'` for hover layers, clean up scopes/timelines on unmount.

**Never animate a node you are about to unmount.** `if (!isOpen) return null` in the same
component that runs a close animation detaches the node synchronously, so the exit runs on
a dead node and the visitor sees an instant cut. Own mount lifetime with an `isMounted`
state instead, run the exit as a `createTimeline`, and unmount from `onComplete`. This
shipped three times in this repo (`MessageOverlay.tsx`, `404.tsx`, `ProjectDetailDrawer.tsx`)
before anyone noticed. Two non-obvious requirements once you do it right:

- **A re-open mid-exit must not be unmounted by the stale `onComplete`.** Keep a token
  counter, increment it on open and on exit start, and compare before unmounting. The test
  must assert DOM node _identity_ (`expect(node).toBe(nodeBefore)`), not presence — a
  reverted-then-remounted node passes a visibility check while being a different element.
- **Navigation must not wait on `onComplete` alone.** `expoIn` puts most of its visible
  fade in the last ~20% of the timeline, so firing at 60% progress leaves the view ~94%
  opaque and reads as a cut-off. Wait for completion _and_ keep a `setTimeout` deadline, or
  one of the four fire paths is missing and a failed `onComplete` strands the visitor.

## Data-layer contract

- **Supabase is the only data source** (no external CMS, no file-backed fallback beyond
  legacy GitHub raw `Skills.md`/`Projects.md` gated by `CACHE_TTL_MS`).
- `src/utils/supabase.ts` — browser client, anon/publishable key, RLS-scoped. Reads only.
- `src/utils/supabaseAdmin.ts` — **server-only** (`SUPABASE_SECRET_KEY` >
  `NEXT_PUBLIC_SUPABASE_SECRET_KEY` > `SUPABASE_SERVICE_ROLE_KEY`), `persistSession:false`.
  Used only in `src/pages/api/**` admin handlers. Never import it in a component.
- Tables: `admin_sessions`, `admin_users`, `ai_models`, `ai_providers`, `ai_request_logs`,
  `blog_posts`, `contact_messages`, `experience_projects`, `experiences`,
  `knowledge_bases`, `meetings`, `profiles`, `project_media`, `projects`, `site_texts`,
  `skills`.
- Writes go through `POST /api/admin/content` (`action` + `payload`/`id`), gated by the
  `MUTATING_ACTIONS` set in `src/utils/api.ts:266` (16 actions: `upsertProfile`, skill
  CRUD ×3, project CRUD ×3, `addProjectMedia`, `deleteProjectMedia`, knowledge-base
  CRUD ×3, meeting CRUD ×3).
- **Cache invalidation:** `clearPortfolioCache()` is defined at `src/utils/api.ts:73` and
  is **not exported**; it has **19 call sites, all inside `src/utils/api.ts`**. The generic
  path is `api.ts:296` (after any successful `MUTATING_ACTIONS` call) plus 18 explicit
  post-write calls. **Any new write path must call it**, and because it is module-private,
  new callers must live in `api.ts` — if a new surface needs invalidation, add the call
  there rather than exporting the helper.

## Do-not-touch (requires human review)

Do not edit without an explicit request + review — these carry secrets, RLS, or migration
history:

- `src/pages/api/**` — admin auth, AI proxy, blogs, content router
- `src/utils/aiService.ts`, `src/utils/aiResponseParser.ts`, `src/utils/intentDetection.ts`
- `src/utils/supabaseAdmin.ts`, `src/utils/adminAuth.ts`, `src/utils/csrf.ts`
- `src/config/identity.ts` — the name allowlist is a security control
- `supabase/` and `install/supabase/` — canonical SQL

Prefer reading over patching: propose a migration file instead of in-place schema edits.
Line numbers here drift; grep for the symbol instead of trusting a cited line.

## How to verify your own work

Run these from repo root. Fix failures before pushing — CI runs the same.

```bash
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint .  (flat config, eslint.config.mjs)
npm test                     # vitest run
npm run test:e2e             # playwright test  (needs `npx playwright install` once)
npm run tokens:check         # codegen drift + token-lint --all --warn-legacy
npm run tokens:check:strict  # same, without --warn-legacy  ← what CI runs
npm run verify               # typecheck → lint → tokens:check:strict → test
```

`npm run verify` does **not** run `build` or the e2e suite — run those separately when the
change touches routing, API routes, or anything the unit tests stub.

Manual token checks:

```bash
node scripts/generate-tokens.mjs          # regenerate
node scripts/generate-tokens.mjs --check  # CI/pre-commit — exits 1 if generated files would change
node --check scripts/generate-tokens.mjs  # syntax check
```

If you touched `src/styles/tokens.css`: `npm run tokens:generate && npm run tokens:check`
must be green.

## Repo hygiene

- **Pre-commit** (`.husky/pre-commit`): runs `npx lint-staged`, which per
  `.lintstagedrc.json` applies `eslint --fix` + `prettier --write` to `*.{js,jsx,ts,tsx}`,
  `prettier` to `*.{json,md,css}`, `node scripts/token-lint.mjs --warn-legacy` to
  `*.{js,jsx,ts,tsx,css}`, and — when `src/styles/tokens.css` is staged — re-runs
  `generate-tokens.mjs` and re-stages the generated files. **The hook mutates staged
  content**: always re-verify the _committed_ blob (`git show HEAD:<file>`), never the
  pre-commit working state.
- **Commit messages** (`commit-msg`): Conventional Commits via `commitlint`
  (`feat:`, `fix:`, `chore:`, `docs:`, …). Validate before committing:
  `echo "msg" | npx --no -- commitlint`.
- **There is no `pre-push` hook.** `docs/architecture-graph.svg` is a tracked _generated_
  artifact — refresh it deliberately with `dependency-cruiser` / `madge`; nothing
  regenerates it for you.
- **CI** (`.github/workflows/ci.yml`): on push+PR to `main`/`master`, Node 24, five
  sequential jobs — `typecheck` → `lint` → `tokens:check:strict` → `test` → `test:e2e`.
  e2e needs the `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SECRET_KEY` repo secrets.
- `agent_docs/` and `session-*.md` are gitignored. Agent notes and session transcripts are
  local-only; transcripts in this repo have embedded live credentials in the past.

Keep diffs minimal, tokens in `tokens.css`, and animations via `src/config/animations.ts`
presets.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **terminal-portfolio** (2885 symbols, 6095 relationships, 243 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource                                            | Use for                                  |
| --------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/terminal-portfolio/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/terminal-portfolio/clusters`       | All functional areas                     |
| `gitnexus://repo/terminal-portfolio/processes`      | All execution flows                      |
| `gitnexus://repo/terminal-portfolio/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                               |
| -------------------------------------------- | -------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
