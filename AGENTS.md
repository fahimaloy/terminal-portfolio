# AGENTS.md — Portfolio

> Read this before writing code. Grounded in the actual repo audit (Sep 2025). Do not drift.

## Project

Cyberpunk portfolio for Fahim Ahmed — Pages Router chat experience (AI chat, project matching), filterable project grid, blog (`/blog`, `/blog/[slug]`), and an admin panel at `/sudosuperuser-ostaad` (projects, skills, blogs, site-texts, profile, meetings, knowledge, media, AI providers/models/usage). Persistence is entirely Supabase.

**Stack (exact):** `next@12.1.6` (Pages Router), `react@18.1.0` / `react-dom@18.1.0`, `animejs@4.5.0` (v4 API), `tailwindcss@3.0.24` + `autoprefixer@10.4.7` + `postcss@8.4.13`, `@supabase/supabase-js@2.99.0`, `vitest@1.6.1` (+ `jsdom@24`, `@testing-library/react@14`), `@playwright/test@1.62.1`, `typescript@4.6.4`, `eslint@8.15.0` + `eslint-config-next@12.1.6`.

## Directory map

| Path                          | What lives there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`                  | Pages Router — `index.tsx`, `_app.tsx`, `_document.tsx`, `404.tsx`, `sitemap.xml.ts`, `blog/index.tsx`, `blog/[slug].tsx`, `sudosuperuser-ostaad/**` (admin, 10+ sub-pages), `api/**`                                                                                                                                                                                                                                                                                                                |
| `src/components/ui/`          | ~27 components — `Background.tsx`, `BootSequence.tsx`, `HudPanel.tsx`, `NeonButton.tsx`, `GlitchText.tsx`, `StatBar.tsx`, `Tilt3D.tsx`, `TronGrid.tsx`, `ParticleField.tsx`, `CursorGlow.tsx`, `TypewriterText.tsx`, `AnimatedCounter.tsx`, `ScanlineOverlay.tsx`, `Ripple.tsx`, `MagneticButton.tsx`, `Toast.tsx`, `Tooltip.tsx`, `NeonChip.tsx`, `IconPicker.tsx`, `SearchableMultiSelect.tsx`, plus `forms/` (`TextInput`, `TextArea`, `Select`, `TagInput`, `Toggle`, `FileUpload`, `FormField`) |
| `src/components/home/`        | `HeroSection.tsx`, `HudChrome.tsx`, `ChatInputBar.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/components/blog/`        | `BlogCard.tsx`, `BlogSearch.tsx`, `ReadingProgress.tsx`, `LightningTransition.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/components/admin/`       | `AdminLayout.tsx`, `AuthScreens.tsx`, `BlogForm.tsx`, `ConfirmDeleteModal.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/components/projects/`    | `ProjectGrid.tsx`, `ProjectDetail.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/components/HUD/`         | `ScrollIndicator.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/hooks/`                  | 11 hooks — `useScrollAnimation.ts`, `useHover.ts`, `useDraggableCard.ts`, `useTimeline.ts`, `useStagger.ts`, `useTypewriter.ts`, `useTextScramble.ts`, `useFormAnimation.ts`, `useBoot.ts`, `useEnhancedSuggestions.ts`, `index.ts`                                                                                                                                                                                                                                                                  |
| `src/config/animations.ts`    | Duration/easing/spring/accent presets — **generated from `tokens.css`** (see contract)                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/styles/tokens.css`       | Single source of truth — all `--neon-*`, `--glow-*`, `--dur-*`, `--ease-*`, `--spring-*` vars                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/styles/global.css`       | Tailwind layers + utilities (`.clip-notch-*`, `.hud-glow-*`, `.glass`, `.text-shadow-neon-*`) — imports `tokens.css`                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/utils/api.ts`            | Public data layer — `getPortfolio*`, `clearPortfolioCache()` (20 call sites), legacy `getProjects`/`getSkills`                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/utils/supabase.ts`       | Browser Supabase client (anon / RLS)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/utils/supabaseAdmin.ts`  | Server-only `supabaseAdmin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `install/supabase/`           | Canonical SQL — `schema.sql`, `ai_schema.sql`, `experiences_schema.sql`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `supabase/`                   | Local Supabase config / migrations (if present)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `e2e/`                        | Playwright specs — `homepage.spec.ts`, `chat-api.spec.ts`, `admin.spec.ts`, `blog-admin.spec.ts`, `global-setup.ts`                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/types/`                  | Shared types (`blog.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/generate-tokens.mjs` | Token codegen (CSS → TS + Tailwind)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `scripts/token-lint.mjs`      | Pre-commit token guard                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Design-token contract

**`src/styles/tokens.css` is the ONLY source of truth** for color (`--neon-*`, `--glow-*`, `--bg-*`, `--text-*`, `--glass-*`), duration (`--dur-*`), easing (`--ease-*`), and spring (`--spring-*`) tokens.

Derived files are **generated** — never hand-edited:

- `tailwind.config.js` `extend.colors` / `fontFamily` / `keyframes` ← `src/styles/tokens.css` via `scripts/generate-tokens.mjs` → `tailwind.tokens.generated.js`
- `src/config/animations.ts#accentConfig` (+ `durations`/`easings`) ← `src/styles/tokens.css` via `scripts/generate-tokens.mjs` → `src/config/generated/tokens.generated.ts`

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
