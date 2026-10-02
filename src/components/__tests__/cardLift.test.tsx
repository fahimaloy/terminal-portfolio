/**
 * The house card lift — `InlineProjectCard`, `ProjectPreview`'s tab strip and
 * `SkillCard` must agree, character for character.
 *
 * These assertions are mostly SOURCE-level on purpose. The load-bearing part of
 * the contract is an inline `transition` string whose value is a CSS custom
 * property reference, and jsdom's CSSOM will not faithfully serialise a
 * `transition` shorthand containing `var()` — a rendered-DOM assertion there
 * would be asserting jsdom, not the component. So: the rendered pass pins what
 * jsdom renders honestly (the hover classes, the accent-derived halo variable),
 * and the source pass pins the rest.
 *
 * Source passes are matched against CODE, never prose: every read below strips
 * comments first, because each of these comments names the very pattern it
 * forbids ("not a `duration-*` class", "`TAB_GLOW_SELECTED`", ...). Scanning
 * raw file text would trip over this file's own explanation of the rule.
 *
 * What each pin protects:
 *   - one shared constant, not three local copies (drift is how
 *     `ProjectPreview` ended up with an 8px glow while `InlineProjectCard` had
 *     the house 16px one);
 *   - `--card-glow` derived from the `-sm` glow token, so the halo is the
 *     quieter of the two glow steps rather than the loud one;
 *   - NO card expressing the lift with a `duration-*` class, because
 *     `tailwind.tokens.generated.js` compiles those to literal milliseconds and
 *     a literal cannot see the reduced-motion block in `tokens.css` that
 *     collapses `--dur-hover` to `0ms`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, render } from '@testing-library/react';

/**
 * jsdom ships no `window.matchMedia`, so `canAnimate()` is false and
 * `HudPanel`'s entrance effect returns before it writes anything — the cards
 * render their real resting state. That is why this file does NOT stub
 * `matchMedia` (the shape used in `ProjectMatchGrid.test.tsx`): stubbing it
 * would switch the entrance on, and the entrance clears inline `transition` on
 * the panel root, which is the exact collision the lift has to avoid.
 *
 * `animejs` is mocked so the real animation library never has to run in jsdom.
 */
vi.mock('animejs', () => ({
  animate: vi.fn(),
  spring: vi.fn(() => 'spring-ease'),
  createScope: vi.fn(() => ({
    revert: vi.fn(),
    add: (cb: () => void) => {
      cb();
    },
  })),
  stagger: vi.fn(() => 0),
}));

/**
 * `ProjectPreview` reaches for the Supabase-backed media table on mount. This
 * suite is about hover styling, so the read is stubbed rather than mocked at
 * the client boundary.
 */
vi.mock('../../utils/api', () => ({
  __esModule: true,
  getProjectMedia: vi.fn(async () => []),
}));

import InlineProjectCard from '../InlineProjectCard';
import ProjectPreview from '../ProjectPreview';
import SkillCard from '../SkillCard';
import { HOVER_LIFT_TRANSITION } from '../../config/animations';

const REPO_ROOT = path.resolve(__dirname, '../../..');

/** File text with comments removed, so prose can never satisfy a code pin. */
const code = (rel: string) =>
  readFileSync(path.join(REPO_ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const CARD_SOURCES = {
  InlineProjectCard: 'src/components/InlineProjectCard.tsx',
  ProjectPreview: 'src/components/ProjectPreview.tsx',
  SkillCard: 'src/components/SkillCard.tsx',
} as const;

/** The one travel, one scale and one blur radius the house lift allows. */
const TRAVEL = 'hover:-translate-y-0.5';
const SCALE = 'hover:scale-[1.015]';
const HALO = '0_0_16px_var(--card-glow)';

const project = (id: number, shortTitle: string) => ({
  id,
  title: `Project ${id}`,
  description: `Description ${id}`,
  description_html: null,
  image_url: null,
  thumbnail_url: null,
  short_title: shortTitle,
  icon_key: null,
  project_url: null,
  repo_url: null,
  languages: ['TypeScript'],
  tags: [],
  client_name: null,
  client_location: null,
  client_logo: null,
  featured: false,
  featured_order: 0,
  sort_order: id,
  is_visible: true,
});

const skill = {
  id: 1,
  name: 'React',
  category: 'Frontend',
  level: '80',
  icon_key: 'react',
  icon_type: null,
  icon_color: null,
  duration: '2 yrs',
  sort_order: 1,
  is_visible: true,
};

/**
 * `HALO` is a CLASS LITERAL, not a regex source: it contains `(...)`, which
 * would compile to a capture group and silently stop matching the text. Escape
 * before building a boundary-anchored class matcher.
 */
const haloRe = () =>
  new RegExp(
    `(?:^|\\s)shadow-\\[${HALO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
  );
const hoverHaloRe = () =>
  new RegExp(
    `(?:^|\\s)hover:shadow-\\[${HALO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
  );

/** Every node carrying the halo class, in document order. */
const haloNodes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) =>
    (el.getAttribute('class') ?? '').includes(HALO),
  );

/**
 * Rendered assertions. jsdom is trustworthy about `class` and about the raw
 * `style` attribute string, and untrustworthy about `var()` inside a
 * transition shorthand — so only those two are read here.
 */
function assertRenderedLift(node: HTMLElement, label: string) {
  const cls = node.getAttribute('class') ?? '';
  const style = node.getAttribute('style') ?? '';

  expect(cls, `${label}: 2px of travel`).toContain(TRAVEL);
  expect(cls, `${label}: 1.015 scale`).toContain(SCALE);
  expect(style, `${label}: halo tracks the card accent`).toMatch(
    /--card-glow:\s*var\(--glow-[a-z]+-sm\)/,
  );
  // Not expressed as a Tailwind duration — the lift's transition must be the
  // var-based inline string, or a reduced-motion visitor gets a 200ms slide
  // anyway.
  expect(cls, `${label}: no Tailwind duration on the lift target`).not.toMatch(
    /\bduration-/,
  );
}

describe('house card lift', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports one var-based transition string, with no millisecond in it', () => {
    expect(HOVER_LIFT_TRANSITION).toBe(
      'transform var(--dur-hover) var(--ease-out), box-shadow var(--dur-hover) var(--ease-out)',
    );
    // A literal duration here is the bug the string exists to avoid: it cannot
    // see the reduced-motion block that collapses `--dur-hover` to `0ms`.
    expect(HOVER_LIFT_TRANSITION).not.toMatch(/\d+\s*ms/);
    // Only the two properties the lift touches. `transition: all` would animate
    // the ripple disc's opacity and re-run layout every frame.
    expect(HOVER_LIFT_TRANSITION).not.toContain('all');
  });

  it('lives in the hand-written animations config, not the generated tokens', () => {
    expect(code('src/config/animations.ts')).toMatch(
      /export const HOVER_LIFT_TRANSITION\s*=\s*'transform var\(--dur-hover\)/,
    );
    // `src/config/generated/tokens.generated.ts` is codegen output from
    // `tokens.css`; hand-editing it would be overwritten by `npm run
    // tokens:generate`.
    expect(
      readFileSync(
        path.join(REPO_ROOT, 'src/config/generated/tokens.generated.ts'),
        'utf8',
      ),
    ).not.toContain('HOVER_LIFT_TRANSITION');
  });

  it.each(Object.entries(CARD_SOURCES))(
    '%s imports the shared constant rather than spelling it out',
    (_name, rel) => {
      const src = code(rel);
      expect(src, `${rel} must import the constant`).toMatch(
        /import\s*\{[^}]*HOVER_LIFT_TRANSITION[^}]*\}\s*from\s*'\.\.\/config\/animations'/,
      );
      // One definition, one place: a second `var(--dur-hover)` in a card is the
      // drift this shared constant exists to kill.
      expect(src, `${rel} must not re-declare the transition`).not.toMatch(
        /var\(--dur-hover\)/,
      );
    },
  );

  it.each(Object.entries(CARD_SOURCES))(
    '%s applies the lift transition inline, not as a Tailwind class',
    (_name, rel) => {
      const src = code(rel);
      // The var-based inline `transition`.
      expect(src, `${rel} must assign the shared transition`).toMatch(
        /transition:\s*HOVER_LIFT_TRANSITION/,
      );
      // No lift-bearing className may carry a duration/ease utility. Checked
      // per className so an unrelated, pre-existing transition elsewhere in the
      // card cannot mask the lift's own.
      const classNames = [
        ...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g),
      ].map((m) => m[1] ?? m[2] ?? '');
      const liftClassNames = classNames.filter(
        (c) => c.includes(TRAVEL) || c.includes(SCALE) || c.includes(HALO),
      );
      expect(liftClassNames.length, `${rel}: lift className not found`).toBe(1);
      expect(
        liftClassNames[0],
        `${rel}: lift must not use a duration-* class`,
      ).not.toMatch(/\bduration-/);
      expect(
        liftClassNames[0],
        `${rel}: lift must not use an ease-* class`,
      ).not.toMatch(/\bease-(?!out\b)[a-z0-9]/);
    },
  );

  it.each(Object.entries(CARD_SOURCES))(
    '%s publishes --card-glow from the -sm glow token',
    (_name, rel) => {
      // `--glow-<accent>-sm`, interpolated as a VALUE (a CSS custom property),
      // never as a Tailwind class — Tailwind generates from literal source text,
      // so an interpolated class compiles to nothing and paints nothing.
      expect(code(rel), `${rel} halo token`).toMatch(
        /--card-glow['"]?\s*:\s*`var\(--glow-\$\{[^{}]*accent\}-sm\)`/,
      );
    },
  );

  it('no card references the retired 8px glow map', () => {
    for (const [name, rel] of Object.entries(CARD_SOURCES)) {
      const src = code(rel);
      // Only the CARD halo is pinned here, so the assertion is scoped to the
      // lift's own className rather than the whole file: the media-thumbnail
      // selection indicator at `ProjectPreview.tsx:405` is an 8px glow on a
      // different element and is out of this contract's scope.
      const liftClasses = [
        ...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g),
      ]
        .map((m) => m[1] ?? m[2] ?? '')
        .filter(
          (c) => c.includes(TRAVEL) || c.includes(SCALE) || c.includes(HALO),
        );
      expect(liftClasses.length, `${name}: lift className not found`).toBe(1);
      expect(
        liftClasses[0],
        `${name}: the halo must be the only glow on the lift target`,
      ).not.toMatch(/0_0_8px|_px_var\(--glow-/);
      // The maps themselves are gone, not just their values.
      expect(src, `${name} must not re-declare the tab glow maps`).not.toMatch(
        /TAB_GLOW_(SELECTED|REST)/,
      );
    }
  });

  it.each(Object.entries(CARD_SOURCES))(
    '%s declares its accents as the app-wide AccentColor',
    (_name, rel) => {
      const src = code(rel);
      // No locally re-spelled six-name union: `AccentColor` widens itself when
      // an accent is added to `tokens.css`, a local copy does not.
      expect(src, `${rel} must not declare a local accent union`).not.toMatch(
        /\btype\s+\w*[Aa]ccent\w*\s*[=:]/,
      );
      // And no seventh hue smuggled in through an accumulator.
      expect(src, `${rel} must not widen the vocabulary`).not.toMatch(
        /'teal'|'magenta'|'pink'|'purple'|'indigo'|'blue'|'green'|'red'/,
      );
    },
  );

  describe('rendered', () => {
    it('InlineProjectCard rides the lift on its <button>', () => {
      const { container } = render(
        <InlineProjectCard project={project(1, 'Alpha')} skills={[]} />,
      );
      const [node, ...extra] = haloNodes(container);
      expect(extra, 'exactly one lift target').toHaveLength(0);
      // The interactive element, never the `HudPanel` inside it: the panel
      // entrance writes then clears inline transition on exactly that node.
      expect(node.tagName).toBe('BUTTON');
      assertRenderedLift(node, 'InlineProjectCard');
      expect(node.getAttribute('class')).toContain('min-h-[44px]');
    });

    it('SkillCard rides the lift on the HudPanel inside Tilt3D', () => {
      const { container } = render(<SkillCard skill={skill} />);
      const [node, ...extra] = haloNodes(container);
      expect(extra, 'exactly one lift target').toHaveLength(0);
      // `Tilt3D` rewrites its OWN wrapper's inline transform every frame, so
      // the lift must be on a different node — here, Tilt3D's child.
      expect(node.className).toContain('rounded-card');
      assertRenderedLift(node, 'SkillCard');
      // The tilt wrapper is a distinct node above the lift target.
      const tilt = node.parentElement;
      expect(tilt?.getAttribute('style') ?? '').toContain('preserve-3d');
      expect(tilt?.getAttribute('class') ?? '').not.toContain(HALO);
      expect(tilt?.getAttribute('class') ?? '').not.toContain(TRAVEL);
    });

    it('ProjectPreview rides the lift on the tab wrapper, outside the panel', async () => {
      let container!: HTMLElement;
      await act(async () => {
        ({ container } = render(
          <ProjectPreview
            projects={[project(1, 'Alpha'), project(2, 'Beta')]}
            inline
          />,
        ));
      });

      const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
      expect(tabs, 'the tablist is untouched').toHaveLength(2);
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(
        tabs.filter((t) => t.getAttribute('tabindex') === '0'),
        'roving tabindex: exactly one tab stop',
      ).toHaveLength(1);

      // The lift target is the `Ripple` wrapper: `Ripple` renders
      // `overflow-hidden`, which clips a descendant's box-shadow, and
      // `HudPanel`'s entrance clears an inline transition written on the panel
      // root. One node per tab, both carrying the same halo mechanism.
      const [selected, unselected] = haloNodes(container);
      expect(haloNodes(container)).toHaveLength(2);
      for (const node of [selected, unselected]) {
        expect(node.className).toContain('overflow-hidden');
        expect(node.querySelector('[role="tab"]')).not.toBeNull();
      }

      // The selected tab carries the halo as a resting state, the unselected one
      // on hover — one mechanism either way, not two competing ones. Class
      // boundaries are asserted with a regex: `hover:shadow-[…]` CONTAINS the
      // substring `shadow-[…]`, so `.toContain` cannot tell them apart.
      const restingHalo = haloRe();
      const hoverHalo = hoverHaloRe();
      expect(selected.getAttribute('class'), 'selected: resting halo').toMatch(
        restingHalo,
      );
      expect(
        selected.getAttribute('class'),
        'selected: not also hover',
      ).not.toMatch(hoverHalo);
      expect(
        unselected.getAttribute('class'),
        'unselected: hover halo',
      ).toMatch(hoverHalo);
      expect(
        unselected.getAttribute('class'),
        'unselected: not also resting',
      ).not.toMatch(restingHalo);
      expect(selected.querySelector('[role="tab"]')).toBe(tabs[0]);
      assertRenderedLift(selected, 'ProjectPreview (selected)');
      assertRenderedLift(unselected, 'ProjectPreview (unselected)');
    });
  });
});
