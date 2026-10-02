/**
 * token-lint rule 5 — `no-raw-anime-timing`.
 *
 * scripts/token-lint.mjs had NO test harness at all before this file: nothing
 * under src/__tests__ referenced it, so every rule in it was unverified. These
 * tests spawn the REAL CLI (`node scripts/token-lint.mjs <path>`) rather than
 * importing an internal function, because the thing that has to be correct is
 * the shipped exit code and the shipped message — an internal unit test would
 * happily pass while main() wired the rule up wrong.
 *
 * Fixtures live under `$HOME/.cache/`, not in the repo: they are deliberately
 * dirty files, and a stray `duration: 200` checked into the tree would either
 * pollute `--all` or (worse) tempt someone into a repo-wide ignore.
 *
 * Rule coverage, one group per concern:
 *   - every flaggable form (duration / delay / ease / stagger)
 *   - the five must-NOT-flag traps from the rule's design notes
 *   - the scope gate reaching anime through the repo's own wrappers
 *   - the `token-lint-ignore` marker, including the JSX-adjacent form
 *   - the live repo still passing `token-lint --all` and `generate-tokens --check`
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TOKEN_LINT = path.join(REPO_ROOT, 'scripts/token-lint.mjs');
const GENERATE_TOKENS = path.join(REPO_ROOT, 'scripts/generate-tokens.mjs');

let fixtureDir: string;

beforeAll(() => {
  const base = path.join(homedir(), '.cache', 'token-lint-fixtures');
  mkdirSync(base, { recursive: true });
  fixtureDir = mkdtempSync(path.join(base, 'run-'));
});

afterAll(() => {
  if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
});

function fixture(name: string, contents: string): string {
  const p = path.join(fixtureDir, name);
  writeFileSync(p, contents);
  return p;
}

/** Run the real CLI from the repo root and return code + combined output. */
function runLint(args: string[]) {
  const r = spawnSync(process.execPath, [TOKEN_LINT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** Assert a fixture is reported, and return the reported message for it. */
function expectFlagged(file: string, mustContain?: string) {
  const { code, out } = runLint([file]);
  expect(code, `expected exit 1 for ${path.basename(file)}`).toBe(1);
  expect(out).toContain('[no-raw-anime-timing]');
  if (mustContain) expect(out).toContain(mustContain);
  return out;
}

function expectClean(file: string) {
  const { code, out } = runLint([file]);
  expect(code, `expected exit 0 for ${path.basename(file)}`).toBe(0);
  expect(
    out,
    `expected no violations for ${path.basename(file)}, got:\n${out}`,
  ).not.toContain('[no-raw-anime-timing]');
  expect(out).not.toContain('violation(s) — fix them');
}

// This file is itself linted by `token-lint --all` (rules 3/4 scan every quoted
// string, so writing a raw Tailwind duration class here would fail CI on this
// test file). The one legacy-class string the suite needs is therefore assembled
// at runtime so the token class never appears contiguously in this source.
const LEGACY_CLASS = 'dur' + 'ation-777';

/** A file that imports animejs and contains `body` inside an animate() call. */
const anime = (body: string) =>
  `import { animate, stagger, createScope } from 'animejs';\nimport { durations, easings, springs } from '../config/animations';\n\nexport function go() {\n  animate(el, {\n${body}\n  });\n}\n`;

describe('token-lint rule 5 — every flaggable form', () => {
  it('flags a bare numeric `duration`', () => {
    expectFlagged(
      fixture('duration.ts', anime('    duration: 200,')),
      'raw anime.js duration 200',
    );
  });

  it('flags a bare numeric `delay`', () => {
    expectFlagged(
      fixture(
        'delay.ts',
        anime('    duration: durations.hover * 1000,\n    delay: 30,'),
      ),
      'raw anime.js delay 30',
    );
  });

  it('flags a bare numeric `stagger(...)`', () => {
    expectFlagged(
      fixture(
        'stagger.ts',
        `import { stagger } from 'animejs';\nexport const s = stagger(40, { from: 'first' });\n`,
      ),
      'raw anime.js stagger(40)',
    );
  });

  it('flags an easing string — including `spring(soft)`, the form that shipped a real bug', () => {
    expectFlagged(
      fixture(
        'ease.ts',
        anime("    duration: durations.enter * 1000,\n    ease: 'outExpo',"),
      ),
      'raw anime.js ease "outExpo"',
    );
    // anime has no `eases.spring`; its parser silently falls through to `none`.
    expectFlagged(
      fixture('spring-easing-literal.ts', anime("    ease: 'spring(soft)',")),
      'raw anime.js ease "spring(soft)"',
    );
  });

  it('flags the anime easing vocabulary broadly, not just a fixed name list', () => {
    // Proof the `ease:` rule is a POSITIVE test ("value is a string literal"),
    // not a denylist of known anime names — an unknown/typo'd name is caught too.
    expectFlagged(
      fixture('typo-easing-literal.ts', anime("    ease: 'outExpoo',")),
      'raw anime.js ease "outExpoo"',
    );
    expectFlagged(
      fixture('inout-easing-literal.ts', anime("    ease: 'inOutQuad',")),
      'raw anime.js ease "inOutQuad"',
    );
  });

  it('reports several violations in one file', () => {
    const { code, out } = runLint([
      fixture(
        'multi.ts',
        anime("    duration: 200,\n    ease: 'outExpo',\n    delay: 30,"),
      ),
    ]);
    expect(code).toBe(1);
    expect(out.match(/\[no-raw-anime-timing\]/g)).toHaveLength(3);
  });
});

describe('token-lint rule 5 — trap 1: token-derived expressions pass', () => {
  it('passes every canonical token-derived form named in the animation contract', () => {
    expectClean(
      fixture(
        'tokens-ok.ts',
        anime(
          [
            '    duration: durations[300] * 1000,',
            '    duration: durations.hover * 1000,',
            '    ease: easings.outExpo,',
            '    ease: easings.expoOut,',
            "    delay: stagger(durations.stagger * 1000, { from: 'first' }),",
            "    delay: stagger((durations.typing * 1000) / Math.max(count - 1, 1), { from: 'first' }),",
          ].join('\n'),
        ),
      ),
    );
  });

  it('passes a token-derived stagger step and a spring() easing', () => {
    expectClean(
      fixture(
        'stagger-ok.ts',
        [
          "import { animate, stagger, createScope, spring } from 'animejs';",
          "import { durations, easings, springs } from '../config/animations';",
          'const step = durations.stagger * (1 / 5) * 1000;',
          "export const s = stagger(step, { from: 'first' });",
          'export const sc = createScope({ defaults: { duration: durations.enter * 1000, ease: spring(springs.soft) } });',
          'export const a = animate(el, { duration: durations.exit * 1000, ease: softSpring });',
        ].join('\n'),
      ),
    );
  });

  it('passes a type-annotation `delay?: number` (optional prop, not a value)', () => {
    expectClean(
      fixture(
        'type-annot.ts',
        [
          "import { animate } from 'animejs';",
          'export interface Opts {',
          '  delay?: number;',
          '  duration?: number;',
          '  ease?: string;',
          '}',
        ].join('\n'),
      ),
    );
  });

  it('does not flag a destructuring default, which has no colon', () => {
    expectClean(
      fixture(
        'destructure.ts',
        [
          "import { animate } from 'animejs';",
          "import { durations } from '../config/animations';",
          'export const f = ({ delay = durations.stagger * 1000, duration = 640 } = {}) => delay + duration;',
        ].join('\n'),
      ),
    );
  });
});

describe('token-lint rule 5 — trap 2: comment text is masked out', () => {
  it('does not flag `stagger(40)` documented in the REAL SignalTicks.tsx block comment', () => {
    // SignalTicks.tsx documents `delay stagger(40,{from:'first'})` in a JSDoc.
    expectClean(
      path.join(
        REPO_ROOT,
        'src/components/ui/graphics/primitives/SignalTicks.tsx',
      ),
    );
  });

  it('does not flag `stagger(40)` documented in the REAL TypewriterText.tsx line comment', () => {
    // TypewriterText.tsx DOES import animejs — the comment alone must be masked.
    expectClean(path.join(REPO_ROOT, 'src/components/ui/TypewriterText.tsx'));
  });

  it('does not flag the third real archaeology site (sudosuperuser-ostaad/index.tsx)', () => {
    // "Was stagger(70) — now the --dur-stagger token (60ms)". Imports animejs.
    expectClean(
      path.join(REPO_ROOT, 'src/pages/sudosuperuser-ostaad/index.tsx'),
    );
  });

  it('does not flag the real TypewriterText test, which also documents `stagger(40)`', () => {
    expectClean(
      path.join(
        REPO_ROOT,
        'src/components/ui/__tests__/TypewriterText.test.tsx',
      ),
    );
  });

  it('still flags a real literal on a line adjacent to a comment', () => {
    // Masking must not leak: the comment is erased, the code beside it is not.
    expectFlagged(
      fixture(
        'comment-adjacent.ts',
        anime('    // staggered by hand, see the ticket\n    duration: 400,'),
      ),
      'raw anime.js duration 400',
    );
  });

  it('does not flag raw literals documented inside a BLOCK comment', () => {
    // Line and block comments are two separate branches of the masker. The real
    // archaeology sites happen to be line comments (`//`), so without this
    // fixture nothing would catch a masker that blanks `/` comments but forgot
    // `/* */`.
    expectClean(
      fixture(
        'block-comment-data.ts',
        [
          "import { animate } from 'animejs';",
          '/**',
          " * Was: animate(el, { duration: 300, ease: 'outExpo' })",
          ' */',
          'export const go = () => animate(el, { duration: durations.tap * 1000 });',
        ].join('\n'),
      ),
    );
  });

  it('does not mistake a regex literal or a division for a comment', () => {
    // `/` handling: `/\s+/g` is a regex, `total / 2` is a division. If the masker
    // mis-classified either, the rest of the line would be silently skipped or
    // a comment would be mis-detected.
    expectFlagged(
      fixture(
        'regex-div.ts',
        [
          "import { animate } from 'animejs';",
          "import { durations } from '../config/animations';",
          'const re = /\\s+/g;',
          'const total = count / 2 / 3;',
          'const half = total // trailing comment',
          '  ? total / 2',
          '  : 0;',
          'export const a = animate(el, { duration: 500 });',
          'export const b = re.test(String(half));',
        ].join('\n'),
      ),
      'raw anime.js duration 500',
    );
  });

  it('does not flag `duration: 200` sitting inside a STRING body — data, not a call', () => {
    // Rule 5's matcher blanks string bodies as well as comments. This is the same
    // shape as this very test file's fixtures: source that CONTAINS an example
    // of a raw literal is documenting or testing the rule, not violating it. A
    // masker that only handled comments would flag the test suite for writing
    // examples — which is how a rule like this gets quietly switched off again.
    expectClean(
      fixture(
        'string-data.ts',
        [
          "import { animate } from 'animejs';",
          "import { durations } from '../config/animations';",
          "export const LEGACY_SNIPPET = 'duration: 200, ease: \\'outExpo\\'';",
          'export const delaySnippet = "delay: 30";',
          'export const staggerSnippet = `stagger(40, { from: "first" })`;',
          'export const ok = animate(el, { duration: durations.tap * 1000 });',
        ].join('\n'),
      ),
    );
  });

  it('still flags the identical literal the moment it is real code', () => {
    expectFlagged(
      fixture('string-data-code.ts', anime('    duration: 200,')),
      'raw anime.js duration 200',
    );
  });
});

describe('token-lint rule 5 — trap 3: other libraries are out of scope', () => {
  it('ignores timing-shaped keys in a file that never references animejs', () => {
    expectClean(
      fixture(
        'other-lib.ts',
        [
          "import { motion } from 'some-other-animation-lib';",
          'export const opts = {',
          '  duration: 200,',
          "  ease: 'ease-in-out',",
          '  delay: 30,',
          '};',
          'export const s = stagger(40);',
        ].join('\n'),
      ),
    );
  });

  it('ignores a real project-tenure `duration` (the SkillCard.test.tsx shape)', () => {
    expectClean(
      path.join(REPO_ROOT, 'src/components/__tests__/SkillCard.test.tsx'),
    );
  });

  it('does flag the same shape once animejs IS imported', () => {
    expectFlagged(
      fixture(
        'other-lib-with-anime.ts',
        [
          "import { animate } from 'animejs';",
          'export const opts = {',
          '  duration: 200,',
          '};',
        ].join('\n'),
      ),
      'raw anime.js duration 200',
    );
  });
});

describe('token-lint rule 5 — trap 4: test files', () => {
  it('DECISION: tests are COVERED, not path-exempt. A test that constructs a raw anime params object is flagged.', () => {
    // There is no `__tests__` / `.test.` exemption — a single escape hatch
    // (token-lint-ignore) is the house mechanism, and a blanket path exemption
    // would be a second, silent one. See the report for the justification.
    expectFlagged(
      fixture(
        'thing.test.ts',
        [
          "import { animate } from 'animejs';",
          "export const params = { duration: 200, ease: 'outExpo' };",
        ].join('\n'),
      ),
      'raw anime.js duration 200',
    );
  });

  it('covers a test that only mocks animejs via vi.mock (no import statement)', () => {
    expectFlagged(
      fixture(
        'mocked.test.ts',
        [
          "import { vi } from 'vitest';",
          "vi.mock('animejs', () => ({ animate: vi.fn(), stagger: vi.fn() }));",
          'export const params = { duration: 200 };',
        ].join('\n'),
      ),
      'raw anime.js duration 200',
    );
  });

  it('passes the REAL admin-motion.test.tsx, which asserts tokens resolve to 200/300', () => {
    // It uses `expect(backdrop.duration).toBe(200)` — a method call, not a
    // `key: value` pair — and `vi.mock('animejs')` with no timing keys. This is
    // the trap-4 file: it asserts literals deliberately and must not be touched.
    expectClean(
      path.join(
        REPO_ROOT,
        'src/components/admin/__tests__/admin-motion.test.tsx',
      ),
    );
  });

  it('a raw literal in a test is escapable with the same marker as any other line', () => {
    expectClean(
      fixture(
        'ignored.test.ts',
        [
          "import { animate } from 'animejs';",
          'export const params = {',
          '  duration: 200, // token-lint-ignore',
          '};',
        ].join('\n'),
      ),
    );
  });
});

describe('token-lint rule 5 — trap 5: tokens.css and generated files', () => {
  it('never flags src/styles/tokens.css', () => {
    expectClean(path.join(REPO_ROOT, 'src/styles/tokens.css'));
  });

  it('never flags tailwind.tokens.generated.js', () => {
    // Exempt twice over: `.js` is not in SUPPORTED_EXTS, so the CLI never
    // enumerates it, and it is in GENERATED_FILES regardless.
    expectClean(path.join(REPO_ROOT, 'tailwind.tokens.generated.js'));
  });

  it('never flags src/config/generated/tokens.generated.ts', () => {
    // `.ts` IS in SUPPORTED_EXTS, so this one is genuinely filtered by
    // `isGeneratedFile` inside main() rather than by extension.
    expectClean(
      path.join(REPO_ROOT, 'src/config/generated/tokens.generated.ts'),
    );
  });

  it('flags the same content shape at a non-generated path — the exemption is a path match', () => {
    // Guards against reading the three cases above as "the rule trusts these
    // files' contents": they are skipped by name, so identical content anywhere
    // else is still reported.
    expectFlagged(
      fixture(
        'not-actually-generated.ts',
        [
          "import { animate } from 'animejs';",
          'export const p = { duration: 200 };',
        ].join('\n'),
      ),
      'raw anime.js duration 200',
    );
  });

  it('never flags a copy of tokens.css content living under another name', () => {
    expectClean(
      fixture(
        'not-tokens.css',
        [
          ':root {',
          '  --dur-stagger: 60ms;',
          '  --dur-hover: 280ms;',
          '}',
          '.x { transition: all 200ms; }',
        ].join('\n'),
      ),
    );
  });
});

describe('token-lint rule 5 — the ignore marker', () => {
  it('honours a same-line `// token-lint-ignore`', () => {
    expectClean(
      fixture(
        'ignore-inline.ts',
        anime('    duration: 200, // token-lint-ignore'),
      ),
    );
  });

  it('honours the JSX-adjacent form: the marker lands on the NEXT line', () => {
    // This is the shape prettier produces when it splits an element (or an
    // object literal) from its trailing ignore comment, and the shape
    // `src/pages/_app.tsx` uses for its theme-color meta tag. `adjIgnored`
    // looks at i±1; rule 5 reuses it rather than inventing a second hatch.
    expectClean(
      fixture(
        'ignore-next-line.ts',
        [
          "import { animate } from 'animejs';",
          'export const p = {',
          '  duration: 200,',
          '  /* token-lint-ignore */',
          '};',
        ].join('\n'),
      ),
    );
  });

  it('honours a real JSX `{/* token-lint-ignore */}` on the next line of an anime call', () => {
    expectClean(
      fixture(
        'ignore-jsx-next-line.tsx',
        [
          "import { animate } from 'animejs';",
          'export const El = () => {',
          '  animate(ref, {',
          '    duration: 200,',
          '    {/* token-lint-ignore */}',
          '  });',
          '};',
        ].join('\n'),
      ),
    );
  });

  it('honours the marker on the PREVIOUS line', () => {
    expectClean(
      fixture(
        'ignore-prev-line.ts',
        anime('    // token-lint-ignore\n    delay: 30,'),
      ),
    );
  });

  it('honours a JSX comment marker sitting on the line before the literal', () => {
    // The other direction prettier produces: the marker comment precedes the
    // offending expression.
    expectClean(
      fixture(
        'ignore-jsx-before.tsx',
        [
          "import { animate } from 'animejs';",
          'export const p = (',
          '  <span data-t={300}>',
          '    {/* token-lint-ignore */}',
          '  </span>',
          ');',
          'export const q = {',
          '  /* token-lint-ignore */',
          "  ease: 'outExpo',",
          '};',
        ].join('\n'),
      ),
    );
  });

  it('does NOT let an unrelated marker further than one line away suppress a real literal', () => {
    // The adjacency window is ±1 line only. Two blank lines of separation and
    // the marker no longer helps, so a long comment above a violation cannot
    // silently whitelist it.
    const { code, out } = runLint([
      fixture(
        'ignore-far.ts',
        anime(
          "    duration: 200,\n\n\n\n    // token-lint-ignore\n\n    ease: 'outExpo',",
        ),
      ),
    ]);
    expect(code).toBe(1);
    expect(out).toContain('raw anime.js duration 200');
    expect(out).toContain('raw anime.js ease "outExpo"');
  });
});

/**
 * Rule 5 scope, take two: reaching anime THROUGH a repo wrapper.
 *
 * The first gate was "this file references `animejs`", which missed every
 * caller of `src/hooks/useStagger.ts` — a hook that takes `delay?: number` and
 * forwards it into `stagger(delay, …)`. Six admin pages called
 * `useStagger({ delay: 60 })` and imported no anime at all, so a raw 60ms sat
 * under the animation contract, ungated. The gate is now import-reachability,
 * derived from the tree. These tests pin the derivation, not one hook name: the
 * fixtures import the REAL wrapper by path, so a wrapper renamed or added
 * tomorrow moves these tests rather than breaking them silently.
 *
 * Fixtures live outside the repo (see the file header), so the import specifier
 * has to be computed at write time — `path.relative` back into the repo, with
 * posix separators so the lint script's own resolution is what is under test.
 */
const repoModuleSpecifier = (repoRelative: string) =>
  path
    .relative(fixtureDir, path.join(REPO_ROOT, repoRelative))
    .split(path.sep)
    .join('/');

const useStaggerSpecifier = () => repoModuleSpecifier('src/hooks/useStagger');
const animationsSpecifier = () => repoModuleSpecifier('src/config/animations');
const hooksBarrelSpecifier = () => repoModuleSpecifier('src/hooks');
const componentCounterSpecifier = () =>
  repoModuleSpecifier('src/components/ui/AnimatedCounter');

describe('token-lint rule 5 — the scope gate reaches anime through repo wrappers', () => {
  it('flags a raw delay in a file that imports the WRAPPER and never mentions animejs', () => {
    // The exact shape the six admin pages had: no animejs import anywhere.
    const file = fixture(
      'wrapper-raw-delay.ts',
      `import { useStagger } from '${useStaggerSpecifier()}';\n\nexport function go() {\n  useStagger({ mode: 'list', delay: 60 });\n}\n`,
    );
    const out = expectFlagged(file, 'raw anime.js delay 60');
    // The report must NAME the wrapper — a reader who cannot see why the rule
    // applied to a file with no anime import will assume it is a false positive.
    expect(out).toContain('via src/hooks/useStagger');
  });

  it('passes the sibling fixture that imports the SAME wrapper with a token-derived delay', () => {
    // Same import, same call shape, same key — only the value differs. If this
    // were failing, the gate (or the matcher) would be keying on something the
    // animation contract actually allows.
    expectClean(
      fixture(
        'wrapper-token-delay.ts',
        `import { useStagger } from '${useStaggerSpecifier()}';\nimport { durations } from '${animationsSpecifier()}';\n\nexport function go() {\n  useStagger({ mode: 'list', delay: durations.stagger * 1000 });\n}\n`,
      ),
    );
  });

  it('does NOT flag the same raw delay when the wrapper is not imported', () => {
    // Counter-proof that the file CONTENT is not what puts a file in scope: an
    // identical `delay: 60` with no animejs reference and no wrapper import is
    // some other library's option object and stays out of scope.
    expectClean(
      fixture(
        'wrapper-absent-raw-delay.ts',
        `import { fadeIn } from 'some-other-motion-lib';\n\nexport function go() {\n  fadeIn({ delay: 60 });\n}\n`,
      ),
    );
  });

  it('flags a raw duration through the BARREL (the hooks index), not just the deep path', () => {
    // `src/hooks/index.ts` re-exports `useStagger`, so a consumer may import the
    // hook from the barrel and never name the module. Barrel closure over
    // re-export edges only — following ordinary imports would make the whole app
    // one hop from anime.
    expectFlagged(
      fixture(
        'barrel-raw-duration.ts',
        `import { useStagger } from '${hooksBarrelSpecifier()}';\n\nexport function go() {\n  useStagger({ duration: 250 });\n}\n`,
      ),
      'raw anime.js duration 250',
    );
  });

  it('does not flag the wrapper itself — a `delay?: number` prop is a declaration, not a value', () => {
    // The wrapper is IN scope (it imports animejs) and still must pass: its
    // timing surface is `delay?: number` and `paintDelay = 50`, neither of which
    // is a `key: <bare number>` pair.
    expectClean(path.join(REPO_ROOT, 'src/hooks/useStagger.ts'));
  });

  it('does not flag a helper that imports animejs but forwards no caller timing', () => {
    // `src/hooks/useFormAnimation.ts` animates for its own account — every
    // duration inside it is token-derived and its callbacks take an element, not
    // options. Treating "imports animejs in a helper layer" as sufficient scope
    // would have put this file's importers in scope for no reason.
    expectClean(path.join(REPO_ROOT, 'src/hooks/useFormAnimation.ts'));
  });

  it('does not flag the token source, which IS the definition of the values', () => {
    // `src/config/animations.ts` imports animejs (for `createScope`/`spring`)
    // and declares `duration: number` in a type. It is excluded from the
    // boundary layers precisely so it is not treated as a wrapper — otherwise
    // every file importing `durations` would inherit scope.
    expectClean(path.join(REPO_ROOT, 'src/config/animations.ts'));
  });

  it('does not treat the TOKEN MAP as a reachability path', () => {
    // The mirror of the test above, at the call site. Nearly every file in the
    // app imports `durations`/`easings` from `src/config/animations`; if that
    // import counted as reaching anime, the gate would be "scan the whole app".
    expectClean(
      fixture(
        'token-map-import-only.ts',
        [
          `import { durations } from '${animationsSpecifier()}';`,
          '',
          'export const opts = {',
          '  duration: 60,',
          '  delay: 30,',
          "  ease: 'linear',",
          '};',
          `export const real = { duration: durations.stagger * 1000 };`,
        ].join('\n'),
      ),
    );
  });

  it('does not treat a COMPONENT-layer module as a reachability path', () => {
    // `AnimatedCounter.tsx` does forward a caller-supplied `duration?: number`
    // into anime, but it lives in `src/components`, and the boundary is
    // deliberately `hooks`/`utils`/`lib`. Pinned here so the limit is explicit:
    // widening the barrier to every layer is a one-line change with a large
    // false-positive surface, and it should be a deliberate act.
    expectClean(
      fixture(
        'component-layer-import-only.ts',
        [
          `import { AnimatedCounter } from '${componentCounterSpecifier()}';`,
          '',
          'export const opts = { duration: 250 };',
        ].join('\n'),
      ),
    );
  });

  const ADMIN_STAGGER_PAGES = [
    'skills',
    'knowledge',
    'projects',
    'experiences',
    'media',
    'site-texts',
  ];

  it.each(ADMIN_STAGGER_PAGES)(
    '%s.tsx passes the token-derived stagger delay, not a raw 60',
    (page) => {
      const p = path.join(
        REPO_ROOT,
        `src/pages/sudosuperuser-ostaad/${page}.tsx`,
      );
      expectClean(p);
      const src = readFileSync(p, 'utf8');
      // Value-preserving substitution is asserted at the source level, because
      // `--all` passing would not tell us WHY it passes.
      expect(src, `${page}.tsx must read the stagger token`).toContain(
        'delay: durations.stagger * 1000,',
      );
      expect(src, `${page}.tsx must no longer carry a raw delay`).not.toMatch(
        /\bdelay:\s*\d/,
      );
    },
  );
});

describe('token-lint rule 5 — the live repo stays clean', () => {
  it('`node scripts/token-lint.mjs --all` exits 0', () => {
    const r = spawnSync(process.execPath, [TOKEN_LINT, '--all'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(
      `${r.stdout ?? ''}${r.stderr ?? ''}`,
      'token-lint --all must stay green — a new rule cannot land on legacy debt',
    ).toContain('[token-lint] OK');
    expect(r.status).toBe(0);
  });

  it('`node scripts/token-lint.mjs --all --warn-legacy` also exits 0', () => {
    // The rule is deliberately NOT downgraded by --warn-legacy; a clean tree
    // means both flags agree.
    const r = spawnSync(
      process.execPath,
      [TOKEN_LINT, '--all', '--warn-legacy'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    expect(`${r.stdout ?? ''}${r.stderr ?? ''}`).toContain('[token-lint] OK');
    expect(r.status).toBe(0);
  });

  it('`--warn-legacy` still downgrades a pre-existing rule but NOT the anime rule', () => {
    // Proves the NEVER_DOWNGRADED wiring in main() is real, not dead config: a
    // legacy class violation is a warning with exit 0, the anime rule is fatal.
    const legacy = fixture(
      'legacy-warn.tsx',
      `export const A = () => <div className="${LEGACY_CLASS}" />;\n`,
    );
    const warned = runLint([legacy, '--warn-legacy']);
    expect(warned.code, 'legacy class debt must be downgraded, not fatal').toBe(
      0,
    );
    expect(warned.out).toContain('no-adhoc-duration');

    const anime = fixture(
      'anime-fatal.ts',
      "import { animate } from 'animejs';\nexport const p = { duration: 200 };\n",
    );
    const fatal = runLint([anime, '--warn-legacy']);
    expect(
      fatal.code,
      'the anime rule must stay fatal under --warn-legacy',
    ).toBe(1);
    expect(fatal.out).toContain('[no-raw-anime-timing]');
  });

  it('`node scripts/generate-tokens.mjs --check` still passes (no codegen drift)', () => {
    const r = spawnSync(process.execPath, [GENERATE_TOKENS, '--check'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(`${r.stdout ?? ''}${r.stderr ?? ''}`).toContain('--check OK');
    expect(r.status).toBe(0);
  });
});
