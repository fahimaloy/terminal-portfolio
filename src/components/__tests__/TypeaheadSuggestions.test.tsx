// src/components/__tests__/TypeaheadSuggestions.test.tsx
//
// Content rendering + lifecycle behaviour for the chat typeahead popup.
//
// THE DEFECT UNDER TEST. The render gate was `if (!open) return null`, so the
// commit that flipped `open` to false detached the `<ul>` and the effect's own
// first line (`if (!listRef.current) return;`) bailed out before reaching the
// close branch. The exit animation below it was unreachable dead code: the
// popup cut out instantly on every dismissal. These tests pin the properties
// the fix has to hold:
//
//   1. closing keeps the popup in the DOM until the exit completes,
//   2. re-opening mid-exit leaves the *same node* (stale completions are
//      inert) — node identity, not presence,
//   3. under reduced motion the exit is skipped and the popup leaves at once,
//      and reduced motion flipped *inside* the scope callback also leaves,
//   4. the deadline backstop unmounts even if `onComplete` never fires.
//
// Plus the regression guard for `isMounted` in the entrance's deps (opening
// from closed must both mount the node and run the entrance), the token/timing
// contract on the tween values, and the two `scope.revert()` guarantees (no
// leak, and no throw escaping into React's effect phase).
//
// HARNESS NOTES (jsdom has no `window.matchMedia` in this repo — see
// vitest.setup.ts — so `canAnimate()` is false repo-wide and motion is inert
// until it is mocked).
//   * `forceScopeReduceMotion` decouples what `scope.execute()` sees from what
//     the effect body sees. That is the ONLY way to reach the "flipped between
//     the two reads" window: a counter-based matchMedia would be consumed by the
//     effect's own `isReducedMotion()` / `canAnimate()` calls before the scope
//     callback ever ran.
//   * "no scope was created" is a load-bearing observable, distinct from "the
//     popup left the DOM": `useMotionScope.run` never calls `createScope` when
//     reduced, so an early-out and an in-scope `finish()` leave the same DOM
//     behind and only one of them leaves a scope behind. Both paths are
//     asserted separately below.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const {
  /** Every scope the component builds, so a test can assert `revert()` ran. */
  scopes,
  /**
   * Every `createTimeline` params object. The exit timeline is the only one
   * this component creates, and the only one with an `onComplete`.
   */
  timelineParams,
  /** The entrance tween goes through `animate()`; the exit does not. */
  mockAnimate,
  /**
   * Forces the value the scope's `execute()` sees, independent of what
   * `window.matchMedia` reports to the effect body. `null` = read the real
   * flag (the production-faithful default); `true` = the visitor switched
   * reduced motion on between the effect's own check and `scope.add`.
   */
  forceScopeReduceMotion,
  /**
   * Makes every scope's `revert()` throw, reproducing anime.js rejecting a
   * scope whose root has already been detached. The component wraps `revert()`
   * in try/catch precisely for this.
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
        // here too.
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
  stagger: vi.fn((v: unknown) => v as any),
  spring: vi.fn(() => 'spring-ease' as any),
}));

import TypeaheadSuggestions from '../ui/TypeaheadSuggestions';
import type { Suggestion } from '../ui/useTypeaheadSuggestions';
import { durations } from '../../config/animations';

const SUGGESTIONS: Suggestion[] = [
  { id: 'a', label: 'Aurora Borealis', hint: 'effect' },
  { id: 'b', label: 'Abandoned Cartographer' },
];

/** The enter is `--dur-tap` × 1000; the exit is that pair at 80% of it. */
const ENTER_MS = durations.tap * 1000;
const EXIT_MS = ENTER_MS * 0.8;

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

function resetMocks() {
  vi.clearAllMocks();
  scopes.length = 0;
  timelineParams.length = 0;
  forceScopeReduceMotion.value = null;
  revertShouldThrow.value = false;
}

/** The exit timeline: the only one, and the only one with an `onComplete`. */
function exitTimeline() {
  const found = timelineParams.filter(
    (t) => !!t.params && typeof t.params.onComplete === 'function',
  );
  return found[found.length - 1];
}

const list = () => document.querySelector('[role="listbox"]');

/** The entrance tween — the `animate()` call that fades *in*. */
function enterTween(): Record<string, unknown> | undefined {
  const call = mockAnimate.mock.calls.find(([, params]) => {
    const o = (params as { opacity?: unknown }).opacity;
    return Array.isArray(o) && o[0] === 0;
  });
  return call?.[1] as Record<string, unknown> | undefined;
}

function renderPopup(
  open: boolean,
  overrides: Partial<Record<string, unknown>> = {},
) {
  const props: Record<string, unknown> = {
    query: 'au',
    suggestions: SUGGESTIONS,
    onSelect: vi.fn(),
    open,
    ...overrides,
  };
  const utils = render(<TypeaheadSuggestions {...(props as any)} />);
  return { ...utils, props };
}

describe('TypeaheadSuggestions content', () => {
  beforeEach(() => {
    resetMocks();
    mockMatchMedia(true); // content-only: motion off keeps these assertions pure
  });

  afterEach(clearMatchMedia);

  it('renders a labelled listbox of options', () => {
    renderPopup(true);
    expect(
      screen.getByRole('listbox', { name: 'Suggestions' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(SUGGESTIONS.length);
    expect(screen.getByText('Aurora Borealis')).toBeInTheDocument();
    expect(screen.getByText('effect')).toBeInTheDocument();
  });

  it('clicking an option selects that suggestion', () => {
    const onSelect = vi.fn();
    renderPopup(true, { onSelect });
    fireEvent.mouseDown(screen.getByText('Abandoned Cartographer'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBe(SUGGESTIONS[1]);
  });

  it('closed renders nothing', () => {
    renderPopup(false);
    expect(list()).toBeNull();
  });

  it('an open popup with no matches renders the empty hint', () => {
    // Not a lifecycle guard: "open with nothing to match" is a state this
    // popup has content for, so the list stays mounted.
    renderPopup(true, { suggestions: [] });
    expect(list()).not.toBeNull();
    expect(screen.getByText('NO MATCHES')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('the empty hint is overridable', () => {
    renderPopup(true, { suggestions: [], emptyHint: 'NOTHING_HERE' });
    expect(screen.getByText('NOTHING_HERE')).toBeInTheDocument();
  });
});

describe('TypeaheadSuggestions exit animation', () => {
  beforeEach(() => {
    resetMocks();
    mockMatchMedia(false); // motion allowed
  });

  afterEach(clearMatchMedia);

  it('closing keeps the popup in the DOM until the exit completes, then removes it', () => {
    const { rerender, props } = renderPopup(true);
    expect(list()).not.toBeNull();

    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );

    // Still on screen: this is the whole point of the fix. Under the old
    // `if (!open) return null` gate this assertion is null on the first commit.
    expect(list()).not.toBeNull();
    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });

    expect(list()).toBeNull();

    // `isMounted` flipping re-runs the exit effect. Without the `!isMounted`
    // re-entry guard that second pass would start the exit all over again --
    // forever, since each completion would flip `isMounted` and re-trigger.
    expect(timelineParams.filter((t) => t.params?.onComplete)).toHaveLength(1);
    expect(exitTimeline()).toBe(tl);
  });

  it('an exit cycle commits exactly three times: one unmount, no extra pass', () => {
    // The DOM cannot see this one. A redundant `setIsMounted(false)` dispatched
    // after the node is already gone still re-renders, and renders the same
    // `null` -- invisible, but it is the first half of "the exit restarts
    // forever", because each completion flips the state and re-triggers the
    // effect that owns the exit. So the invariant is pinned at the commit
    // level: a `Profiler` boundary counts commits without instrumenting the
    // component, and `expect(commits)` pins "exactly one unmount".
    const commits: string[] = [];
    const onRender = (_id: string, phase: string) => {
      commits.push(phase);
    };
    const props: Record<string, unknown> = {
      query: 'au',
      suggestions: SUGGESTIONS,
      onSelect: vi.fn(),
    };
    const view = (open: boolean) => (
      <React.Profiler id="typeahead" onRender={onRender}>
        <TypeaheadSuggestions {...(props as any)} open={open} />
      </React.Profiler>
    );

    const { rerender } = render(view(true));
    act(() => rerender(view(false)));
    act(() => {
      (exitTimeline()!.params!.onComplete as () => void)();
    });
    act(() => {}); // let the post-unmount effect pass settle

    expect(commits).toEqual(['mount', 'update', 'update']);
    // Still exactly one exit: the extra pass built no timeline.
    expect(timelineParams.filter((t) => t.params?.onComplete)).toHaveLength(1);
  });

  it('the exit plays the enter pair backwards on one tween at one position', () => {
    const { rerender, props } = renderPopup(true);
    const enter = enterTween();
    expect(enter).toBeDefined();

    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );

    const tl = exitTimeline();
    expect(tl!.adds).toHaveLength(1);
    expect(tl!.adds[0].position).toBe(0);
    expect(tl!.adds[0].target).toBe(list());

    const exit = tl!.adds[0].params;
    // Literally the enter's pairs, reversed.
    expect(exit.opacity).toEqual([1, 0]);
    expect(exit.y).toEqual([0, -4]);
    expect([...(enter!.opacity as number[])].reverse()).toEqual(exit.opacity);
    expect([...(enter!.y as number[])].reverse()).toEqual(exit.y);

    for (const tween of [enter!, exit]) {
      // Nothing that would force layout while the visitor is watching.
      for (const layoutProp of ['height', 'top', 'left', 'margin', 'padding']) {
        expect(tween).not.toHaveProperty(layoutProp);
      }
      // Timing comes from tokens, never raw literals -- and anime v4 wants
      // milliseconds, so the seconds-valued `durations` are scaled.
      expect(tween.duration).toBeGreaterThan(0);
      expect(typeof tween.ease).toBe('string');
    }
    expect(enter!.duration).toBe(ENTER_MS);
    expect(exit.duration).toBe(EXIT_MS);
    // The close is faster than the arrival took: a typeahead is replaced by
    // the next keystroke, so it must not linger.
    expect(exit.duration as number).toBeLessThan(ENTER_MS);
    // Same easing both ways, so open and close read as one motion.
    expect(exit.ease).toBe(enter!.ease);
  });

  it('deadline backstop unmounts the popup if onComplete never arrives', () => {
    vi.useFakeTimers();
    try {
      const { rerender, props } = renderPopup(true);
      act(() =>
        rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
      );
      expect(list()).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(list()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-opening mid-exit reverts the in-flight exit scope', () => {
    const { rerender, props } = renderPopup(true);
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    const exitScope = scopes[scopes.length - 1];

    act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));

    // Visible again -- the rapid-toggle bug is "stuck invisible".
    expect(list()).not.toBeNull();
    // This exact scope, not merely "some scope": the entrance scope was already
    // reverted by its own cleanup, so this can only be the exit's.
    expect(exitScope.revert).toHaveBeenCalled();
  });

  it('a stale exit completion after re-opening does not unmount the popup', () => {
    const { rerender, props } = renderPopup(true);
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    const stale = exitTimeline()!;

    act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));
    expect(list()).not.toBeNull();

    // NODE IDENTITY, not just presence. A stale completion that unmounts and
    // lets the `open` branch re-mount would still leave *something* in the DOM
    // by the end of the act, so presence alone cannot see the bug: React commits
    // the `isMounted: false` render (removing the node) before the effect that
    // re-mounts it runs, so the subtree gets a brand new node. This single
    // assertion is what separates a guarded exit from an unguarded one.
    const nodeBefore = list();
    expect(nodeBefore).not.toBeNull();

    // The callback that outlived its scope must be inert. This is what the
    // token guard buys: without it the popup is torn down by an exit the
    // visitor already cancelled.
    act(() => {
      (stale.params!.onComplete as () => void)();
    });

    expect(list()).not.toBeNull();
    expect(list()).toBe(nodeBefore);
  });

  it('closing cancels the in-flight entrance before the exit starts', () => {
    // The entrance effect's cleanup reverts its own scope, so the exit tween's
    // `[1, 0]` starting value is never read off a node another tween still owns.
    const { rerender, props } = renderPopup(true);
    const entranceScope = scopes[scopes.length - 1];
    expect(entranceScope.revert).not.toHaveBeenCalled();

    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );

    expect(entranceScope.revert).toHaveBeenCalled();
  });

  it('a second open->close cycle still exits correctly after a rapid toggle', () => {
    const { rerender, props } = renderPopup(true);
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));
    timelineParams.length = 0;

    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    expect(list()).not.toBeNull();
    const tl = exitTimeline();
    expect(tl).toBeDefined();

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });
    expect(list()).toBeNull();
  });

  it('opening from closed mounts the popup AND runs the entrance animation', () => {
    // Regression guard: the entrance effect needs `isMounted` in its deps.
    // Without it the first open after a close animates nothing, because the
    // ref does not exist until the commit that `setIsMounted(true)` triggers.
    const { rerender, props } = renderPopup(false);
    expect(list()).toBeNull();

    mockAnimate.mockClear();
    act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));

    expect(list()).not.toBeNull();
    expect(enterTween()).toBeDefined();
  });

  it('no scope leaks: every scope built for this cycle is reverted', () => {
    const { rerender, props, unmount } = renderPopup(true);
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    act(() => {
      (exitTimeline()!.params!.onComplete as () => void)();
    });
    unmount();

    const unreverted = scopes.filter((s) => s.revert.mock.calls.length === 0);
    expect(unreverted.length).toBe(0);
  });

  it('the exit scope is torn down as the popup leaves, not at teardown', () => {
    // `isMounted` being in the exit effect's deps is what makes the effect
    // re-run -- and so run its own cleanup -- on the commit that unmounts the
    // popup. Without that dep the exit scope survives with its tween aimed at
    // a detached node and its deadline timer still armed, until something
    // else happens to unmount the component. Asserting this on the scope
    // rather than on the DOM is deliberate: the leaked scope writes opacity
    // into a node nobody can see, so it is invisible from the outside.
    const { rerender, props } = renderPopup(true);
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );

    const exitScope = scopes[scopes.length - 1];
    expect(exitScope.revert).not.toHaveBeenCalled();

    act(() => {
      (exitTimeline()!.params!.onComplete as () => void)();
    });
    act(() => {});

    expect(list()).toBeNull();
    expect(exitScope.revert).toHaveBeenCalledTimes(1);
  });

  it('a scope that throws on revert does not break the next open', () => {
    // `scope.revert()` throws in anime.js when the scope's root has already
    // been detached -- exactly the state cleanup runs in. An unwrapped throw
    // there escapes into React's effect phase and takes the remount with it, so
    // the popup would stay unmounted for the rest of the session.
    const { rerender, props } = renderPopup(true);
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );

    revertShouldThrow.value = true;
    try {
      // Re-opening runs the entrance cleanup and the exit cleanup, both of
      // which revert.
      act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));
    } finally {
      revertShouldThrow.value = false;
    }

    // The throws were swallowed and the popup came back.
    expect(list()).not.toBeNull();

    revertShouldThrow.value = true;
    try {
      act(() =>
        rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
      );
      expect(list()).not.toBeNull();
    } finally {
      revertShouldThrow.value = false;
    }
  });
});

describe('TypeaheadSuggestions reduced motion', () => {
  beforeEach(() => {
    resetMocks();
    mockMatchMedia(true); // reduced
  });

  afterEach(clearMatchMedia);

  it('reduced motion: the entrance is skipped and the popup renders at rest', () => {
    renderPopup(true);
    expect(list()).not.toBeNull();
    // `useMotionScope.run` never builds a scope when reduced, so no tween.
    expect(scopes).toHaveLength(0);
    expect(mockAnimate).not.toHaveBeenCalled();
    // The resting inline opacity is what makes that safe.
    expect((list() as HTMLElement).style.opacity).toBe('1');
  });

  it('reduced motion: the exit is skipped and the popup leaves immediately', () => {
    const { rerender, props } = renderPopup(true);
    expect(list()).not.toBeNull();

    const beforeTimelines = timelineParams.length;
    const beforeScopes = scopes.length;
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );

    // No exit timeline and no waiting for one. Relying only on the in-scope
    // `matches` re-check would still unmount in the same tick, so the DOM cannot
    // tell the two apart -- the absence of a scope can.
    expect(timelineParams.length).toBe(beforeTimelines);
    expect(scopes.length).toBe(beforeScopes);
    expect(list()).toBeNull();
  });

  it('reduced motion switched on mid-open still unmounts without an exit', () => {
    const { rerender, props } = renderPopup(true);
    const beforeTimelines = timelineParams.length;
    const beforeScopes = scopes.length;
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    expect(timelineParams.length).toBe(beforeTimelines);
    expect(scopes.length).toBe(beforeScopes);
    expect(list()).toBeNull();
  });

  it('reduced motion: re-opening works and a later close still leaves at once', () => {
    const { rerender, props } = renderPopup(true);
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    expect(list()).toBeNull();

    act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));
    expect(list()).not.toBeNull();

    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    expect(list()).toBeNull();
  });

  it('reduced motion flipped inside the scope callback still leaves immediately', () => {
    // `createScope` runs its `add` callback through `execute()`, which re-reads
    // the MediaQueryList. This is the window the in-scope re-check exists to
    // cover: the effect body's `isReducedMotion()`/`canAnimate()` read the flag
    // as `false` and commit to animating, the scope's `matches` sees `true`.
    // Observable here is the ABSENCE of a timeline, not the DOM -- the
    // in-scope path calls `finish()` and removes the popup on the same tick as
    // the effect-body early-out does.
    mockMatchMedia(false);
    const { rerender, props } = renderPopup(true);
    expect(list()).not.toBeNull();

    forceScopeReduceMotion.value = true;
    try {
      act(() =>
        rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
      );
    } finally {
      forceScopeReduceMotion.value = null;
    }

    expect(exitTimeline()).toBeUndefined();
    expect(timelineParams).toHaveLength(0);
    expect(list()).toBeNull();
  });

  it('reduced motion flipped inside the scope callback skips the entrance too', () => {
    // Same window on the open side: the effect body thought motion was allowed,
    // so a scope was built and the callback ran -- but the visitor's preference
    // says otherwise, so no tween is built and the popup sits at rest.
    mockMatchMedia(false);
    const { rerender, props } = renderPopup(false);
    expect(list()).toBeNull();

    // Control: with both reads agreeing, the entrance tween IS built. Without
    // this the assertion below could not tell a skipped tween from a component
    // that never animates at all.
    act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));
    expect(enterTween()).toBeDefined();

    // Close for real, then re-open with only the scope-side read flipped.
    act(() =>
      rerender(<TypeaheadSuggestions {...(props as any)} open={false} />),
    );
    act(() => {
      (exitTimeline()!.params!.onComplete as () => void)();
    });
    expect(list()).toBeNull();

    mockAnimate.mockClear();
    forceScopeReduceMotion.value = true;
    try {
      act(() => rerender(<TypeaheadSuggestions {...(props as any)} open />));
    } finally {
      forceScopeReduceMotion.value = null;
    }

    expect(list()).not.toBeNull();
    expect(mockAnimate).not.toHaveBeenCalled();
  });
});
