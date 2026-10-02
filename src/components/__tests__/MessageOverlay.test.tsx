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
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const {
  // Every scope the component builds, so a test can assert `revert()` ran.
  scopes,
  // Every `createTimeline` params object — the exit timeline is the one whose
  // `onComplete` is set.
  timelineParams,
  mockAnimate,
  mockStaggerFn,
  /**
   * Every props object the overlay handed to `TypeaheadSuggestions`, so a test
   * can read the `open` prop it was given. The recorder wraps the REAL
   * component (see the `../ui` mock below), so the popup's own exit animation
   * still runs here — the point of the typeahead tests is the production render
   * site, which a stubbed popup could not exercise.
   */
  typeaheadProps,
  /** Makes `useTypeaheadSuggestions` return nothing, to reach the empty-hint state. */
  typeaheadHasNoMatches,
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
  typeaheadProps: [] as Array<Record<string, unknown>>,
  typeaheadHasNoMatches: { value: false },
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

// `TypeaheadSuggestions` is the REAL component here, wrapped in a props
// recorder. Mocking it to `null` (as the rest of this file does for its
// siblings) is what hid the production defect: with the popup stubbed out, a
// render site that unmounted it instead of closing it looked identical to one
// that closed it. The real popup animates against the mocked `animejs` exactly
// as it does in its own test file, so the exit these tests assert is the exit
// that ships.
vi.mock('../ui', async () => {
  const actual = await vi.importActual<
    typeof import('../ui/TypeaheadSuggestions')
  >('../ui/TypeaheadSuggestions');
  return {
    HudPanel: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'hud-panel' }, children),
    // Spread props the way the real NeonButton forwards `...rest`.
    NeonButton: (props: any) =>
      React.createElement('button', { ...props }, props.children),
    // `Ripple` is a visual wrapper — it renders `children` inside a single
    // element and adds nothing a test would query. Returning `null` here threw
    // away the entire composer, typeahead included, which is why this suite
    // could describe the panel and its exit but never the row inside it.
    Ripple: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    TypeaheadSuggestions: (props: Record<string, unknown>) => {
      typeaheadProps.push(props);
      return React.createElement(actual.default, props as any);
    },
    useTypeaheadSuggestions: (_v: string, pool: unknown[]) =>
      typeaheadHasNoMatches.value ? [] : pool,
  };
});

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

/**
 * THE POPUP'S EXIT. Same `onComplete` signature as the overlay's own exit, so
 * the tween count is what tells them apart: the overlay animates two nodes
 * (backdrop + panel), the popup animates exactly one — itself.
 */
function popupExitTimelines() {
  return timelineParams.filter(
    (t) =>
      !!t.params &&
      typeof t.params.onComplete === 'function' &&
      t.adds.length === 1,
  );
}

function popupExitTimeline() {
  const found = popupExitTimelines();
  return found[found.length - 1];
}

/** The props the overlay last handed to the popup. */
function lastTypeaheadProps() {
  return typeaheadProps[typeaheadProps.length - 1];
}

/** The popup's `<ul>`. It is the only `role="listbox"` on the page. */
const listbox = () => document.querySelector('[role="listbox"]');

/** `.reveal` is on both the backdrop and the panel; backdrop is the first. */
const backdrop = () => document.querySelectorAll('.reveal')[0] ?? null;

const overlay = () => document.querySelector('.reveal');

function renderOverlay(
  isOpen: boolean,
  overrides: Record<string, unknown> = {},
) {
  const props = {
    isOpen,
    onClose: vi.fn(),
    inputValue: '',
    onInputChange: vi.fn(),
    onSend: vi.fn(),
    isLoading: false,
    suggestions: [] as Array<{ label: string; icon?: React.ReactNode }>,
    projects: [] as any[],
    ...overrides,
  };
  const utils = render(<MessageOverlay {...(props as any)} />);
  return { ...utils, props };
}

describe('MessageOverlay exit animation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    timelineParams.length = 0;
    typeaheadProps.length = 0;
    typeaheadHasNoMatches.value = false;
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

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPEAHEAD POPUP LIFECYCLE AT THE PRODUCTION RENDER SITE

   The defect this pins. `TypeaheadSuggestions` owns its own node lifetime — it
   keeps the `<ul>` mounted for the ~80ms of its exit and drops it from inside —
   but the only place that renders it (this component) conditionalled the whole
   child on `inputValue.length > 0` and hardcoded `open`. So the popup was never
   told to close; it was deleted on the same commit the input emptied, and the
   exit animation committed alongside it could never run outside its own test
   file. The visitor got an instant cut-out.

   The properties that fix has to hold, all asserted here against the REAL popup:

     1. closing hands the popup `open={false}` and leaves the same node in the
        DOM until the popup's own exit completes — NODE IDENTITY, not presence,
     2. "open with nothing to match" is content (the `emptyHint` row), so it is
        still a state the popup can be open in, not an unmount trigger,
     3. an overlay with no suggestion source mounts no popup machinery at all,
     4. the row keeps its chrome and its place in the composer, and the wrapper
        it now outlives draws nothing once the popup hands the node back,
     5. Escape, click-outside and the composer's disabled/loading states are
        untouched, and no React key/unmount warning rides along.
   ═══════════════════════════════════════════════════════════════════════════════ */

const POPUP_SUGGESTIONS = [
  { label: 'Show me your projects' },
  { label: 'What are your skills?' },
];

describe('MessageOverlay typeahead popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    timelineParams.length = 0;
    typeaheadProps.length = 0;
    typeaheadHasNoMatches.value = false;
    mockMatchMedia(false);
  });

  afterEach(() => {
    clearMatchMedia();
    document.body.style.overflow = '';
    typeaheadHasNoMatches.value = false;
  });

  it('typing opens the popup and clearing the input CLOSES it instead of unmounting it', () => {
    // The test this whole task exists for. Under the old render site the first
    // assertion below the `open` one fails immediately: the wrapper was gated on
    // `inputValue.length > 0`, so emptying the input deleted the `<ul>` on that
    // commit and there was no exit left to run.
    const { rerender, props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });

    const node = listbox();
    expect(node).not.toBeNull();
    expect(screen.getByRole('listbox', { name: 'Suggestions' })).toBe(node);
    expect(lastTypeaheadProps().open).toBe(true);

    act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));

    // (1) It was TOLD to close. `toBe(false)` and not `toBeFalsy()` on purpose:
    // dropping the prop and hardcoding `open` are the two half-fixes this site
    // used to have, and both of them leave the popup looking closed-ish.
    expect(lastTypeaheadProps().open).toBe(false);

    // (2) And it is STILL HERE, as the very same node. Presence alone cannot see
    // the difference between "held for the exit" and "reverted, remounted": React
    // commits the unmount before the effect that re-mounts it runs, so a
    // remount hands back a brand new element that passes any `not.toBeNull()`.
    expect(listbox()).toBe(node);

    // (3) Its own exit is running, aimed at that node — one tween, the enter
    // pair reversed, i.e. the animation that shipped with the popup.
    const tl = popupExitTimeline();
    expect(tl).toBeDefined();
    expect(popupExitTimelines()).toHaveLength(1);
    expect(tl!.adds[0].target).toBe(node);
    expect(tl!.adds[0].params.opacity).toEqual([1, 0]);
    expect(tl!.adds[0].params.y).toEqual([0, -4]);

    act(() => {
      (tl!.params!.onComplete as () => void)();
    });
    expect(listbox()).toBeNull();
  });

  it('the popup owns its teardown: the overlay still renders after the popup has left', () => {
    // The wrapper outlives the popup by design, so what is left behind must be
    // inert. This is the assertion that keeps a mounted-but-chromed wrapper from
    // parking an empty band under the composer.
    const { rerender, props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });
    const wrapper = listbox()!.parentElement!;

    act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));
    expect(listbox()).toBeTruthy();

    act(() => {
      (popupExitTimeline()!.params!.onComplete as () => void)();
    });

    // The wrapper survived; the row it used to dress does not exist any more.
    expect(wrapper.isConnected).toBe(true);
    expect(wrapper.childElementCount).toBe(0);
    expect(wrapper.textContent).toBe('');
    expect(wrapper.className).toBe('');
    expect(wrapper.className).not.toMatch(/border|padding|py-|px-/);
    // And the composer below it is still there, undisturbed.
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('0/2000')).toBeInTheDocument();
  });

  it('an open popup with no matches shows the empty hint and is still a live node', () => {
    // `suggestions.length === 0` is CONTENT in this popup, not a mount guard —
    // it renders the `emptyHint` row. So "open, nothing to suggest" has to stay
    // an open state, and closing it has to go through the exit rather than
    // short-circuit the whole way. Folding it into the open state (the other
    // tempting half-fix) fails here: the popup would never mount.
    typeaheadHasNoMatches.value = true;
    try {
      const { rerender, props } = renderOverlay(true, {
        suggestions: POPUP_SUGGESTIONS,
        inputValue: 'zzzz',
      });

      const node = listbox();
      expect(node).not.toBeNull();
      expect(screen.getByText('NO MATCHES')).toBeInTheDocument();
      expect(screen.queryAllByRole('option')).toHaveLength(0);
      expect(lastTypeaheadProps().open).toBe(true);

      act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));
      expect(lastTypeaheadProps().open).toBe(false);
      expect(listbox()).toBe(node);

      act(() => {
        (popupExitTimeline()!.params!.onComplete as () => void)();
      });
      expect(listbox()).toBeNull();
    } finally {
      typeaheadHasNoMatches.value = false;
    }
  });

  it('an overlay with no suggestion source mounts no popup machinery at all', () => {
    // The mount gate survives — it just stops being a per-keystroke gate.
    // "This site has suggestions to offer" is a property of the prop, and an
    // overlay with none renders no wrapper, no popup and no empty hint.
    const empty = renderOverlay(true, { suggestions: [], inputValue: 'pro' });
    expect(listbox()).toBeNull();
    expect(typeaheadProps).toHaveLength(0);
    empty.unmount();

    const missing = renderOverlay(true, { suggestions: undefined });
    expect(listbox()).toBeNull();
    expect(typeaheadProps).toHaveLength(0);
    missing.unmount();
  });

  it('the row keeps its chrome and its place in the composer', () => {
    // Layout non-regression. The chrome moved from the wrapper onto the popup so
    // the wrapper could outlive it, and the open layout has to be the same box
    // it was: same full-bleed divider, same padding, same parent, and nothing
    // promoted to a positioned overlay.
    const { rerender, props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });
    const node = listbox()!;
    const wrapper = node.parentElement!;

    // Still a plain static block inside the composer panel — the panel's own
    // extra wrapper div is the mock's simplification, containment is the point.
    expect(screen.getByTestId('hud-panel').contains(wrapper)).toBe(true);
    expect(wrapper.tagName).toBe('DIV');
    for (const position of ['absolute', 'fixed', 'sticky', 'relative']) {
      expect(wrapper.className).not.toContain(position);
      expect(node.className).not.toContain(position);
    }

    // The popup's own classes are untouched and it has gained exactly the row's
    // chrome — nothing else.
    expect(node.className).toBe(
      'font-body text-sm px-4 py-2 border-t border-[var(--border-subtle)]',
    );
    for (const token of ['px-4', 'py-2', 'border-t']) {
      expect(node.classList.contains(token)).toBe(true);
    }
    // The options inside it keep their own padding, so the inset is unchanged.
    expect(screen.getByText('Show me your projects').className).toBe(
      'truncate',
    );
    expect(
      (screen.getByText('Show me your projects').parentElement as HTMLElement)
        .className,
    ).toContain('px-3 py-2');

    // And it does not move when the popup does: closing leaves the wrapper in
    // the same spot in the DOM.
    act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));
    expect(wrapper.isConnected).toBe(true);
    expect(wrapper.parentElement).toBe(screen.getByTestId('hud-panel'));
  });

  it('Escape closes the overlay from the keydown listener and does not touch the popup', () => {
    const { props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });
    const node = listbox();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.onClose).toHaveBeenCalledTimes(1);
    // Escape dismisses the SHEET, not the typeahead, so the popup keeps its
    // `open` and leaves with the panel it lives in.
    expect(lastTypeaheadProps().open).toBe(true);
    expect(listbox()).toBe(node);
  });

  it('Escape still closes while the popup is mid-exit', () => {
    // The popup outliving its own close adds a live node and a pending deadline
    // timer to the subtree; the listener is on `window`, so nothing about it
    // should care — but "nothing should care" is exactly the kind of claim that
    // stops being true the moment someone adds a second key handler.
    const { rerender, props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });
    act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));
    expect(listbox()).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop closes the overlay', () => {
    const { props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });

    fireEvent.click(backdrop()!);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('picking an option still routes through onSuggestionClick', () => {
    const onSuggestionClick = vi.fn();
    renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
      onSuggestionClick,
    });

    fireEvent.mouseDown(screen.getByText('What are your skills?'));

    expect(onSuggestionClick).toHaveBeenCalledTimes(1);
    expect(onSuggestionClick).toHaveBeenCalledWith('What are your skills?');
  });

  it('loading disables the composer and does not become a popup state', () => {
    const { rerender, props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
      isLoading: true,
    });
    const node = listbox();

    // The composer reads as busy…
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByText('PROCESSING:')).toBeInTheDocument();

    // …and the popup is untouched by it: `isLoading` is not an open/closed
    // signal, and it does not get to own the popup's teardown either.
    expect(lastTypeaheadProps().open).toBe(true);
    act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));
    expect(lastTypeaheadProps().open).toBe(false);
    expect(listbox()).toBe(node);

    act(() => {
      (popupExitTimeline()!.params!.onComplete as () => void)();
    });
    expect(listbox()).toBeNull();
  });

  it('a stale popup exit completion after re-opening does not unmount the popup', () => {
    const { rerender, props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });
    const node = listbox();

    act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));
    const stale = popupExitTimeline()!;
    act(() =>
      rerender(<MessageOverlay {...(props as any)} inputValue="pro" />),
    );
    expect(listbox()).toBe(node);

    // The completion the visitor already cancelled must be inert — identity, not
    // presence, because an unmount-then-remount leaves something in the DOM.
    act(() => {
      (stale.params!.onComplete as () => void)();
    });
    expect(listbox()).toBe(node);
  });

  it('reduced motion: clearing the input closes the popup with no exit animation', () => {
    mockMatchMedia(true);
    const { rerender, props } = renderOverlay(true, {
      suggestions: POPUP_SUGGESTIONS,
      inputValue: 'pro',
    });
    const node = listbox();
    expect(node).not.toBeNull();
    const before = popupExitTimelines().length;

    act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));

    // Same contract as the popup's own suite: told to close, no timeline built,
    // gone on this tick rather than after 80ms of nothing.
    expect(lastTypeaheadProps().open).toBe(false);
    expect(popupExitTimelines()).toHaveLength(before);
    expect(listbox()).toBeNull();
  });

  it('closing the popup logs no React key, unmount or act warning', () => {
    // The popup's children change shape while it stays mounted: keyed `<li>`
    // options become the single unkeyed `emptyHint` row and back. That swap is
    // the thing most likely to produce a duplicate-key or removeChild warning,
    // and neither the DOM nor the props recorder can see one.
    const errors: string[] = [];
    const spy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) => {
        errors.push(args.map((a) => String(a)).join(' '));
      });
    try {
      const { rerender, props, unmount } = renderOverlay(true, {
        suggestions: POPUP_SUGGESTIONS,
        inputValue: 'pro',
      });
      const node = listbox();

      act(() =>
        rerender(<MessageOverlay {...(props as any)} inputValue="skills" />),
      );
      typeaheadHasNoMatches.value = true;
      act(() =>
        rerender(<MessageOverlay {...(props as any)} inputValue="zzz" />),
      );
      expect(listbox()).toBe(node);
      expect(screen.getByText('NO MATCHES')).toBeInTheDocument();

      typeaheadHasNoMatches.value = false;
      act(() => rerender(<MessageOverlay {...(props as any)} inputValue="" />));
      expect(listbox()).toBe(node);

      act(() => {
        (popupExitTimeline()!.params!.onComplete as () => void)();
      });
      expect(listbox()).toBeNull();
      unmount();
    } finally {
      spy.mockRestore();
    }

    expect(errors).toEqual([]);
  });
});
