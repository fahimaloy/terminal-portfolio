# Task 5 Report — Build and Transitive Dependency Remediation

## Final files

- `package.json`: upgraded `vitest` and `@vitest/ui` from the 3.2 range to the advisory-fixed `4.1.11`; added two narrowly scoped `overrides` for vulnerable major-compatible `brace-expansion` lines; retained the existing `@types/node` floor.
- `package-lock.json`: regenerated with npm after the package manifest changes; contains the Vitest 4.1.11 graph and the resolved `brace-expansion@1.1.18` / `brace-expansion@2.1.4` copies.
- No PostCSS, Tailwind, token-generation, token source, or application source files were changed.

The overrides are limited to the two vulnerable major lines. The parent constraints are `minimatch@3.1.5` (`brace-expansion@^1.1.7`) and `sucrase -> glob@10.5.0 -> minimatch@9.0.9` (`brace-expansion@^2.0.2`); both resolved versions are within those parent ranges. This is not a broad or unreviewed override.

## Audit

Before the change, `npm audit --package-lock-only --json` reported 4 findings:

- `@vitest/mocker` — moderate, dev-only, via Vitest's redirect-mock path-traversal advisory (`GHSA-82fw-gwwq-j7x9`); path `vitest -> @vitest/mocker`.
- `@vitest/ui` — moderate, direct dev dependency, affected through Vitest; path `@vitest/ui -> vitest`.
- `brace-expansion` — high, dev/build-only, DoS advisories `GHSA-3jxr-9vmj-r5cp`, `GHSA-mh99-v99m-4gvg`, and `GHSA-rgw5-rvv9-x895`; paths `eslint-plugin-react -> minimatch@3.1.5 -> brace-expansion@1.1.15` and `tailwindcss -> sucrase -> glob@10.5.0 -> minimatch@9.0.9 -> brace-expansion@2.1.1`.
- `vitest` — moderate, direct dev dependency, affected through `@vitest/mocker`.

After the change, `npm audit --package-lock-only --json` reports `vulnerabilities: {}` and metadata `total: 0` (190 production, 827 dev, 125 optional, total 1059). There are no remaining advisories to classify. The vulnerable packages are not production dependencies; the observed paths are test/build tooling.

## Required checks

- `npm ci`: passed; normal clean install, 952 packages, audit reported 0 vulnerabilities.
- `npm ls --all postcss browserslist brace-expansion minimatch js-yaml nanoid`: passed. Key resolved copies are PostCSS `8.5.23` under Next and `8.5.28` direct, browserslist `4.29.1`, minimatch `3.1.5` / `9.0.9` / `10.2.6`, js-yaml `4.3.2`, nanoid `3.3.18`, and overridden brace-expansion `1.1.18` / `2.1.4`.
- `npm run lint`: passed with 0 errors; existing warnings remain.
- `npm run typecheck`: failed at the pre-existing test typing issue in `src/components/__tests__/Homepage.test.tsx:331`, `TS2348: Value of type 'Mock<Procedure | Constructable>' is not callable`. The test file is outside the allowed Task 5 scope and was not changed.
- `npm run tokens:generate`: passed; generated files were already synchronized.
- `npm run tokens:check`: passed for generated drift; reports 9 pre-existing legacy raw-hex warnings in `src/components/ui/WorkspaceCanvas.tsx`, allowed by the configured `--warn-legacy` mode.
- `npm test`: failed one test in `src/components/ui/__tests__/IconPicker.test.tsx:125` under Vitest 4.1.11 (`expected 4 to be less than or equal to 2`); 23 test files passed and 113/114 tests passed. No test source was changed because it is outside the allowed Task 5 scope.
- `npm run build`: failed during Next's TypeScript phase on the same `Homepage.test.tsx:331` `TS2348` error. The known `src/styles/global.css:271` `bg-bg-smoke` build issue was not reached in this run and was not weakened or modified.

## Compatibility and limitations

The Next 16.3.6 / React 19.3.0 / R3F 9.8.0 / Drei 10.7.8 / TypeScript 5.9.3 graph, Pages Router, token contract, anime.js v4 usage, Supabase/API boundaries, and application behavior are unchanged. Vitest 4.1.11 is the minimum available fixed line for the reported Vitest advisory; its stricter mock typings and changed effect timing expose existing test compatibility failures. Fixing those tests would require files explicitly outside the Task 5 allowed write scope.
