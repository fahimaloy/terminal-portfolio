// src/components/home/__tests__/ProjectStrip.test.tsx
//
// Two contracts live in this file, both in `src/components/home/ProjectStrip.tsx`:
//
//   1. `ProjectInlineDetail` — the exit-animation LIFECYCLE.
//      The defect: the render gate was `if (!open || !project) return null`, so
//      the panel detached on the very commit that flipped `open` and the exit
//      animation started afterwards ran on a dead node. The visitor saw an
//      instant cut. `isMounted` now owns the gate, which means the panel is
//      deliberately STILL in the DOM after the flip — that is the fix, and it
//      is asserted directly rather than inferred from a timeline call.
//
//   2. `ProjectStrip` — the featured-slice DISCLOSURE.
//      Collapsed, the grid is sliced to 4 of N cards; the VIEW ALL control
//      expands it in place. The bug was that the expanded branch announced
//      `aria-expanded="false"` — the opposite of what was on screen.
//
// These tests pin LIFECYCLE and ANNOUNCED STATE. They prove nothing about how
// the exit looks: the tween's actual pixels are anime's job in a real browser,
// and no browser was involved in writing this file.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const {
  /** Every scope built anywhere under test, so a test can assert `revert()`. */
  scopes,
  /** Every timeline handed to `createTimeline`, with its `add()` calls. */
  timelines,
  /**
   * Forces the value the scope's `execute()` sees, independent of what
   * `window.matchMedia` reports to the effect body. `null` = read the real
   * flag (production-faithful default); `true` = the visitor switched reduced
   * motion on between the effect's own check and the scope's `add`, which is
   * the only window the in-scope re-check exists to cover.
   */
  forceScopeReduceMotion,
  mockAnimate,
  mockStaggerFn,
} = vi.hoisted(() => ({
  scopes: [] as Array<{
    add: (cb: () => void) => unknown;
    revert: ReturnType<typeof vi.fn>;
    matches: Record<string, boolean>;
  }>,
  timelines: [] as Array<{
    params?: Record<string, unknown>;
    adds: Array<{
      target: unknown;
      params: Record<string, unknown>;
      position?: unknown;
    }>;
  }>,
  forceScopeReduceMotion: { value: null as boolean | null },
  mockAnimate: vi.fn(),
  mockStaggerFn: vi.fn((v: unknown) => v as never),
}));

vi.mock('animejs', () => ({
  __esModule: true,
  createScope: vi.fn(() => {
    const scope = {
      add: vi.fn((cb: () => void) => {
        // Mirrors the real scope: `execute()` re-reads the MediaQueryList, so
        // the component's live `scope.matches.reduceMotion` check is live here
        // too. `forceScopeReduceMotion` decouples that read from the one the
        // effect body already made.
        scope.matches = {
          reduceMotion:
            forceScopeReduceMotion.value ??
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        };
        cb();
        return scope;
      }),
      revert: vi.fn(),
      matches: {} as Record<string, boolean>,
    };
    scopes.push(scope);
    return scope;
  }),
  createTimeline: vi.fn((params?: Record<string, unknown>) => {
    const tl = {
      params,
      adds: [] as Array<{
        target: unknown;
        params: Record<string, unknown>;
        position?: unknown;
      }>,
      add: vi.fn(
        (target: unknown, p: Record<string, unknown>, pos?: unknown) => {
          tl.adds.push({ target, params: p, position: pos });
          return tl;
        },
      ),
    };
    timelines.push(tl);
    return tl;
  }),
  animate: mockAnimate,
  stagger: mockStaggerFn,
  spring: vi.fn(() => 'spring-ease'),
}));

// `ProjectStrip.tsx` imports `{ HudPanel, NeonButton }` from the `src/components/ui`
// BARREL, which also re-exports twenty unrelated modules (CursorGlow, MentionChip,
// BootSequence, Tooltip…). These two are the real components — the assertions below
// are about ProjectStrip's own wrapper, not about HudPanel's internals — but the
// rest of the barrel is not this file's business and would make it fail for reasons
// that have nothing to do with what it tests.
vi.mock('../../ui', async () => {
  const [{ default: HudPanel }, { default: NeonButton }] = await Promise.all([
    import('../../ui/HudPanel'),
    import('../../ui/NeonButton'),
  ]);
  return { __esModule: true, HudPanel, NeonButton };
});

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement('img', props),
}));

import { ProjectInlineDetail, ProjectStrip } from '../ProjectStrip';
import { durations } from '../../../config/animations';
import type { PortfolioProject } from '../../../utils/api';

/* jsdom ships no `window.matchMedia`, and `canAnimate()` is false without it — which
   would silently make every "motion enabled" test here take the reduced-motion path
   and pass for the wrong reason. anime's `new Scope()` also reads `win.matchMedia` in
   its constructor (`node_modules/animejs/dist/modules/scope/scope.js:77`), so without
   a stub `createScope({ mediaQueries })` THROWS inside a passive effect and takes the
   component down. The repo ships this stub per file rather than in `vitest.setup.ts`;
   same shape as `src/components/__tests__/ProjectMatchGrid.test.tsx`.
   `false` = motion allowed, i.e. the production default. */
function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function clearMatchMedia() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).matchMedia;
}

/**
 * `ProjectStrip.tsx:312` — the exit is `--dur-exit` compressed to 80%, "the same
 * factor the drawer and the message overlay use for theirs". Repeated here rather
 * than imported because the constant is module-private; it is a FACTOR over a
 * token, never a raw millisecond count.
 */
const EXIT_FACTOR = 0.8;
/** Module-private in the component too; derived from the token, same as above. */
const EXIT_PANEL_MS = durations.exit * 1000 * EXIT_FACTOR;
/** The deadline backstop is deliberately 2x the exit so it never wins the race. */
const EXIT_DEADLINE_MS = EXIT_PANEL_MS * 2;

/** `ProjectStrip.tsx:39` — module-private, so repeated here. */
const STRIP_GRID_ID = 'project-strip-grid';

function project(id: number): PortfolioProject {
  return {
    id,
    title: `Strip Project ${id}`,
    description: `Body copy ${id}`,
    description_html: null,
    image_url: null,
    thumbnail_url: `https://example.com/thumb-${id}.png`,
    short_title: null,
    icon_key: null,
    project_url: null,
    repo_url: null,
    languages: ['TypeScript'],
    tags: ['React'],
    client_name: null,
    client_location: null,
    client_logo: null,
    featured: false,
    featured_order: 0,
    sort_order: id,
    is_visible: true,
  };
}

const demoProject = project(1);

/**
 * The node the exit animates: `ProjectStrip.tsx:448` renders
 * `<div ref={panelRef} className="w-full mt-4">` around the HudPanel. The inner
 * HudPanel root carries `rounded-card … p-4` and never `w-full`/`mt-4`, so this
 * selects the wrapper and nothing else.
 */
const panel = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('div.w-full.mt-4');

/** The exit timeline is the only one created with an `onComplete`. */
function exitTimeline() {
  const found = timelines.filter(
    (t) => !!t.params && typeof t.params.onComplete === 'function',
  );
  return found[found.length - 1];
}

function renderDetail(
  open: boolean,
  overrides: { project?: PortfolioProject | null } = {},
) {
  const props = {
    project: overrides.project === undefined ? demoProject : overrides.project,
    open,
    onClose: vi.fn(),
  };
  const utils = render(<ProjectInlineDetail {...props} />);
  return { ...utils, props };
}

describe('ProjectInlineDetail — exit lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    timelines.length = 0;
    forceScopeReduceMotion.value = null;
    mockMatchMedia(false);
  });

  afterEach(clearMatchMedia);

  // THE regression this lifecycle exists for. Under the old `if (!open || !project)
  // return null`, the node was gone on the same commit that flipped the prop and the
  // visitor got an instant cut; the animation that started a tick later ran on a
  // detached element. Presence immediately after the flip is therefore the assertion
  // that distinguishes the two designs — nothing else about this test can tell them
  // apart, because both build a timeline.
  it('closing leaves the panel in the document until the exit completes, then removes it', () => {
    const { container, rerender, props } = renderDetail(true);
    const nodeBefore = panel(container);
    expect(nodeBefore).not.toBeNull();

    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));

    // Still on screen — and the SAME node, not a remount that merely looks alive.
    expect(panel(container)).not.toBeNull();
    expect(panel(container)).toBe(nodeBefore);

    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });

    expect(panel(container)).toBeNull();

    // `isMounted` flipping re-runs the effect (it is in the deps). Without the
    // `!isMounted` re-entry guard that pass would start the exit all over again —
    // forever, since each completion flips the state and re-triggers.
    expect(
      timelines.filter((t) => typeof t.params?.onComplete === 'function'),
    ).toHaveLength(1);
    expect(exitTimeline()).toBe(tl);
  });

  it('the exit animates the panel wrapper itself — one tween, opacity and transform only', () => {
    const { container, rerender, props } = renderDetail(true);
    const node = panel(container);

    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));

    const tl = exitTimeline()!;
    expect(tl.adds).toHaveLength(1);

    // Targeting the mounted node is the other half of the fix: a tween aimed at a
    // detached node is a no-op the visitor experiences as nothing happening.
    const { target, params: tween } = tl.adds[0];
    expect(target).toBe(node);

    expect(tween.opacity).toEqual([1, 0]);
    // Travels away from the resting position — the mirror of `HudPanel`'s
    // `ENTER_RISE_PX` arrival, which `ProjectStrip.tsx:314` deliberately mirrors.
    expect(Array.isArray(tween.translateY)).toBe(true);
    const [from, to] = tween.translateY as [number, number];
    expect(from).toBe(0);
    expect(to).toBeGreaterThan(0);

    // Nothing that would force layout while the visitor watches.
    for (const layoutProp of [
      'height',
      'width',
      'top',
      'left',
      'margin',
      'padding',
    ]) {
      expect(tween).not.toHaveProperty(layoutProp);
    }

    // Timing is token-derived, never a literal: `--dur-exit` at 80%.
    const exitMs = tween.duration as number;
    expect(typeof exitMs).toBe('number');
    expect(exitMs).toBe(EXIT_PANEL_MS);
    expect(exitMs).toBeLessThan(durations.exit * 1000);
    expect(typeof tween.ease).toBe('string');
  });

  // The rapid-toggle bug is "stuck invisible": re-opening mid-exit used to leave
  // the panel gone because the exit's completion still owned the unmount.
  it('re-opening mid-exit keeps the panel visible and reverts the in-flight exit scope', () => {
    const { container, rerender, props } = renderDetail(true);
    const nodeBefore = panel(container);

    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));
    act(() => rerender(<ProjectInlineDetail {...props} open />));

    expect(panel(container)).not.toBeNull();
    expect(panel(container)).toBe(nodeBefore);
    // The exit the visitor cancelled was undone by the effect's own cleanup
    // (`clearTimeout` + `scope.revert()`), not merely visually overwritten.
    expect(scopes.some((s) => s.revert.mock.calls.length > 0)).toBe(true);
  });

  // Presence alone cannot see this bug: a stale completion that unmounts and is
  // then re-mounted still leaves *something* in the DOM by the end of the act. The
  // assertion has to be node identity.
  it('a stale exit completion that outlived a re-open does not unmount the panel', () => {
    const { container, rerender, props } = renderDetail(true);
    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));
    const stale = exitTimeline()!;

    act(() => rerender(<ProjectInlineDetail {...props} open />));
    const nodeBefore = panel(container);
    expect(nodeBefore).not.toBeNull();

    act(() => {
      (stale.params!.onComplete as () => void)();
    });

    expect(panel(container)).not.toBeNull();
    expect(panel(container)).toBe(nodeBefore);
  });

  // `onComplete` is the intended signal; the timer is the guarantee that the panel
  // still leaves when it never arrives (throttled rAF in a background tab, an
  // engine that skips the final callback, a throw inside a tick).
  it('the deadline backstop unmounts the panel at 2x the exit when onComplete never arrives', () => {
    vi.useFakeTimers();
    try {
      const { container, rerender, props } = renderDetail(true);
      act(() => rerender(<ProjectInlineDetail {...props} open={false} />));

      expect(panel(container)).not.toBeNull();

      // One tick short of the deadline: still on screen, because nothing else
      // removed it. `onComplete` is never called in this test.
      act(() => {
        vi.advanceTimersByTime(EXIT_DEADLINE_MS - 1);
      });
      expect(panel(container)).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(panel(container)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  // Reduced motion must not leave a panel stranded on screen waiting for an exit
  // nobody is watching. `beforeEach` installed the stub, so re-stub before render:
  // the value has to be `true` on the mount pass, not merely at the flip.
  it('reduced motion: closing unmounts on the same tick and builds no exit to wait for', () => {
    vi.useFakeTimers();
    try {
      mockMatchMedia(true);
      const { container, rerender, props } = renderDetail(true);
      expect(panel(container)).not.toBeNull();

      const beforeTimelines = timelines.length;
      const beforeScopes = scopes.length;

      act(() => rerender(<ProjectInlineDetail {...props} open={false} />));

      // No clock has been advanced. Under motion this exact point is where the
      // panel is deliberately STILL on screen (see the first test), so the removal
      // here can only have come from the reduced-motion branch — and it means the
      // visitor is never held through 320ms of nothing.
      expect(panel(container)).toBeNull();
      // No exit timeline and no scope: the skip is not "a very short animation".
      expect(timelines.length).toBe(beforeTimelines);
      expect(scopes.length).toBe(beforeScopes);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // `createScope` runs its `add` callback through `execute()`, which re-reads the
  // MediaQueryList. This is a visitor opting into reduced motion AFTER the effect
  // body already committed to animating: the effect's own `isReducedMotion()` reads
  // false, the scope's `matches` sees true. Only the in-scope re-check catches it —
  // and it must still leave at once, not build a 320ms exit.
  it('reduced motion switched on between the effect body and the scope callback still leaves at once', () => {
    const { container, rerender, props } = renderDetail(true);
    expect(panel(container)).not.toBeNull();

    forceScopeReduceMotion.value = true;
    try {
      act(() => rerender(<ProjectInlineDetail {...props} open={false} />));
    } finally {
      forceScopeReduceMotion.value = null;
    }

    expect(exitTimeline()).toBeUndefined();
    expect(panel(container)).toBeNull();
  });

  // `Homepage.tsx:272-275` clears `detailProject` in the SAME batch that flips
  // `open`, so the exit would have nothing to render without `lastProjectRef`. If
  // that ref were missing, `!shownProject` would return null on the very commit and
  // the panel would be gone — the fix's symptom would return wearing a new cause.
  it('the exit still has content when the parent clears the project in the same batch', () => {
    const { container, rerender, props } = renderDetail(true);
    const nodeBefore = panel(container);
    expect(nodeBefore).toHaveTextContent(demoProject.title);

    act(() =>
      rerender(<ProjectInlineDetail {...props} project={null} open={false} />),
    );

    // Still mounted AND still showing what it was showing, so the fade has a node
    // with something to fade.
    const node = panel(container);
    expect(node).not.toBeNull();
    expect(node).toBe(nodeBefore);
    expect(node).toHaveTextContent(demoProject.title);

    const tl = exitTimeline();
    expect(tl).toBeDefined();
    expect(tl!.adds[0].target).toBe(node);

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });
    expect(panel(container)).toBeNull();
  });

  // The flip side of `lastProjectRef`: it must not INVENT content. With nothing to
  // remember there is genuinely nothing to show, and the `!shownProject` guard is
  // what says so — `isMounted` stays true, which is why `!panel` in the exit effect
  // has to leave cleanly instead of animating a node that was never rendered.
  it('an open panel with no project and nothing remembered renders nothing, and closes without an exit', () => {
    const { container, rerender, props } = renderDetail(true, {
      project: null,
    });
    expect(panel(container)).toBeNull();

    const beforeTimelines = timelines.length;
    const beforeScopes = scopes.length;
    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));

    expect(panel(container)).toBeNull();
    expect(timelines.length).toBe(beforeTimelines);
    expect(scopes.length).toBe(beforeScopes);
  });

  it('closing twice in a row does not start a second exit', () => {
    const { container, rerender, props } = renderDetail(true);
    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));
    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));
    expect(exitTimeline()).toBe(tl);

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });
    expect(panel(container)).toBeNull();
  });

  it('no scope leaks: the exit scope is reverted once the exit is done', () => {
    const { rerender, props, unmount } = renderDetail(true);
    act(() => rerender(<ProjectInlineDetail {...props} open={false} />));
    act(() => {
      (exitTimeline()!.params!.onComplete as () => void)();
    });
    unmount();

    // Any scope still unreverted here would be holding a detached root and its
    // tween, for the life of the document.
    expect(scopes.filter((s) => s.revert.mock.calls.length === 0)).toHaveLength(
      0,
    );
  });
});

describe('ProjectStrip — featured-slice disclosure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    timelines.length = 0;
    forceScopeReduceMotion.value = null;
    mockMatchMedia(false);
  });

  afterEach(clearMatchMedia);

  const sixProjects = [1, 2, 3, 4, 5, 6].map(project);

  const grid = () => document.getElementById(STRIP_GRID_ID);

  // The expanded branch is where the old build announced `false` — telling assistive
  // tech the grid was sliced when every project was on screen. Collapsed must be the
  // mirror image, so both states are asserted in one test: a control that is always
  // `true` (or always `false`) would pass half of this by accident.
  it('both disclosure branches announce their real state and point at the grid', () => {
    const onSelect = vi.fn();
    render(<ProjectStrip projects={sixProjects} onSelect={onSelect} />);

    // Collapsed: the grid is sliced to 4 of 6.
    expect(grid()!.querySelectorAll('button')).toHaveLength(4);
    const collapsed = screen.getByRole('button', {
      name: /view all 06 projects/i,
    });
    expect(collapsed).toHaveAttribute('aria-expanded', 'false');
    expect(collapsed.getAttribute('aria-controls')).toBe(STRIP_GRID_ID);
    expect(grid()).not.toBeNull();

    fireEvent.click(collapsed);

    // Expanded: every project is in the grid, and the control says so.
    expect(grid()!.querySelectorAll('button')).toHaveLength(6);
    const expanded = screen.getByRole('button', {
      name: /show featured 4/i,
    });
    expect(expanded).toHaveAttribute('aria-expanded', 'true');
    expect(expanded.getAttribute('aria-controls')).toBe(STRIP_GRID_ID);

    // The round trip is reversible — a disclosure that cannot be collapsed is not
    // a disclosure.
    fireEvent.click(expanded);
    expect(grid()!.querySelectorAll('button')).toHaveLength(4);
    expect(
      screen.getByRole('button', { name: /view all 06 projects/i }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  // Nothing is hidden, so there is nothing to disclose. A `VIEW ALL 04 PROJECTS`
  // control here would be a button that lies about doing something.
  it('renders no disclosure control when every project already fits the slice', () => {
    render(
      <ProjectStrip projects={sixProjects.slice(0, 4)} onSelect={vi.fn()} />,
    );

    expect(grid()!.querySelectorAll('button')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /view all/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /show featured/i })).toBeNull();
  });
});
