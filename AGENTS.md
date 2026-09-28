# AGENTS.md — Portfolio

> Read this before writing code. Stack facts last verified against `package.json` on 2026-09-27. Do not drift.

## Project

Cyberpunk portfolio for Fahim Ahmed — Pages Router chat experience (AI chat, project matching), filterable project grid, blog (`/blog`, `/blog/[slug]`), and an admin panel at `/sudosuperuser-ostaad` (projects, skills, blogs, site-texts, profile, meetings, knowledge, media, AI providers/models/usage). Persistence is entirely Supabase.

**Stack (exact):** `next@16.3.6` (Pages Router, `distDir: build`), `react@19.3.0` / `react-dom@19.3.0`, `animejs@4.5.0` (v4 API), `three@0.186` + `@react-three/fiber@9.8` + `@react-three/drei@10.7` (the scene layer), `tailwindcss@3.4` + `postcss@8.5`, `@supabase/supabase-js@2.99`, `vitest@4.1` (+ `jsdom@24`, `@testing-library/react@16`), `@playwright/test@1.63`, `typescript@5.9`, `eslint@9.39` (flat config) + `eslint-config-next@16.3`.

> ⚠️ The previous revision of this file claimed `next@12.1.6 / react@18.1 / typescript@4.6`. That was wrong by three major versions and cost real debugging time. **Read `package.json`, not this file, when the two disagree.**

## Directory map

| Path                          | What lives there                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`                  | Pages Router — `index.tsx`, `_app.tsx`, `_document.tsx`, `404.tsx`, `sitemap.xml.ts`, `blog/index.tsx`, `blog/[slug].tsx`, `sudosuperuser-ostaad/**` (admin, 10+ sub-pages), `api/**`                                                                                                                                                                                                                                           |
| `src/components/scene/`       | The single background owner — `SceneLayer.tsx` (route-aware host, picks the variant and decides WebGL vs fallback), `SceneCanvas.tsx` (r3f canvas + per-variant art direction), `ParticleField.tsx` (GPU points, custom vertex/fragment shader, message shockwave), `FloorGrid.tsx` (shader perspective floor), `CoreObject.tsx` (fresnel icosahedron + `ParallaxRig`). `StaticField` inside `SceneLayer` is the no-WebGL path. |
| `src/components/ui/`          | `BootSequence.tsx` (splash timeline), `HudPanel.tsx`, `NeonButton.tsx`, `NeonChip.tsx`, `GlitchText.tsx`, `StatBar.tsx`, `Tilt3D.tsx`, `CursorGlow.tsx`, `TypewriterText.tsx`, `AnimatedCounter.tsx`, `ScanlineOverlay.tsx`, `Ripple.tsx`, `MagneticButton.tsx`, `Toast.tsx`, `Tooltip.tsx`, `IconPicker.tsx`, `SearchableMultiSelect.tsx`, `RichTextEditor.tsx`, `useTypeaheadSuggestions.ts`, plus `forms/`                   |
| `src/components/home/`        | `HeroSection.tsx` (**sole owner of hero choreography**), `HeroChat.tsx` (counters + state switch only), `HudChrome.tsx`, `ChatStream.tsx`, `ChatInputBar.tsx`, `ChatModalHost.tsx`, `ProjectStrip.tsx`                                                                                                                                                                                                                          |
| `src/components/blog/`        | `BlogHeader.tsx` (sticky header: search + filter icon buttons), `BlogGrid.tsx` (default view), `BlogReels.tsx` (opt-in view), `BlogCard.tsx`, `ReadingProgress.tsx`, `LightningTransition.tsx`, `FlashCurtain.tsx`                                                                                                                                                                                                              |
| `src/components/admin/`       | `AdminLayout.tsx`, `AuthScreens.tsx`, `BlogForm.tsx`, `ConfirmDeleteModal.tsx`                                                                                                                                                                                                                                                                                                                                                  |
| `src/hooks/`                  | `useSceneQuality.ts` (WebGL probe + device tier + tab visibility), `useMotionScope.ts`, `useScrollAnimation.ts`, `useHover.ts`, `useDraggableCard.ts`, `useTimeline.ts`, `useStagger.ts`, `useTypewriter.ts`, `useTextScramble.ts`, `useFormAnimation.ts`, `useBoot.ts`, `useEnhancedSuggestions.ts`, `useFlashCurtain.ts`, `useCoverPreload.ts`, `index.ts`                                                                    |
| `src/config/identity.ts`      | **Single source of truth for the site owner name/handle.** `config.json` → Supabase, with CMS placeholders ("Your Name") rejected. Every surface reads this.                                                                                                                                                                                                                                                                    |
| `src/config/animations.ts`    | Duration/easing/spring/accent presets — **generated from `tokens.css`** (see contract)                                                                                                                                                                                                                                                                                                                                          |
| `src/styles/tokens.css`       | Single source of truth — v5 "Aurora Nocturne". 3 primary accents (`--neon-cyan` `--neon-violet` `--neon-coral`) + 3 supports (`--neon-amber` `--neon-lime` `--neon-ice`), plus `--key-light` / `--rim-light` / `--scene-*` depth tokens                                                                                                                                                                                         |
| `src/styles/global.css`       | Tailwind layers + utilities (`.clip-notch-*`, `.hud-glow-*`, `.glass`, `.text-shadow-neon-*`) — imports `tokens.css`                                                                                                                                                                                                                                                                                                            |
| `src/utils/api.ts`            | Public data layer — `getPortfolio*`, `clearPortfolioCache()` (20 call sites), legacy `getProjects`/`getSkills`                                                                                                                                                                                                                                                                                                                  |
| `src/utils/supabase.ts`       | Browser Supabase client (anon / RLS)                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/utils/supabaseAdmin.ts`  | Server-only `supabaseAdmin`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `install/supabase/`           | Canonical SQL — `schema.sql`, `ai_schema.sql`, `experiences_schema.sql`                                                                                                                                                                                                                                                                                                                                                         |
| `supabase/`                   | Local Supabase config / migrations (if present)                                                                                                                                                                                                                                                                                                                                                                                 |
| `e2e/`                        | Playwright specs — `homepage.spec.ts`, `chat-api.spec.ts`, `admin.spec.ts`, `blog-admin.spec.ts`, `global-setup.ts`                                                                                                                                                                                                                                                                                                             |
| `src/types/`                  | Shared types (`blog.ts`)                                                                                                                                                                                                                                                                                                                                                                                                        |
| `scripts/generate-tokens.mjs` | Token codegen (CSS → TS + Tailwind)                                                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/token-lint.mjs`      | Pre-commit token guard                                                                                                                                                                                                                                                                                                                                                                                                          |

## Design-token contract

**`src/styles/tokens.css` is the ONLY source of truth** for color (`--neon-*`, `--glow-*`, `--bg-*`, `--text-*`, `--glass-*`), duration (`--dur-*`), easing (`--ease-*`), and spring (`--spring-*`) tokens.

Derived files are **generated** — never hand-edited:

- `tailwind.tokens.generated.js` (`colors` + `fontFamily` + `transitionDuration` + `transitionTimingFunction`) ← `src/styles/tokens.css` via `scripts/generate-tokens.mjs`
- `src/config/animations.ts#accentConfig` (+ `durations`/`easings`/`springs`) ← `src/styles/tokens.css` via `scripts/generate-tokens.mjs` → `src/config/generated/tokens.generated.ts`

**Accent vocabulary:** exactly six names — `cyan`, `violet`, `coral` (primary) and `amber`, `lime`, `ice` (support). They are declared once in `scripts/generate-tokens.mjs#EXPECTED_ACCENTS` and re-exported as `AccentColor` from `src/config/animations.ts`. **Components import that type; they never declare their own union and never add a "legacy alias" branch.** Twelve duplicate local unions plus a 14-entry `NeonButton` map were the reason a 15-hue palette existed. To add an accent: add `--neon-x` + `--glow-x` + `--glow-x-sm` to `tokens.css`, add the name to `EXPECTED_ACCENTS`, add a `[data-accent='x']` block, regenerate.

## Scene contract (Three.js)

`src/components/scene/SceneLayer.tsx` is mounted **once**, from `_app.tsx`. No page or component may mount a second background — doing so doubled the particle field, grid, scanlines and aurora.

- **One canvas per route.** `SceneLayer` picks `hero | chat | blog` and hands it to `SceneCanvas`, which owns the per-variant art direction (density, size, grid strength, camera distance). Do not scatter those numbers into components.
- **Fail closed.** `useSceneQuality` probes for WebGL and falls back to the static `StaticField` SVG on failure, on `prefers-reduced-motion`, and on low-power devices. It fails to _no scene_, never to a thrown error — this repo has been bitten by WebGL in headless environments before.
- **Shaders must not need extensions.** An `fwidth()` call in `FloorGrid` needed the derivatives extension on WebGL1 and silently took the whole floor offline. Anti-alias by passing a width uniform instead.
- **Uniforms live in a `useMemo`, not in a ref effect.** r3f's material ref is null on the first effect pass.
- **Chat ties into the scene via window events.** `Homepage` dispatches `portfolio:chat-mode` (hero → chat) and `portfolio:chat-send` (shockwave); `_app` owns the listener.

**Hard rule:** change a token in `tokens.css` then run `npm run tokens:generate`. Never patch `tailwind.config.js` or `animations.ts` to tweak a color/duration/easing directly — CI (`tokens:check`) will fail the PR.

```
tokens.css  ──generate-tokens.mjs──►  tailwind.tokens.generated.js
                                └──►  src/config/generated/tokens.generated.ts  (re-exported by animations.ts)
```

`global.css` utilities (`clip-notch-*`, `hud-glow-*`, `glass`, `text-shadow-neon-*`) consume `var(--*)` — they are not a second source of truth.

## Animation contract (anime.js v4)

All motion uses `animejs@4.5.0` v4 API. Durations/easings come from `src/config/animations.ts` which is itself generated from `tokens.css` — do not hardcode `duration` / `ease` literals.

| Pattern                                       | Canonical usage — copy this shape                                                                                                                                                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`createScope` per component root**          | `useScrollAnimation.ts:68` `createScope({ root, mediaQueries:{reduceMotion…}, defaults:{duration:800,ease:'outExpo'}})` · `useHover.ts:8` `createScope({ root })` — always `scope.revert()` in cleanup                                                                 |
| **`createTimeline` for sequences**            | `BootSequence.tsx` `createTimeline({defaults:{ease:'outExpo'},onComplete…})` then `tl.add(letters,{…spring…},0)` · `useTimeline.ts:101` `const tl=createTimeline(tlOptions); targets.forEach(t=>tl.add(targetEl,animParams,position))`                                 |
| **`stagger` for grids**                       | `Background.tsx:71` `delay: stagger(durations.stagger*1000,{from:'first'})` · `blog/index.tsx:64` `delay: stagger(70,{from:'first'})`                                                                                                                                  |
| **`onScroll({sync:true})` for scroll-driven** | `Background.tsx:81` `autoplay:onScroll({sync:true})` (morph scrub) · `useScrollAnimation.ts:68` `autoplay: onScroll({target,container,sync,start,end,threshold,onUpdate})`                                                                                             |
| **`spring()` for physical release**           | `useDraggableCard.ts:91` `releaseEase:createSpring({stiffness:200,damping:20})` · `ProjectDetailModal.tsx:53` `…spring({stiffness:150,damping:16})` (modal entrance). CSS token presets: `--spring-stiff/--spring-soft/--spring-bouncy` → `springs` in `animations.ts` |
| Tokens                                        | `durations.*` / `easings.*` / `springs.*` from `animations.ts` (generated). Imports like `import {durations,easings} from '../config/animations'`                                                                                                                      |

Rules: respect `prefers-reduced-motion` (`isReducedMotion()` / `canAnimate()`), use `composition:'blend'` for hover layers, clean up scopes/timelines on unmount.

## Data-layer contract

- **Supabase is the only data source** (no external CMS, no file-backed fallback beyond legacy GitHub raw `Skills.md`/`Projects.md` gated by `CACHE_TTL_MS`).
- `src/utils/supabase.ts` — browser client, anon/publishable key, RLS-scoped, `persistSession:true` / `PKCE`. Reads only.
- `src/utils/supabaseAdmin.ts` — **server-only** (`SUPABASE_SECRET_KEY` > `NEXT_PUBLIC_SUPABASE_SECRET_KEY` > `SUPABASE_SERVICE_ROLE_KEY`), `persistSession:false`. Used only in `src/pages/api/**` admin handlers. Never import it in a component.
- Writes go through `POST /api/admin/content` (`action` + `payload`/`id`) with `MUTATING_ACTIONS` set in `src/utils/api.ts`.
- **Cache invalidation:** `clearPortfolioCache()` in `src/utils/api.ts:70` (memory + `localStorage` + `inFlight` dedup, `CACHE_TTL_MS=5min`). Called at **~20 sites** — after every `create*/update*/delete*` path (skills, projects, media, knowledge, meetings, profile, experiences). Preserve this on new write paths.

## Do-not-touch (requires human review)

Do not edit without an explicit request + review — these carry secrets, RLS, or migration history:

- `src/pages/api/**` — admin auth, AI proxy, blogs, content router
- `src/utils/aiService.ts`, `src/utils/aiResponseParser.ts`, `src/utils/intentDetection.ts`
- `src/utils/api.ts:945-1014` — `createExperience` / `updateExperience` / `deleteExperience` (joins `experience_projects`)
- `supabase/` — migrations / config
- `install/supabase/` — canonical SQL (`schema.sql`, `ai_schema.sql`, `experiences_schema.sql`)

Prefer reading over patching: propose a migration file instead of in-place schema edits.

## How to verify your own work

Run these from repo root. Fix failures before pushing — CI runs the same.

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm test               # vitest run
npm run test:e2e       # playwright test  (needs `npx playwright install` once)
npm run tokens:check   # token codegen drift + token-lint (see below)
npm run verify         # all of the above in sequence
```

Manual `scripts/generate-tokens.mjs` checks:

```bash
node scripts/generate-tokens.mjs          # regenerate
node scripts/generate-tokens.mjs --check  # CI/pre-commit — exits 1 if generated files would change
node --check scripts/generate-tokens.mjs  # syntax check
```

`tokens:check` runs `generate-tokens.mjs --check` and `token-lint.mjs` (`--all` in CI, staged files in pre-commit). `token-lint` flags raw `#[0-9a-fA-F]{3,8}`, raw `rgba(`, and ad-hoc `duration-*`/`ease-*` Tailwind classes not backed by `--dur-*`/`--ease-*`.

If you touched `src/styles/tokens.css`: `npm run tokens:generate && npm run tokens:check` must be green.

## Repo hygiene

- **Pre-commit** (Husky `.husky/pre-commit`): `lint-staged` → `next lint` + `node scripts/token-lint.mjs` (staged `*.ts,*.tsx,*.css`) + `node scripts/generate-tokens.mjs --check`.
- **Commit messages** (`commitlint`): Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, …). `commit-msg` hook enforces this.
- **Architecture graph** (`/graphify` / graphify hook): `dependency-cruiser` / `madge` → `docs/architecture-graph.svg` on pre-push. Do not hand-edit the SVG.
- **CI** (`.github/workflows/*`): `typecheck` → `lint` → `tokens:check` → `test` → `test:e2e` (with Supabase preview). `npm run verify` mirrors CI locally.

Keep diffs minimal, tokens in `tokens.css`, and animations via `src/config/animations.ts` presets.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **terminal-portfolio** (2997 symbols, 6178 relationships, 253 execution flows).

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
