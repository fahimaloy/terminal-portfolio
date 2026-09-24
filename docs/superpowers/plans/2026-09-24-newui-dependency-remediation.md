# Newui Dependency Remediation and Main Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task requires a fresh implementer, a task-scoped review, and a commit before the next task.

**Goal:** Make the current `newui` tree the verified, security-remediated source of truth, then safely recreate and force-push `main` from it.

**Architecture:** Keep the project on Next.js Pages Router while upgrading the framework and its peer dependencies in a staged sequence. Separate runtime/lockfile reproducibility, direct security floors, test tooling, and framework migration so each change can be reverted independently. The parent session owns the destructive final branch rewrite and force-push after all review and verification gates pass.

**Tech Stack:** Next.js 15.5.26 (with a documented escalation to 16.3.6 only if the verified PostCSS/Next dependency constraint cannot be resolved safely), React 19, TypeScript 4.9-compatible toolchain, Tailwind 3, anime.js 4, Supabase, Vitest 3.2.6 minimum, npm/package-lock.

**Spec:** Inline design approved in the dependency audit report and the user’s instruction: current `newui` is the source of truth; do not merge the historical `main`; do not rewrite or push until the newui branch is fixed, reviewed, and verified.

## Global Constraints

- Source of truth is the current `newui` branch at the start of this plan; do not merge the old `main` into it.
- Preserve Next.js Pages Router; do not introduce App Router files or routing patterns.
- Preserve `src/styles/tokens.css` as the only design-token source; never hand-edit generated token files. Run `npm run tokens:generate` and `npm run tokens:check` after build-tool changes.
- Preserve anime.js v4 patterns, reduced-motion behavior, and cleanup semantics.
- Preserve Supabase browser/server separation, RLS boundaries, and server-only admin client rules.
- Treat `src/pages/api/**`, `src/utils/aiService.ts`, and AI response/intent code as human-review surfaces; do not change AI behavior unless a dependency migration requires it.
- Use Node `24.17.0` (the existing `.nvmrc` value) as the minimum supported runtime; remove hardcoded Node 20 paths and align Docker, scripts, engines, and CI assumptions.
- Use npm and `package-lock.json` as the authoritative dependency graph. Do not leave `package-lock.json` and `yarn.lock` silently divergent; either remove the legacy lockfile after confirming no supported consumer or update it deliberately.
- Do not use `npm audit fix`, `ncu -u`, or `npm install` in Docker to silently resolve a different graph; use reviewed manifest/lockfile changes and `npm ci`.
- Do not edit generated files, suppress Dependabot alerts, or dismiss reachable critical alerts.
- Do not force-push or delete `main` until the final review, full verification, and branch-safety checks are green.
- No secrets, credentials, or environment values may be added to source, lockfiles, plans, or reports.

---

### Task 1: Establish reproducible Node and lockfile boundaries

**Files:**

- Modify: `package.json:9-30`
- Modify: `scripts/dev.sh:1-19`
- Modify: `scripts/build.sh:1-8`
- Modify: `Dockerfile:1-11`
- Modify: `.nvmrc` only if the existing `24.17.0` value must be normalized
- Modify or remove: `yarn.lock` only after confirming no supported script or workflow consumes it
- Inspect only: `install/install.sh`, root `dev.sh`, `.husky/*`, and any deployment scripts for package-manager assumptions

**Interfaces:**

- Produces one active Node runtime contract: Node `24.17.0` or newer approved patch.
- Produces one dependency installation contract: `package-lock.json` copied before `npm ci`.
- Consumes the existing `newui` branch and does not alter application behavior.

- [ ] **Step 1: Record the current baseline**

Run:

```bash
git status --short --branch
node --version
npm --version
npm ci
npm run verify
```

Save the command results in the task report. If the baseline fails, record the failure and fix only environment/setup issues before continuing.

- [ ] **Step 2: Align local scripts with `.nvmrc`**

Update `scripts/dev.sh` and `scripts/build.sh` so they source `nvm` when available, select the version from `.nvmrc`, and fall back to the already-active `node` executable rather than hardcoding `v20.19.6`. Preserve the existing environment-file loading and forwarded CLI arguments.

- [ ] **Step 3: Align package metadata and Docker installation**

Set `package.json` `engines.node` to `>=24.17.0`. Update `Dockerfile` to use the approved Node 24 Alpine image, copy `package.json` and `package-lock.json` before installation, run `npm ci`, then copy the source and run the build. Do not use `ncu -u` or an unlocked `npm install`.

- [ ] **Step 4: Resolve the second lockfile deliberately**

Search all tracked scripts/configuration for `yarn`. If no supported consumer exists, remove `yarn.lock` and update the stale installer guidance. If a supported consumer exists, update it to the same manifest and verify its lockfile separately; do not leave two independently generated graphs.

- [ ] **Step 5: Verify the task**

Run:

```bash
npm ci
npm run lint
npm run typecheck
npm run tokens:check
npm test
npm run build
```

Confirm `git diff --check` is clean. Commit with a Conventional Commit message such as:

```text
chore: align node and lockfile workflow
```

---

### Task 2: Apply direct security floors without changing framework behavior

**Files:**

- Modify: `package.json:31-90`
- Modify: `package-lock.json`
- Modify: `yarn.lock` only if Task 1 rules that it remains supported
- Inspect/test: `src/components/ui/RichTextEditor.tsx`, `src/components/ui/WorkspaceCanvas.tsx`, `src/components/RichTextRenderer.tsx`, and existing related tests

**Interfaces:**

- Updates direct packages whose current lockfile versions are below the audited floors.
- Does not change public component props, editor output, canvas behavior, or AI APIs.

- [ ] **Step 1: Update direct packages to the audited floors**

Use these targets unless the current registry proves a newer compatible patch:

- All direct `@tiptap/*` packages: `^3.31.3`
- `dompurify`: `^3.4.16`
- `@react-three/drei`: `^9.122.0` for the React 18 path
- `@react-three/fiber`: `^8.18.0`
- `autoprefixer`: `^10.6.1`
- `tailwindcss`: `^3.4.19`
- `postcss`: `^8.5.28`
- `@playwright/test`: `^1.63.0`

Keep `lowlight` at its current compatible 3.x line unless the lockfile requires a security floor. Do not remove the editor, canvas, or image components just to eliminate a dependency path.

- [ ] **Step 2: Regenerate only the authoritative lockfile**

Run the approved package-manager update for the changed manifest, then inspect the lockfile diff. Do not accept unrelated major upgrades. Confirm no direct package is silently downgraded and no vulnerable direct floor remains.

- [ ] **Step 3: Run focused compatibility checks**

Run the existing tests covering:

- `RichTextEditor`
- `RichTextRenderer`
- `WorkspaceCanvas` or its fallback path
- project/blog image components
- `npm run tokens:check`

If a package upgrade requires a source change, keep the change minimal and preserve the existing component API.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run tokens:check
npm audit --package-lock-only
```

Record remaining advisories by direct/transitive path; do not claim the audit is clean if transitive advisories remain. Commit:

```text
fix: update direct security dependencies
```

---

### Task 3: Upgrade the test toolchain and repair test compatibility

**Files:**

- Modify: `package.json:61-90`
- Modify: `package-lock.json`
- Modify if required: `vitest.config.ts`
- Modify if required: `vitest.setup.ts`
- Modify only tests whose mocks/timers are incompatible with Vitest 3: `src/**/__tests__/**`, `src/**/*.test.ts`, `src/**/*.test.tsx`

**Interfaces:**

- Produces a Vitest 3-compatible unit-test runner while preserving test names, assertions, and coverage intent.
- Must not weaken tests by adding `test.only`, deleting assertions, or skipping failures without a documented reason.

- [ ] **Step 1: Upgrade Vitest and UI together**

Move `vitest` and `@vitest/ui` to the minimum fixed line `^3.2.6`. Keep `@vitejs/plugin-react` on a compatible 4.x release unless the resolved Vite version requires a reviewed plugin update. Do not use the current major blindly if the project’s TypeScript and test mocks require a smaller compatible step.

- [ ] **Step 2: Run the unit suite and classify failures**

Run:

```bash
npm ci
npm test -- --run
```

For each failure, distinguish a real product regression from a Vitest migration issue. Fix migration issues in test configuration or mocks; do not change production behavior solely to satisfy a test-runner default.

- [ ] **Step 3: Check timer and mock semantics**

Review tests using fake timers, `performance.now`, module mocks, reset behavior, and worker pools. Make the smallest deterministic adjustment and retain the original assertions.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run tokens:check
```

Commit:

```text
fix: upgrade test runner security baseline
```

---

### Task 4: Migrate Next.js and React while preserving Pages Router behavior

**Files:**

- Modify: `package.json:31-80`
- Modify: `package-lock.json`
- Modify if required for Next 15 compatibility: `next.config.js:1-73`
- Modify only if required by React 19 peer types: `src/types/**`, affected component type declarations, and test type declarations
- Test: all `src/components/**/__tests__/**`, `src/__tests__/**`, `e2e/**`, and API route build checks

**Interfaces:**

- Next remains a Pages Router application.
- Existing page routes, API routes, `next/image` call sites, Supabase clients, and component props remain compatible.
- React 19 migration must not change the server/client boundary or auth behavior.

- [ ] **Step 1: Select and apply the framework target**

Start with `next@15.5.26`, which is above the audited `15.5.24` security floor. Upgrade React and ReactDOM to the supported React 19 patch line and matching `@types/react`/`@types/react-dom` versions. If the verified lockfile still contains a vulnerable Next-bundled PostCSS chain and a safe override is not possible, use `next@16.3.6` as the documented fallback in this same task; record the reason in the report.

- [ ] **Step 2: Upgrade required peers together**

For React 19, update R3F/Drei to the compatible React 19 line and Testing Library React/DOM to the versions required by the selected framework. Do not mix R3F 8/Drei 9 peer assumptions with React 19. Do not migrate App Router.

- [ ] **Step 3: Make minimal Next configuration changes**

Remove or update configuration options rejected by the selected Next release. Keep the existing image allowlist, rewrites, headers, source-map policy, and token pipeline unless a security or build error requires a documented change. Do not hand-edit generated token files.

- [ ] **Step 4: Run the framework validation set**

Run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run tokens:check
npm run build
```

Verify all `next/image` call sites compile, API routes remain server-only where required, and no App Router files were created.

- [ ] **Step 5: Commit the framework migration**

Commit:

```text
feat: upgrade next and react security baseline
```

---

### Task 5: Resolve build-tool and transitive security floors

**Files:**

- Modify: `package.json` and the authoritative lockfile as needed
- Modify if required: `postcss.config.js`, `tailwind.config.js`, `scripts/generate-tokens.mjs`, `scripts/token-lint.mjs`
- Do not modify: `src/styles/tokens.css` unless a token value itself is required by a verified build issue
- Inspect: `npm ls --all` output for PostCSS, browserslist, brace-expansion, minimatch, js-yaml, nanoid, and related packages

**Interfaces:**

- Produces a clean generated CSS/token pipeline.
- Does not bypass token generation or add raw colors/durations/easings.
- Does not add broad dependency overrides without a documented parent-package constraint.

- [ ] **Step 1: Regenerate the lockfile after framework migration**

Run the authoritative npm lockfile update and inspect every changed package. Resolve vulnerable transitive copies through legitimate parent upgrades first. Use a narrow `overrides` entry only when a parent constraint is proven to block the fixed version.

- [ ] **Step 2: Verify the PostCSS and token pipeline**

Run:

```bash
npm ci
npm run tokens:generate
npm run tokens:check
npm run build
```

Inspect `git diff` to ensure generated files changed only as a consequence of the source token/config change. Do not hand-edit generated output.

- [ ] **Step 3: Re-run the dependency audit and explain residuals**

Run:

```bash
npm audit --package-lock-only
npm ls --all postcss browserslist brace-expansion minimatch js-yaml nanoid
```

Record each remaining advisory, dependency path, severity, and whether it is production, build-only, or unreachable. Do not dismiss an alert solely because no direct import was found.

- [ ] **Step 4: Commit**

Commit:

```text
fix: refresh build and transitive dependencies
```

---

### Task 6: Full quality, security, and browser verification

**Files:**

- Modify only if verification exposes a real regression: affected source/test/config files
- Do not change API/AI behavior without a documented human-review finding
- No generated or secret files

**Interfaces:**

- Validates the complete current `newui` tree before branch promotion.
- Produces evidence for the final whole-branch review and the parent’s force-push decision.

- [ ] **Step 1: Run the repository verification suite**

Run:

```bash
npm run verify
npm run build
```

If Playwright browsers are available, run:

```bash
npm run test:e2e
```

If they are not available, record the exact missing prerequisite and run all non-browser checks.

- [ ] **Step 2: Run focused security smoke checks**

Verify:

- homepage, blog, and admin routes render;
- unauthenticated admin mutations remain rejected;
- representative public API routes work;
- Supabase browser reads and server-admin boundaries remain intact;
- `next/image` calls use the intended allowlist;
- Tiptap editor output is still sanitized/rendered correctly;
- WorkspaceCanvas retains its SVG fallback and reduced-motion path.

- [ ] **Step 3: Run final static checks**

Run:

```bash
git diff --check
git status --short
npm audit --package-lock-only
```

Review secrets, lockfile drift, generated-file drift, and accidental unrelated edits. Do not remove files merely because they are unfamiliar without checking whether they are tracked project assets.

- [ ] **Step 4: Commit any verification-driven fixes**

If no code changes are needed, record a verification-only result. If fixes are required, use a focused Conventional Commit such as:

```text
fix: address dependency migration regressions
```

---

### Task 7: Final review and branch-promotion gate (parent-owned)

**Files:**

- Inspect: complete branch diff against the pre-plan `newui` HEAD
- Inspect: all task reports, reviewer findings, and the SDD ledger
- Do not let implementation subagents push or delete branches

**Interfaces:**

- Requires all task reviews to be clean or explicitly adjudicated.
- Produces a verified `newui` commit for the parent’s branch rewrite.

- [ ] **Step 1: Run the broad whole-branch code review**

Dispatch the final reviewer against the full `newui` diff, including package/lockfile, framework, scripts, Docker, tests, and security changes. Include the task ledger’s deferred findings and any reachability exceptions.

- [ ] **Step 2: Reconcile all Critical/Important findings**

Run one fix wave if needed, then one scoped re-review. Do not proceed to branch promotion with unresolved load-bearing findings.

- [ ] **Step 3: Capture the final evidence**

Record:

```bash
git status --short --branch
git log --oneline --decorate -15
npm run verify
npm run build
npm audit --package-lock-only
```

If the audit still reports advisories, list each remaining path and explain whether it is a production risk, build-only risk, or documented unreachable path. Never present a non-zero audit as clean.

- [ ] **Step 4: Parent-only branch rewrite and force-push**

Only after the final review and evidence are complete, the parent session will:

1. Push the verified `newui` branch.
2. Recreate local `main` at the verified `newui` commit.
3. Force-push `main` to `origin/main` using the explicit user authorization.
4. Verify the remote default branch points to the intended commit and report the old/new SHAs.

Do not execute this step from an implementation or review subagent.
