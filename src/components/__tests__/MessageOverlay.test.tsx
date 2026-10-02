// src/components/__tests__/MessageOverlay.test.tsx
//
// Exit-animation behaviour for the message overlay.
//
// The defect under test: `if (!isOpen) return null` removed the backdrop and
// panel on the same commit that flipped the prop, so any exit animation started
// in an effect afterwards was animating a detached node. These tests pin the
// three properties that fix has to hold:
//
//   1. closing still removes the overlay from the DOM,
//   2. re-opening mid-exit leaves it visible (and a stale completion callback
//      is inert),
//   3. under reduced motion the exit is skipped and the overlay leaves at once.
//
// Plus the regression guard for the `isMounted` dependency: opening from a
// closed state must both mount the subtree and run the entrance animation.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

const {
  // Every scope the component builds, so a test can assert `revert()` ran.
  scopes,
  // Every `createTimeline` params object — the exit timeline is the one whose
  // `onComplete` is set.
  timelineParams,
  mockAnimate,
  mockStaggerFn,
} = vi.hoisted(() => ({
  scopes: [] as Array<{
    add: (cb: () => void) => unknown;
    revert: ReturnType<typeof vi.fn>;
    matches: Record<string, boolean>;
  }>,
  // Every timeline the component builds, with its recorded tweens. The exit
  // timeline is the one whose `params.onComplete` is set.
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
}));

vi.mock('animejs', () => ({
  __esModule: true,
  createScope: vi.fn(() => {
    const scope = {
      add: vi.fn((cb: () => void) => {
        // Mirrors the real scope: `execute()` re-reads the MediaQueryList, so
        // production code's live `scope.matches.reduceMotion` check is live
        // here too.
        scope.matches = {
          reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches,
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
    timelineParams.push(tl);
    return tl as any;
  }),
  animate: mockAnimate,
  stagger: mockStaggerFn,
  spring: vi.fn(() => 'spring-ease' as any),
  splitText: vi.fn(() => ({ chars: [], words: [], revert: vi.fn() }) as any),
  scrambleText: vi.fn((o: any) => o.text ?? ''),
  createDrawable: vi.fn(() => [] as any),
  utils: { $: (sel: any) => (sel ? Array.from(sel) : []) },
}));

// ── Heavy child mocks ────────────────────────────────────────────────────────
// The overlay renders six sibling components that each pull in Supabase, the
// scene layer or a large icon set. None of them are under test here.
vi.mock('../AdvancedFeaturesBar', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../ContactForm', () => ({ __esModule: true, default: () => null }));
vi.mock('../MeetingForm', () => ({ __esModule: true, default: () => null }));
vi.mock('../ProjectMatchForm', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../SkillFilterPanel', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../ui', () => ({
  HudPanel: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'hud-panel' }, children),
  // Spread props the way the real NeonButton forwards `...rest`.
  NeonButton: (props: any) =>
    React.createElement('button', { ...props }, props.children),
  Ripple: () => null,
  TypeaheadSuggestions: () => null,
  useTypeaheadSuggestions: (_v: string, pool: unknown[]) => pool,
}));

vi.mock('react-icons/fi', () => ({
  FiSend: () => null,
  FiX: () => null,
  FiSliders: () => null,
}));

// Only these six are referenced by the module-level QUICK_SUGGESTIONS array,
// which is built at import time and would throw on an undefined member.
vi.mock('lucide-react', () => {
  const icon = () => null;
  return {
    __esModule: true,
    Briefcase: icon,
    Code: icon,
    Layers: icon,
    User: icon,
    Clock: icon,
    Mail: icon,
  };
});

import MessageOverlay from '../MessageOverlay';

// The suggestion hook fires four Supabase reads on mount; stub it so the test
// stays a DOM/animation test.
vi.mock('../../hooks/useEnhancedSuggestions', () => ({
  useEnhancedTypeaheadSuggestions: () => [],
}));

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
  // eslint-disable-next-line
  delete (window as any).matchMedia;
}

/** The exit timeline is the one created with an `onComplete`. */
function exitTimeline() {
  const found = timelineParams.filter(
    (t) => !!t.params && typeof t.params.onComplete === 'function',
  );
  return found[found.length - 1];
}

const overlay = () => document.querySelector('.reveal');

function renderOverlay(isOpen: boolean) {
  const props = {
    isOpen,
    onClose: vi.fn(),
    inputValue: '',
    onInputChange: vi.fn(),
    onSend: vi.fn(),
    isLoading: false,
    suggestions: [] as Array<{ label: string; icon?: React.ReactNode }>,
    projects: [] as any[],
  };
  const utils = render(<MessageOverlay {...(props as any)} />);
  return { ...utils, props };
}

describe('MessageOverlay exit animation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    timelineParams.length = 0;
    mockMatchMedia(false);
  });

  afterEach(() => {
    clearMatchMedia();
    document.body.style.overflow = '';
  });

  it('closed renders nothing', () => {
    renderOverlay(false);
    expect(overlay()).toBeNull();
  });

  it('opening from closed mounts the subtree AND runs the entrance animation', () => {
    // Regression guard: the entrance effect needs `isMounted` in its deps.
    // Without it the first open after a close animates nothing, because the
    // refs do not exist until the commit that `setIsMounted(true)` triggers.
    const { rerender, props } = renderOverlay(false);
    expect(overlay()).toBeNull();

    mockAnimate.mockClear();
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen />));

    expect(overlay()).not.toBeNull();
    expect(mockAnimate).toHaveBeenCalled();
  });

  it('closing keeps the overlay in the DOM until the exit completes, then removes it', () => {
    const { rerender, props } = renderOverlay(true);
    expect(overlay()).not.toBeNull();

    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));

    // Still on screen: this is the whole point of the fix.
    expect(overlay()).not.toBeNull();
    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });

    expect(overlay()).toBeNull();

    // `isMounted` flipping re-runs the exit effect. Without the `!isMounted`
    // re-entry guard that second pass would start the exit all over again —
    // forever, since each completion would flip `isMounted` and re-trigger.
    expect(timelineParams.filter((t) => t.params?.onComplete)).toHaveLength(1);
    expect(exitTimeline()).toBe(tl);
  });

  it('the exit registers exactly two tweens — backdrop and panel — and only opacity/transform', () => {
    const { rerender, props } = renderOverlay(true);
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));

    const tl = exitTimeline();
    expect(tl).toBeDefined();
    expect(tl!.adds).toHaveLength(2);
    // Both start at position 0, so they run concurrently.
    expect(tl!.adds.every((a) => a.position === 0)).toBe(true);

    const backdropTween = tl!.adds[0].params;
    const panelTween = tl!.adds[1].params;

    // Backdrop: fade only. Panel: fade + the 60px offset the entrance came from.
    expect(backdropTween.opacity).toEqual([1, 0]);
    expect(backdropTween).not.toHaveProperty('y');
    expect(panelTween.opacity).toEqual([1, 0]);
    expect(panelTween.y).toEqual([0, 60]);

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

    // The exit is shorter than the entrance it mirrors.
    expect(panelTween.duration).toBeLessThan(350);
    expect(backdropTween.duration).toBeLessThan(200);
  });

  it('deadline backstop unmounts the overlay if onComplete never arrives', () => {
    vi.useFakeTimers();
    try {
      const { rerender, props } = renderOverlay(true);
      act(() =>
        rerender(<MessageOverlay {...(props as any)} isOpen={false} />),
      );
      expect(overlay()).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(overlay()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-opening mid-exit leaves the overlay visible and reverts the exit scope', () => {
    const { rerender, props } = renderOverlay(true);
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));

    const scopeCountBeforeReopen = scopes.length;
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen />));

    // Visible again — the rapid-toggle bug is "stuck invisible".
    expect(overlay()).not.toBeNull();
    // The in-flight exit was cleaned up by the effect's own cleanup.
    expect(scopes.length).toBeGreaterThan(scopeCountBeforeReopen - 1);
    expect(scopes.some((s) => s.revert.mock.calls.length > 0)).toBe(true);
  });

  it('a stale exit completion after re-opening does not unmount the overlay', () => {
    const { rerender, props } = renderOverlay(true);
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));
    const stale = exitTimeline()!;

    act(() => rerender(<MessageOverlay {...(props as any)} isOpen />));
    expect(overlay()).not.toBeNull();
    // Node identity, not just presence: a stale completion that unmounts and
    // lets the `isOpen` branch re-mount would still leave *something* in the
    // DOM by the end of the act, so presence alone cannot see the bug. React
    // commits the `isMounted: false` render (removing the node) before the
    // effect that re-mounts it runs, so the subtree gets a brand new node.
    const nodeBefore = overlay();

    // The callback that outlived its scope must be inert. This is what the
    // token guard buys: without it the overlay is torn down by an exit the
    // visitor already cancelled.
    act(() => {
      (stale.params!.onComplete as () => void)();
    });

    expect(overlay()).not.toBeNull();
    expect(overlay()).toBe(nodeBefore);
  });

  it('a second open→close cycle still exits correctly after a rapid toggle', () => {
    const { rerender, props } = renderOverlay(true);
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen />));
    timelineParams.length = 0;

    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));
    expect(overlay()).not.toBeNull();
    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });
    expect(overlay()).toBeNull();
  });

  it('reduced motion switched on between the effect body and the scope callback still leaves immediately', () => {
    // `createScope` runs its `add` callback through `execute()`, which re-reads
    // the MediaQueryList. This simulates a visitor opting into reduced motion
    // after the effect body already committed to animating: the effect's own
    // `isReducedMotion()` reads the flag as `false`, the scope's `matches` sees
    // `true`. Only the in-scope re-check catches this — without it the visitor
    // would sit through an exit they just opted out of.
    const { rerender, props } = renderOverlay(true);

    // Flip the flag on the third read: `isReducedMotion()` (1) + `canAnimate()`
    // (2) in the effect body, then `scope.add` → `matches` (3).
    let reads = 0;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches:
          query === '(prefers-reduced-motion: reduce)' ? ++reads >= 3 : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));

    // No exit timeline was built and the subtree is already gone.
    expect(exitTimeline()).toBeUndefined();
    expect(overlay()).toBeNull();
  });

  it('reduced motion: the exit is skipped and the overlay leaves immediately', () => {
    mockMatchMedia(true);
    const { rerender, props } = renderOverlay(true);
    expect(overlay()).not.toBeNull();

    const paramsBefore = timelineParams.length;
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));

    // No exit timeline at all — and no waiting for one.
    expect(timelineParams.length).toBe(paramsBefore);
    expect(overlay()).toBeNull();
  });

  it('reduced motion switched on mid-open still unmounts without an exit', () => {
    const { rerender, props } = renderOverlay(true);
    mockMatchMedia(true);
    const before = timelineParams.length;
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));
    expect(timelineParams.length).toBe(before);
    expect(overlay()).toBeNull();
  });

  it('reduced motion: re-opening works and a later close still leaves at once', () => {
    mockMatchMedia(true);
    const { rerender, props } = renderOverlay(true);
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));
    expect(overlay()).toBeNull();

    act(() => rerender(<MessageOverlay {...(props as any)} isOpen />));
    expect(overlay()).not.toBeNull();

    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));
    expect(overlay()).toBeNull();
  });

  it('no scope leaks: every scope built for the exit is reverted', () => {
    const { rerender, props, unmount } = renderOverlay(true);
    act(() => rerender(<MessageOverlay {...(props as any)} isOpen={false} />));
    act(() => {
      (exitTimeline()!.params!.onComplete as () => void)();
    });
    unmount();

    const unreverted = scopes.filter((s) => s.revert.mock.calls.length === 0);
    // The last scope is the chips scope, whose revert happens in its own
    // cleanup; any scope still unreverted here would be a real leak.
    expect(unreverted.length).toBe(0);
  });
});
