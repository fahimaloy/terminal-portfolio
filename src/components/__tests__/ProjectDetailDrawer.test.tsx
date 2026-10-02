// src/components/__tests__/ProjectDetailDrawer.test.tsx
//
// Content rendering + exit-animation behaviour for the project detail drawer.
//
// The defect under test: `if (!isOpen || !project) return null` removed the
// backdrop and panel on the same commit that flipped the prop, so the close
// animation `handleClose` started afterwards was animating a detached node and
// the visitor saw an instant cut with no exit. These tests pin the properties
// the fix has to hold:
//
//   1. closing keeps the drawer in the DOM until the exit completes,
//   2. re-opening mid-exit leaves the *same node* visible (stale completions
//      are inert),
//   3. under reduced motion the exit is skipped and the drawer leaves at once,
//   4. the deadline backstop unmounts even if `onComplete` never fires.
//
// Plus the regression guard for the `isMounted` dependency on the entrance:
// opening from a closed state must both mount the subtree and run the entrance.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const {
  // Every scope the component builds, so a test can assert `revert()` ran.
  scopes,
  // Every `createTimeline` params object -- the exit timeline is the one whose
  // `onComplete` is set.
  timelineParams,
  mockAnimate,
  mockStaggerFn,
  /**
   * Forces the value the scope's `execute()` sees, independent of what
   * `window.matchMedia` reports to the effect body. `null` = read the real
   * flag (the production-faithful default); `true` = simulate the visitor
   * switching reduced motion on between the effect's own check and the scope's
   * `add`, which is the only window the in-scope re-check exists to cover.
   */
  forceScopeReduceMotion,
  /**
   * Makes every scope's `revert()` throw, reproducing the real anime.js
   * behaviour of rejecting a scope whose root has already been detached. The
   * component's cleanup wraps `revert()` in try/catch precisely for this.
   */
  revertShouldThrow,
} = vi.hoisted(() => ({
  scopes: [] as Array<{
    add: (cb: () => void) => unknown;
    revert: ReturnType<typeof vi.fn>;
    matches: Record<string, boolean>;
  }>,
  timelineParams: [] as Array<{
    params?: Record<string, unknown>;
    adds: Array<{
      target: unknown;
      params: Record<string, unknown>;
      position?: unknown;
    }>;
  }>,
  mockAnimate: vi.fn(),
  mockStaggerFn: vi.fn((v: unknown) => v as any),
  forceScopeReduceMotion: { value: null as boolean | null },
  revertShouldThrow: { value: false },
}));

vi.mock('animejs', () => ({
  __esModule: true,
  createScope: vi.fn(() => {
    const scope = {
      add: vi.fn((cb: () => void) => {
        // Mirrors the real scope: `execute()` re-reads the MediaQueryList, so
        // production code's live `scope.matches.reduceMotion` check is live
        // here too. `forceScopeReduceMotion` lets a test decouple the two
        // reads, which is how the "flipped between the two reads" case is
        // reachable at all -- a counter-based matchMedia also gets consumed by
        // the entrance effect's own `isReducedMotion()` call.
        scope.matches = {
          reduceMotion:
            forceScopeReduceMotion.value ??
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        };
        cb();
        return scope;
      }),
      revert: vi.fn(() => {
        if (revertShouldThrow.value) throw new Error('root already detached');
        return scope;
      }),
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
    timelineParams.push(tl);
    return tl as any;
  }),
  animate: mockAnimate,
  stagger: mockStaggerFn,
  spring: vi.fn(() => 'spring-ease' as any),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement('img', props),
}));

import ProjectDetailDrawer from '../ProjectDetailDrawer';
import { durations } from '../../config/animations';
import type { PortfolioProject, PortfolioSkill } from '../../utils/api';

const demoProject: PortfolioProject = {
  id: 3,
  title: 'Drawer Demo',
  description: 'Drawer body copy',
  description_html: null,
  image_url: null,
  thumbnail_url: 'https://example.com/cover.png',
  short_title: null,
  icon_key: null,
  project_url: 'https://example.com/live',
  repo_url: 'https://example.com/repo',
  languages: ['TypeScript', 'React'],
  tags: ['React'],
  client_name: null,
  client_location: null,
  client_logo: null,
  featured: false,
  featured_order: 0,
  sort_order: 1,
  is_visible: true,
};

const skillReact: PortfolioSkill = {
  id: 7,
  name: 'React',
  category: 'Frontend',
  level: '80',
  icon_key: 'react',
  icon_type: null,
  icon_color: null,
  duration: null,
  sort_order: 1,
  is_visible: true,
};

function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function clearMatchMedia() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).matchMedia;
}

/** The exit timeline is the one created with an `onComplete`. */
function exitTimeline() {
  const found = timelineParams.filter(
    (t) => !!t.params && typeof t.params.onComplete === 'function',
  );
  return found[found.length - 1];
}

const drawer = () => document.querySelector('[role="dialog"]');

function renderDrawer(
  isOpen: boolean,
  overrides: Partial<Record<string, unknown>> = {},
) {
  const props: Record<string, unknown> = {
    isOpen,
    onClose: vi.fn(),
    projects: [demoProject],
    skills: [skillReact],
    ...overrides,
  };
  const utils = render(<ProjectDetailDrawer {...(props as any)} />);
  return { ...utils, props };
}

describe('ProjectDetailDrawer content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    timelineParams.length = 0;
    mockMatchMedia(true);
  });

  afterEach(clearMatchMedia);

  it('renders cover, tags, languages, and links as a labelled dialog', () => {
    renderDrawer(true);
    const dialog = screen.getByRole('dialog', { name: 'Drawer Demo' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Drawer Demo')).toBeInTheDocument();
    expect(screen.getByText('Drawer body copy')).toBeInTheDocument();
    expect(screen.getAllByText('React').length).toBeGreaterThan(0);
    expect(screen.getByText('Live Demo')).toBeInTheDocument();
    expect(screen.getByText('Repository')).toBeInTheDocument();
  });

  it('closed renders nothing', () => {
    renderDrawer(false);
    expect(drawer()).toBeNull();
  });

  it('an open drawer with no projects renders nothing', () => {
    renderDrawer(true, { projects: [] });
    expect(drawer()).toBeNull();
  });

  it('closes via the close button and the Escape key', () => {
    const onClose = vi.fn();
    renderDrawer(true, { onClose });
    fireEvent.click(screen.getByLabelText('Close project details'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('ProjectDetailDrawer exit animation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    timelineParams.length = 0;
    mockMatchMedia(false);
  });

  afterEach(clearMatchMedia);

  it('closing keeps the drawer in the DOM until the exit completes, then removes it', () => {
    const { rerender, props } = renderDrawer(true);
    expect(drawer()).not.toBeNull();

    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );

    // Still on screen: this is the whole point of the fix.
    expect(drawer()).not.toBeNull();
    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });

    expect(drawer()).toBeNull();

    // `isMounted` flipping re-runs the exit effect. Without the `!isMounted`
    // re-entry guard that second pass would start the exit all over again --
    // forever, since each completion would flip `isMounted` and re-trigger.
    expect(timelineParams.filter((t) => t.params?.onComplete)).toHaveLength(1);
    expect(exitTimeline()).toBe(tl);
  });

  it('the exit registers exactly two tweens — backdrop and panel — and only opacity/transform', () => {
    const { rerender, props } = renderDrawer(true);
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );

    const tl = exitTimeline();
    expect(tl).toBeDefined();
    expect(tl!.adds).toHaveLength(2);
    // Both start at position 0, so they run concurrently.
    expect(tl!.adds.every((a) => a.position === 0)).toBe(true);

    const backdropTween = tl!.adds[0].params;
    const panelTween = tl!.adds[1].params;

    // Backdrop: fade only. Panel: fade + the offset the entrance came from.
    expect(backdropTween.opacity).toEqual([1, 0]);
    expect(backdropTween).not.toHaveProperty('x');
    expect(panelTween.opacity).toEqual([1, 0]);
    expect(panelTween.x).toEqual(['0%', '100%']);

    for (const tween of [backdropTween, panelTween]) {
      // Nothing that would force layout while the visitor is watching.
      for (const layoutProp of ['height', 'top', 'left', 'margin', 'padding']) {
        expect(tween).not.toHaveProperty(layoutProp);
      }
      // Timing comes from tokens, never raw literals.
      expect(typeof tween.duration).toBe('number');
      expect(tween.duration).toBeGreaterThan(0);
      expect(typeof tween.ease).toBe('string');
    }

    // The exit is the enter pair backwards and slightly faster: shorter than
    // the entrance's backdrop fade, and the panel leads the backdrop so the
    // slower node is the one that owns the unmount.
    const enterBackdropMs = durations.enter * 1000 * 0.6;
    expect(backdropTween.duration).toBeLessThan(enterBackdropMs);
    expect(panelTween.duration).toBeLessThan(durations.exit * 1000);
    expect(panelTween.duration).toBeGreaterThan(
      backdropTween.duration as number,
    );
  });

  it('deadline backstop unmounts the drawer if onComplete never arrives', () => {
    vi.useFakeTimers();
    try {
      const { rerender, props } = renderDrawer(true);
      act(() =>
        rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
      );
      expect(drawer()).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(drawer()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-opening mid-exit leaves the drawer visible and reverts the exit scope', () => {
    const { rerender, props } = renderDrawer(true);
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );

    act(() => rerender(<ProjectDetailDrawer {...(props as any)} isOpen />));

    // Visible again -- the rapid-toggle bug is "stuck invisible".
    expect(drawer()).not.toBeNull();
    // The in-flight exit was cleaned up by the effect's own cleanup.
    expect(scopes.some((s) => s.revert.mock.calls.length > 0)).toBe(true);
  });

  it('a stale exit completion after re-opening does not unmount the drawer', () => {
    const { rerender, props } = renderDrawer(true);
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );
    const stale = exitTimeline()!;

    act(() => rerender(<ProjectDetailDrawer {...(props as any)} isOpen />));
    expect(drawer()).not.toBeNull();
    // Node identity, not just presence: a stale completion that unmounts and
    // lets the `isOpen` branch re-mount would still leave *something* in the
    // DOM by the end of the act, so presence alone cannot see the bug. React
    // commits the `isMounted: false` render (removing the node) before the
    // effect that re-mounts it runs, so the subtree gets a brand new node.
    const nodeBefore = drawer();

    // The callback that outlived its scope must be inert. This is what the
    // token guard buys: without it the drawer is torn down by an exit the
    // visitor already cancelled.
    act(() => {
      (stale.params!.onComplete as () => void)();
    });

    expect(drawer()).not.toBeNull();
    expect(drawer()).toBe(nodeBefore);
  });

  it('a second open->close cycle still exits correctly after a rapid toggle', () => {
    const { rerender, props } = renderDrawer(true);
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );
    act(() => rerender(<ProjectDetailDrawer {...(props as any)} isOpen />));
    timelineParams.length = 0;

    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );
    expect(drawer()).not.toBeNull();
    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });
    expect(drawer()).toBeNull();
  });

  it('opening from closed mounts the subtree AND runs the entrance animation', () => {
    // Regression guard: the entrance effect needs `isMounted` in its deps.
    // Without it the first open after a close animates nothing, because the
    // refs do not exist until the commit that `setIsMounted(true)` triggers.
    const { rerender, props } = renderDrawer(false);
    expect(drawer()).toBeNull();

    mockAnimate.mockClear();
    act(() => rerender(<ProjectDetailDrawer {...(props as any)} isOpen />));

    expect(drawer()).not.toBeNull();
    expect(mockAnimate).toHaveBeenCalled();
  });

  it('reduced motion switched on between the effect body and the scope callback still leaves immediately', () => {
    // `createScope` runs its `add` callback through `execute()`, which re-reads
    // the MediaQueryList. This simulates a visitor opting into reduced motion
    // after the effect body already committed to animating: the effect's own
    // `isReducedMotion()` reads the flag as `false`, the scope's `matches` sees
    // `true`. Only the in-scope re-check catches this -- without it the visitor
    // would sit through an exit they just opted out of, and the exit timeline
    // would be built at all.
    mockMatchMedia(false);
    const { rerender, props } = renderDrawer(true);
    expect(drawer()).not.toBeNull();

    forceScopeReduceMotion.value = true;
    try {
      act(() =>
        rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
      );
    } finally {
      forceScopeReduceMotion.value = null;
    }

    // No exit timeline was built and the subtree is already gone.
    expect(exitTimeline()).toBeUndefined();
    expect(drawer()).toBeNull();
  });

  it('reduced motion: the exit is skipped and the drawer leaves immediately', () => {
    mockMatchMedia(true);
    const { rerender, props } = renderDrawer(true);
    expect(drawer()).not.toBeNull();

    const beforeTimelines = timelineParams.length;
    // No scope either: the effect body's own `isReducedMotion()` check is the
    // path that decides "no exit to watch". Relying only on the in-scope
    // `matches` re-check would still unmount in the same tick, so the DOM
    // cannot tell the two apart -- the absence of a scope can.
    const beforeScopes = scopes.length;
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );

    // No exit timeline at all -- and no waiting for one.
    expect(timelineParams.length).toBe(beforeTimelines);
    expect(scopes.length).toBe(beforeScopes);
    expect(drawer()).toBeNull();
  });

  it('reduced motion switched on mid-open still unmounts without an exit', () => {
    const { rerender, props } = renderDrawer(true);
    mockMatchMedia(true);
    const beforeTimelines = timelineParams.length;
    const beforeScopes = scopes.length;
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );
    expect(timelineParams.length).toBe(beforeTimelines);
    expect(scopes.length).toBe(beforeScopes);
    expect(drawer()).toBeNull();
  });

  it('reduced motion: re-opening works and a later close still leaves at once', () => {
    mockMatchMedia(true);
    const { rerender, props } = renderDrawer(true);
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );
    expect(drawer()).toBeNull();

    act(() => rerender(<ProjectDetailDrawer {...(props as any)} isOpen />));
    expect(drawer()).not.toBeNull();

    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );
    expect(drawer()).toBeNull();
  });

  it('no scope leaks: every scope built for the exit is reverted', () => {
    const { rerender, props, unmount } = renderDrawer(true);
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );
    act(() => {
      (exitTimeline()!.params!.onComplete as () => void)();
    });
    unmount();

    const unreverted = scopes.filter((s) => s.revert.mock.calls.length === 0);
    // Any scope still unreverted here would be a real leak.
    expect(unreverted.length).toBe(0);
  });

  it('a scope that throws on revert does not break the next open', () => {
    // `scope.revert()` throws in anime.js when the scope's root has already
    // been detached -- exactly the state cleanup runs in. An unwrapped throw
    // there escapes into React's effect phase and takes the remount with it, so
    // the drawer would stay unmounted for the rest of the session.
    const { rerender, props } = renderDrawer(true);
    act(() =>
      rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
    );

    revertShouldThrow.value = true;
    try {
      // Closing the drawer runs the exit effect's cleanup, which reverts.
      act(() =>
        rerender(<ProjectDetailDrawer {...(props as any)} isOpen={true} />),
      );
    } finally {
      revertShouldThrow.value = false;
    }

    // The throw was swallowed and the drawer came back.
    expect(drawer()).not.toBeNull();

    // Same for the entrance scope, which `useMotionScope.revert` also guards.
    revertShouldThrow.value = true;
    try {
      act(() =>
        rerender(<ProjectDetailDrawer {...(props as any)} isOpen={false} />),
      );
    } finally {
      revertShouldThrow.value = false;
    }
  });
});
