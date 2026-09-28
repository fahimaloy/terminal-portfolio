# CLAUDE.md — Portfolio

> Working agreement for Claude Code in this repo. `AGENTS.md` is the longer reference;
> this file is the short operational version. **If the two disagree, `package.json` wins**
> and you fix the file you were wrong about in the same commit.

## What this is

Next.js 16 **Pages Router** cyberpunk portfolio: an AI chat + project-matching home page,
a filterable project grid, a blog (`/blog`, `/blog/[slug]`), and an admin panel at
`/sudosuperuser-ostaad`. Supabase is the only datastore. There is no external CMS.

**Stack, exact:** `next@16.3.6` (`distDir: 'build'`), `react`/`react-dom@19.3.0`,
`animejs@4.5.0` (v4 API), `three@0.186` + `@react-three/fiber@9.8` + `@react-three/drei@10.7`,
`tailwindcss@3.4` + `postcss@8.5`, `@supabase/supabase-js@2.99`, `vitest@4.1` (jsdom 24,
@testing-library/react 16), `@playwright/test@1.63`, `typescript@5.9`, `eslint@9.39`
(flat config) + `eslint-config-next@16.3`.

> ⚠️ An earlier revision of the agent docs claimed `next@12.1.6 / react@18.1 / typescript@4.6`
> and burned a debugging session. **Read `package.json`, never trust a doc's version claims.**

Next 16 removed `next lint` — the lint script is `eslint .` against `eslint.config.mjs`.
Next 16 is also not the Next.js in your training data: read
`node_modules/next/dist/docs/` before writing anything that touches routing, data
fetching, or config.

## Commands

```bash
npm run dev                 # bash ./scripts/dev.sh
npm run build               # bash ./scripts/build.sh
npm run lint                # eslint .  (flat config — NOT `next lint`)
npm run typecheck           # tsc --noEmit
npm test                    # vitest run
npm run test:e2e            # playwright test  (needs `npx playwright install` once)
npm run tokens:generate     # regenerate token-derived files
npm run tokens:check        # codegen drift + token-lint --all --warn-legacy
npm run tokens:check:strict # same without --warn-legacy  ← what CI runs
npm run verify              # typecheck → lint → tokens:check:strict → test
```

`verify` deliberately excludes `build` and `test:e2e`. Run those yourself when the change
touches routing, API routes, or anything the unit tests stub.

## Four contracts you will violate by accident

1. **Tokens.** `src/styles/tokens.css` is the only source of truth. `tailwind.tokens.generated.js`
   and `src/config/generated/tokens.generated.ts` are generated — never hand-edited. Never
   patch a color in `tailwind.config.js`; change the token, then
   `npm run tokens:generate`. Exactly six accents exist (`cyan`, `violet`, `coral`, `amber`,
   `lime`, `ice`), declared in `scripts/generate-tokens.mjs:34`; components import
   `AccentColor` rather than re-declaring a union.
2. **One background.** `src/components/scene/SceneLayer.tsx` is mounted once, from
   `_app.tsx`. Mounting a second particle field, floor grid, or scanline overlay is a
   known past regression. `useSceneQuality` must always fail _closed_ to `StaticField`,
   never to a thrown error.
3. **Durations come from tokens.** `src/config/animations.ts` is generated from
   `tokens.css`. No hardcoded `duration` / `ease` literals in components.
4. **Cache invalidation.** `clearPortfolioCache` is module-private at
   `src/utils/api.ts:73` with 19 call sites, all in that file. New write paths must call
   it — and if the caller is outside `api.ts`, the call belongs in `api.ts`, not an export.

## Do not edit without explicit human sign-off

- `src/pages/api/**` — admin auth, AI proxy, blog and content routers
- `src/utils/supabaseAdmin.ts`, `adminAuth.ts`, `csrf.ts` — secrets and auth
- `src/utils/aiService.ts`, `aiResponseParser.ts`, `intentDetection.ts`
- `src/config/identity.ts` — its name allowlist is a security control
- `supabase/` and `install/supabase/` — RLS, secrets, migration history

Schema changes go in a **new migration file**, never an in-place edit of existing SQL.

## Hooks and CI

`.husky/pre-commit` runs `npx lint-staged`, which reformats and re-stages your files
(`eslint --fix`, `prettier --write`, `token-lint`, and token regeneration when
`src/styles/tokens.css` is staged). So the working tree is not what you wrote — after
committing, verify the **committed blob** with `git show HEAD:<file>`.
`.husky/commit-msg` enforces Conventional Commits; validate with
`echo "msg" | npx --no -- commitlint` before you commit.

CI (`.github/workflows/ci.yml`, Node 20) runs five sequential jobs:
`typecheck` → `lint` → `tokens:check:strict` → `test` → `test:e2e`.

## Housekeeping

`agent_docs/`, `session-*.md`, `.gitnexus/`, `.opencode/`, `.superpowers/` and
`.claude/settings.local.json` are gitignored — local scratch only. Session transcripts in
this repo have embedded live credentials in the past; never stage, commit, or paste one.
Keep diffs small; when you touch a token, touch the token file, not the generated output.

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
