// src/components/ui/__tests__/RouteTransition.test.tsx
// The site-wide navigation primitive. These tests treat the component as what
// it really is: a state machine driven by `router.events` that builds and
// tears down anime.js timelines. anime.js itself is stubbed so no timer ever
// actually runs — the stub keeps a log, which is how "exit happens before
// enter" becomes an assertion instead of a hope.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

interface Added {
  target: string;
  params: Record<string, unknown>;
  position?: number;
}

interface FakeTimeline {
  label: string;
  added: Added[];
  delay: number;
  completed: boolean;
  reverted: boolean;
  onComplete?: () => void;
  add(
    target: HTMLElement,
    params: Record<string, unknown>,
    position?: number,
  ): FakeTimeline;
  complete(): void;
  revert(): void;
}

const h = vi.hoisted(() => ({
  log: [] as string[],
  timelines: [] as any[],
  scopes: [] as any[],
  revert: vi.fn(),
  createScope: vi.fn(),
  createTimeline: vi.fn(),
  animate: vi.fn(),
  stagger: vi.fn((s: number) => s),
}));

vi.mock('animejs', () => {
  const makeTimeline = (params: any, label: string): any => {
    const tl: FakeTimeline = {
      label,
      added: [],
      delay: params?.delay ?? 0,
      completed: false,
      reverted: false,
      onComplete: params?.onComplete,
      add(target, tParams, position) {
        h.log.push(`${label}.add:${target}`);
        tl.added.push({
          target: target?.className?.split(' ')[0] ?? String(target),
          params: tParams,
          position,
        });
        return tl;
      },
      complete() {
        h.log.push(`${label}.complete`);
        tl.completed = true;
      },
      revert() {
        h.log.push(`${label}.revert`);
        tl.reverted = true;
      },
    };
    h.timelines.push(tl);
    h.log.push(`build:${label}`);
    return tl;
  };

  const makeScope = () => {
    const scope: any = {
      registered: [] as any[],
      execute(cb: (s: any) => any) {
        h.log.push('scope.execute');
        const value = cb(scope);
        // Mirrors anime.js: anything animated inside `execute` is registered
        // so that `scope.revert()` tears it down.
        scope.registered.push(value);
        return value;
      },
      revert() {
        h.log.push('scope.revert');
        h.revert();
        scope.registered.forEach((t: any) => t?.revert?.());
      },
    };
    h.scopes.push(scope);
    return scope;
  };

  return {
    createScope: (...args: any[]) => {
      h.log.push('createScope');
      h.createScope(...args);
      return makeScope();
    },
    createTimeline: (...args: any[]) =>
      makeTimeline(args[0], `tl${h.timelines.length + 1}`),
    animate: h.animate,
    stagger: h.stagger,
    utils: { $: () => [] },
  };
});

import RouteTransition from '../RouteTransition';
import { durations } from '../../../config/animations';

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/* ── harness ─────────────────────────────────────────────────────────────── */

function mockMatchMedia(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === REDUCE_MOTION_QUERY ? reduce : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function makeRouter(pathname = '/') {
  type Handler = (...args: unknown[]) => void;
  const handlers: Record<string, Handler[]> = {};
  const router: any = {
    pathname,
    asPath: pathname,
    query: {},
    events: {
      on: vi.fn((event: string, fn: Handler) => {
        (handlers[event] ||= []).push(fn);
      }),
      off: vi.fn((event: string, fn: Handler) => {
        handlers[event] = (handlers[event] || []).filter((f) => f !== fn);
      }),
    },
  };
  return {
    router,
    emit: (event: string, ...args: unknown[]) =>
      act(() => {
        (handlers[event] || []).forEach((fn) => fn(...args));
      }),
    handlerCount: (event: string) => (handlers[event] || []).length,
  };
}

function renderAt(
  options: {
    pathname?: string;
    enabled?: boolean;
    historyKey?: string;
  } = {},
) {
  if (options.historyKey) {
    window.history.replaceState(
      { key: options.historyKey },
      '',
      options.pathname,
    );
  }
  const h2 = makeRouter(options.pathname ?? '/');
  const view = render(
    <RouteTransition router={h2.router} enabled={options.enabled ?? true}>
      <div data-testid="page">page body</div>
    </RouteTransition>,
  );
  return { ...h2, view };
}

/** The tween aimed at one layer, e.g. `tweenOf(tl, 'rt-field').params`. */
const tweenOf = (tl: FakeTimeline, target: string) =>
  tl.added.find((a) => a.target === target);

const paramsOf = (tl: FakeTimeline, target: string) =>
  tweenOf(tl, target)?.params ?? {};

const viewport = () => window.innerWidth;

beforeEach(() => {
  h.log.length = 0;
  h.timelines.length = 0;
  h.scopes.length = 0;
  h.revert.mockClear();
  h.createScope.mockClear();
  h.createTimeline.mockClear();
  h.animate.mockClear();
  mockMatchMedia(false);
  window.history.replaceState({ key: 'k1' }, '', '/');
});

afterEach(() => {
  // @ts-expect-error -- restoring the harness's real (absent) state
  delete window.matchMedia;
});

/* ── exit then enter, in order ───────────────────────────────────────────── */

describe('RouteTransition — one navigation, cover then reveal', () => {
  it('registers exactly one scope, over the occluder, watching reduced motion', () => {
    renderAt();

    expect(h.createScope).toHaveBeenCalledTimes(1);
    const params = h.createScope.mock.calls[0][0];
    expect(params.root).toBeInstanceOf(HTMLElement);
    expect(params.root.className).toContain('rt-root');
    expect(params.mediaQueries.reduceMotion).toBe(REDUCE_MOTION_QUERY);
    expect(params.defaults.ease).toBeDefined();
  });

  it('plays the exit on routeChangeStart and the enter on routeChangeComplete, in that order', () => {
    const { emit } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });

    expect(h.timelines).toHaveLength(1);
    const [cover] = h.timelines;
    expect(paramsOf(cover, 'rt-field').scaleX).toEqual([0, 1]);
    expect(paramsOf(cover, 'rt-field').opacity).toEqual([0, 1]);
    // The leaving view leaves towards the right: 0 → +shift.
    const exitX = paramsOf(cover, 'rt-stage').x as number[];
    expect(exitX[0]).toBe(0);
    expect(exitX[1]).toBeGreaterThan(0);
    expect(paramsOf(cover, 'rt-stage').opacity).toEqual([1, 0]);

    // Still covered: the sweep does not finish itself.
    expect(cover.completed).toBe(false);
    expect(paramsOf(cover, 'rt-field').opacity).toEqual([0, 1]);

    emit('routeChangeComplete', '/blog', {});

    expect(h.timelines).toHaveLength(2);
    const [, lift] = h.timelines;

    // The swap happened behind a *closed* occluder, not a half-drawn one.
    expect(cover.completed).toBe(true);

    // The arriving view slides in from the left: -shift → 0.
    const enterX = paramsOf(lift, 'rt-stage').x as number[];
    expect(enterX[0]).toBe(-(exitX[1] as number));
    expect(enterX[1]).toBe(0);
    expect(paramsOf(lift, 'rt-stage').opacity).toEqual([0, 1]);

    // Same vector on the occluder: the reveal continues rightwards.
    expect(paramsOf(lift, 'rt-field').x).toEqual([0, viewport()]);
    expect(paramsOf(lift, 'rt-field').opacity).toEqual([1, 0]);

    const order = h.log.filter((l) => l.startsWith('build:'));
    expect(order).toEqual(['build:tl1', 'build:tl2']);
    expect(h.log.indexOf('build:tl1')).toBeLessThan(h.log.indexOf('build:tl2'));
  });

  it('keeps the whole navigation inside the token budget', () => {
    const { emit } = renderAt();
    emit('routeChangeStart', '/blog', { shallow: false });
    emit('routeChangeComplete', '/blog', {});

    const [cover, lift] = h.timelines as FakeTimeline[];
    const longest = (tl: FakeTimeline) =>
      Math.max(...tl.added.map((a: Added) => a.params.duration as number));

    [cover, lift].forEach((tl) =>
      tl.added.forEach((a: Added) => {
        const ms = a.params.duration as number;
        expect(ms).toBeGreaterThan(0);
        // Every beat is a fraction of the one token that owns the budget.
        expect(ms).toBeLessThanOrEqual(durations.transition * 1000);
      }),
    );

    // Cover + hold + reveal, end to end, with nothing overlapping the cover.
    const total = longest(cover) + (lift.delay as number) + longest(lift);
    expect(total).toBeGreaterThan(400);
    expect(total).toBeLessThan(700);
  });

  it('drives the sweep line in pixels so it stays a crisp 2px rule', () => {
    const { emit } = renderAt();
    emit('routeChangeStart', '/blog', { shallow: false });

    const edge = paramsOf(h.timelines[0], 'rt-edge');
    // A rule inside the scaled occluder would be scaled too, so the edge is a
    // sibling driven by viewport pixels: 0 → innerWidth.
    expect(edge.x).toEqual([0, viewport()]);
  });
});

/* ── reduced motion ──────────────────────────────────────────────────────── */

describe('RouteTransition — reduced motion', () => {
  it('builds no timeline at all, and still delivers the page', () => {
    mockMatchMedia(true);
    const { emit, view } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });
    emit('routeChangeComplete', '/blog', {});

    expect(h.createTimeline).not.toHaveBeenCalled();
    expect(h.log.filter((l) => l.startsWith('build:'))).toHaveLength(0);
    expect(h.scopes[0].registered).toHaveLength(0);

    expect(view.getByTestId('page')).toBeInTheDocument();
    // Nothing is left covering it: the occluder is at its authored rest state,
    // not stuck at the end of an animation that never ran.
    const field = view.container.querySelector('.rt-field') as HTMLElement;
    expect(field).toBeInTheDocument();
    expect(field.style.opacity).toBe('');
    expect(field.style.transform).toBe('');
  });

  it('authors its rest state in markup, so reduced motion costs nothing to undo', () => {
    mockMatchMedia(true);
    const { emit, view } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });

    // This is the reason the guards above can be plain early returns. If the
    // rest state were the *end* of an animation, every early return would
    // need to hand-restore it, and any miss would leave the reader behind a
    // closed sheet.
    ['.rt-field', '.rt-scan', '.rt-edge'].forEach((sel) => {
      const el = view.container.querySelector(sel) as HTMLElement;
      expect(el.className).toContain('opacity-0');
      expect(el.style.opacity).toBe('');
    });
    // And the stage carries no transform until something moves it.
    const stage = view.container.querySelector('.rt-stage') as HTMLElement;
    expect(stage.style.transform).toBe('');
    expect(stage.style.opacity).toBe('');
  });
});

/* ── direction ───────────────────────────────────────────────────────────── */

describe('RouteTransition — direction', () => {
  it('sweeps right for a forward navigation', () => {
    // history.state.key is still the one from mount: a push has not written
    // its key yet when routeChangeStart fires.
    const { emit } = renderAt({ historyKey: 'k1' });

    emit('routeChangeStart', '/blog', { shallow: false });
    const cover = h.timelines[0];
    expect(paramsOf(cover, 'rt-field').x).toEqual([0, 0]);
    expect((paramsOf(cover, 'rt-stage').x as number[])[1]).toBeGreaterThan(0);

    emit('routeChangeComplete', '/blog', {});
    expect(paramsOf(h.timelines[1], 'rt-field').x).toEqual([0, viewport()]);
  });

  it('mirrors every layer on a back navigation', () => {
    const { emit } = renderAt({ historyKey: 'k1' });
    // Simulate a push that already landed: a fresh key, different from the
    // one captured at mount. That difference is the pop signal.
    window.history.replaceState({ key: 'k2' }, '', '/blog');

    emit('routeChangeStart', '/', { shallow: false });
    const cover = h.timelines[0];
    expect(paramsOf(cover, 'rt-field').x).toEqual([viewport(), 0]);
    expect(paramsOf(cover, 'rt-edge').x).toEqual([viewport(), 0]);
    expect((paramsOf(cover, 'rt-stage').x as number[])[1]).toBeLessThan(0);

    emit('routeChangeComplete', '/', {});
    const lift = h.timelines[1];
    expect(paramsOf(lift, 'rt-field').x).toEqual([0, 0]);
    // Mirrored: the arriving view now comes from the right.
    const coverShift = (paramsOf(cover, 'rt-stage').x as number[])[1];
    expect(paramsOf(lift, 'rt-stage').x).toEqual([-coverShift, 0]);
  });
});

describe('RouteTransition — gates', () => {
  it('ignores navigation while disabled, so the boot splash owns the first paint', () => {
    const { emit } = renderAt({ enabled: false });

    emit('routeChangeStart', '/blog', { shallow: false });
    emit('routeChangeComplete', '/blog', {});

    expect(h.createTimeline).not.toHaveBeenCalled();
  });

  it('ignores a shallow route: no tree is thrown away, so there is nothing to occlude', () => {
    const { emit } = renderAt();

    emit('routeChangeStart', '/', { shallow: true });
    emit('routeChangeComplete', '/', {});

    expect(h.createTimeline).not.toHaveBeenCalled();
  });

  it('abandons the sweep when a navigation fails, leaving nothing over the page', () => {
    const { emit, view } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });
    emit('routeChangeError', new Error('boom'), '/blog', {});

    expect(h.timelines[0].reverted).toBe(true);
    const field = view.container.querySelector('.rt-field') as HTMLElement;
    expect(field.style.transform).toBe('');
    const stage = view.container.querySelector('.rt-stage') as HTMLElement;
    expect(stage.style.transform).toBe('');
  });

  it('restarts cleanly when a second navigation interrupts the first', () => {
    const { emit } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });
    emit('routeChangeStart', '/sudosuperuser-ostaad', { shallow: false });

    expect(h.timelines[0].reverted).toBe(true);
    expect(h.timelines).toHaveLength(2);
    // Every beat of the retry starts from the authored rest state.
    expect(paramsOf(h.timelines[1], 'rt-field').opacity).toEqual([0, 1]);
  });
});

/* ── teardown ────────────────────────────────────────────────────────────── */

describe('RouteTransition — teardown', () => {
  it('reverts the scope and every timeline it registered when unmounted mid-cover', () => {
    const { emit, view } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });
    expect(h.timelines).toHaveLength(1);

    view.unmount();

    expect(h.revert).toHaveBeenCalledTimes(1);
    expect(h.timelines.every((t: FakeTimeline) => t.reverted)).toBe(true);
    expect(h.log.indexOf('scope.revert')).toBeGreaterThan(-1);
  });

  it('reverts the reveal timeline too, not just the scope', () => {
    const { emit, view } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });
    emit('routeChangeComplete', '/blog', {});
    const lift = h.timelines[1];
    expect(lift).toBeDefined();

    view.unmount();

    expect(h.revert).toHaveBeenCalledTimes(1);
    expect(h.timelines).toHaveLength(2);
    expect(h.timelines.every((t: FakeTimeline) => t.reverted)).toBe(true);
  });

  it('unsubscribes all three router events with the handlers it registered', () => {
    const { router, view, handlerCount } = renderAt();

    expect(router.events.on).toHaveBeenCalledTimes(3);
    (
      ['routeChangeStart', 'routeChangeComplete', 'routeChangeError'] as const
    ).forEach((e) => expect(handlerCount(e)).toBe(1));

    view.unmount();

    expect(router.events.off).toHaveBeenCalledTimes(3);
    (
      ['routeChangeStart', 'routeChangeComplete', 'routeChangeError'] as const
    ).forEach((e) => expect(handlerCount(e)).toBe(0));
  });

  it('unsubscribes but leaves the scope alone on a router identity change', () => {
    const { router, view } = renderAt();

    const second = makeRouter('/blog');
    view.rerender(
      <RouteTransition router={second.router} enabled>
        <div data-testid="page">page body</div>
      </RouteTransition>,
    );

    expect(router.events.off).toHaveBeenCalledTimes(3);
    expect(second.handlerCount('routeChangeStart')).toBe(1);
    // The scope is not tied to the router, so a re-subscription must not
    // throw away — or double-create — the scope.
    expect(h.createScope).toHaveBeenCalledTimes(1);
    expect(h.revert).not.toHaveBeenCalled();
  });

  it('parks the sheet after the reveal finishes, leaving no transform behind', () => {
    const { emit, view } = renderAt();

    emit('routeChangeStart', '/blog', { shallow: false });
    emit('routeChangeComplete', '/blog', {});
    const lift = h.timelines[1];

    act(() => {
      lift.onComplete?.();
    });

    // A leftover transform on the stage would keep it the containing block
    // for every `position: fixed` descendant on the page.
    const stage = view.container.querySelector('.rt-stage') as HTMLElement;
    expect(stage.style.transform).toBe('');
    expect(stage.style.opacity).toBe('');
    const field = view.container.querySelector('.rt-field') as HTMLElement;
    expect(field.style.transform).toBe('');
  });
});
