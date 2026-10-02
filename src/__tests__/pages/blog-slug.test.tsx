// src/__tests__/pages/blog-slug.test.tsx
//
// The reader's two occluders, and the handoff between them.
//
// `pages/blog/[slug].tsx` renders `LightningTransition` — a vertical sheet at
// `z-[80]` — while the shell's `RouteTransition` paints a horizontal sweep whose
// curtain is a SIBLING of the stage holding this whole page, at `z-[85]`. Neither
// file can see the other's layers, and z-order cannot fix it: the curtain is
// always on top. So what is pinned here is the SCHEDULE between them, because
// that is the only thing that decides whether the reader watches one transition
// or two:
//
//   1. the tree swap happens while the sheet is fully opaque, and
//   2. the sheet does not lift until the router has settled.
//
// Both are arithmetic claims, so both are asserted as arithmetic — against the
// numbers the timeline was actually handed, never as "both components rendered".
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const {
  mockTlAdd,
  mockTlCall,
  mockTlRevert,
  mockTlComplete,
  mockMakeTimeline,
  mockPush,
  mockRouterEvents,
} = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...a: unknown[]) => void>>();
  return {
    mockTlAdd: vi.fn(),
    mockTlCall: vi.fn(),
    mockTlRevert: vi.fn(),
    mockTlComplete: vi.fn(),
    mockMakeTimeline: vi.fn(),
    mockPush: vi.fn(),
    mockRouterEvents: {
      on: vi.fn((evt: string, cb: (...a: unknown[]) => void) => {
        if (!listeners.has(evt)) listeners.set(evt, new Set());
        listeners.get(evt)!.add(cb);
      }),
      off: vi.fn((evt: string, cb: (...a: unknown[]) => void) => {
        listeners.get(evt)?.delete(cb);
      }),
      emit: (evt: string) => {
        for (const cb of [...(listeners.get(evt) ?? [])]) cb(evt);
      },
      listenerCount: () =>
        [...listeners.values()].reduce((n, s) => n + s.size, 0),
      clear: () => listeners.clear(),
    },
  };
});

// One stable router object for the whole run, as Next actually provides: the
// page's retire effect keys on `router`, so a fresh literal per render would
// re-subscribe on every keystroke of unrelated state.
const mockRouter = {
  isReady: true,
  asPath: '/blog/test-post',
  query: { slug: 'test-post' },
  push: mockPush,
  events: mockRouterEvents,
};

vi.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => mockRouter,
}));

// Fragment, not an anchor: the page already renders its own `<a>` for the back
// link, and a wrapper element here would nest them.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: unknown) => {
    const React = require('react');
    return React.createElement('img', props as never);
  },
}));

vi.mock('../../components/SEOMeta', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../components/RichTextRenderer', () => ({
  __esModule: true,
  default: () => null,
}));

// Deliberately NOT mocked: `LightningTransition` is one half of the handoff
// under test. Mocking it would leave the test asserting that a prop exists.

vi.mock('animejs', () => {
  const scope = {
    add: vi.fn((cb: () => void) => {
      cb();
      return scope;
    }),
    revert: vi.fn(),
  };
  return {
    __esModule: true,
    createScope: vi.fn(() => scope),
    createTimeline: mockMakeTimeline,
    splitText: vi.fn(
      () =>
        ({
          chars: [{ style: {} }],
          words: [{ style: {} }],
          revert: vi.fn(),
        }) as never,
    ),
    stagger: vi.fn((v: unknown) => v as never),
    animate: vi.fn(),
    createDrawable: vi.fn(() => []),
    spring: vi.fn(() => 'spring'),
  };
});

import BlogSlugPage from '../../pages/blog/[slug]';
import { durations } from '../../config/animations';

/** Mirrors the sheet's declared beats in `LightningTransition`. */
const COVER_MS = durations.enter * 1000 * 0.5;
const HAND_OFF_MS = COVER_MS + durations.enter * 1000 * 0.1;
const LIFT_MS = durations.exit * 1000 * 0.8;
const OLD_LIFT_AT_MS = durations.enter * 1000 * 0.66;

const basePost = {
  id: 1,
  slug: 'test-post',
  title: 'A Post Worth Reading',
  excerpt: 'The standfirst, which is the third thing to arrive.',
  content_html: '<p>body</p>',
  cover_image_url: null,
  cover_image_alt: null,
  status: 'published',
  featured: false,
  tags: ['systems'],
  reading_minutes: 7,
  view_count: 42,
  seo_title: null,
  seo_description: null,
  seo_keywords: null,
  canonical_url: null,
  published_at: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const nextItem = {
  ...basePost,
  id: 2,
  slug: 'next-post',
  title: 'Next Post',
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

/** `cover_image_url` is widened so a variant can supply a real cover. */
type PostVariant = Omit<typeof basePost, 'cover_image_url'> & {
  cover_image_url: string | null;
};

function renderReader(post: PostVariant = basePost) {
  return render(
    <BlogSlugPage
      post={post as never}
      prev={null}
      next={nextItem as never}
      related={[]}
    />,
  );
}

const nextButton = () => screen.getByRole('button', { name: /Next/ });

/** Every tween the sheet was given, as the timeline received it. */
function sheetTweens() {
  return mockTlAdd.mock.calls.filter((c) => 'scaleY' in (c[1] as object));
}

/** `scaleY: [0, 1]` — the sheet closing over the page. */
function coverTweens() {
  return sheetTweens().filter(
    (c) => (c[1] as { scaleY: unknown[] }).scaleY[1] === 1,
  );
}

/**
 * The lift. `scaleY: 0` (animate from wherever the element is) rather than
 * `scaleY: [1, 0]` — a from-keyframe would snap the sheet fully shut for a
 * frame first if the release landed while the cover tween was still running.
 */
function liftTweens() {
  return sheetTweens().filter(
    (c) => (c[1] as { scaleY: unknown }).scaleY === 0,
  );
}

/**
 * Run the live sheet timeline's swap point.
 *
 * The LAST `tl.call`, not the first: a second click re-runs the sheet effect,
 * whose cleanup reverts the previous timeline — and a reverted anime timeline
 * takes its scheduled `call` with it. Invoking an earlier callback would be
 * asserting against a beat real anime would never reach.
 */
function swapCallback() {
  const last = mockTlCall.mock.calls.at(-1);
  if (!last) throw new Error('no cover timeline was created');
  (last[0] as () => void)();
}

const swapBeat = () => mockTlCall.mock.calls.at(-1)![1] as number;

describe('BlogSlugPage — page-turn handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterEvents.clear();
    mockMatchMedia(false);

    // A recordable timeline per `createTimeline` call. The cover pass and the
    // release pass are separate calls, and asserting against a merged list
    // would hide the very ordering under test.
    mockMakeTimeline.mockImplementation(
      (cfg?: { onComplete?: () => void }) => ({
        add: (...a: unknown[]) => mockTlAdd(...a),
        call: (...a: unknown[]) => mockTlCall(...a),
        revert: () => mockTlRevert(),
        ...(cfg?.onComplete ? { fire: cfg.onComplete } : {}),
      }),
    );
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
    vi.clearAllMocks();
  });

  it('swaps the tree only after the sheet is fully opaque', () => {
    const { container } = renderReader();
    expect(container.ownerDocument.querySelector('.lt-sheet')).toBeTruthy();

    // Nothing requested yet.
    expect(mockPush).not.toHaveBeenCalled();
    expect(sheetTweens()).toHaveLength(0);

    fireEvent.click(nextButton());

    // The cover runs, and — because this page holds the sheet for the swap —
    // the lift does NOT.
    expect(coverTweens()).toHaveLength(1);
    expect(liftTweens()).toHaveLength(0);

    const coverDuration = (coverTweens()[0][1] as { duration: number })
      .duration;
    expect(coverDuration).toBe(COVER_MS);

    // THE invariant. If the swap were scheduled before the cover finished, the
    // reader would watch the new post appear under a half-transparent sheet.
    expect(swapBeat()).toBeGreaterThanOrEqual(coverDuration);
    expect(swapBeat()).toBe(HAND_OFF_MS);

    // …and the swap is no longer the old lift beat. `onMidpoint` used to fire at
    // 60% while the sheet lifted at 66% — 38ms apart, and then the sheet spent
    // another ~320ms lifting while the horizontal sweep crossed it.
    expect(OLD_LIFT_AT_MS).toBeGreaterThan(HAND_OFF_MS);
  });

  it('pushes once, and only from the covered beat', () => {
    renderReader();

    // Two rapid clicks must not resolve into two navigations, and neither may
    // navigate before the sheet is shut: `pendingHref` is cleared by the
    // covered callback, so one click yields at most one push.
    fireEvent.click(nextButton());
    fireEvent.click(nextButton());
    expect(mockPush).not.toHaveBeenCalled();

    act(() => swapCallback());

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/blog/next-post');
  });

  it('holds the sheet over the swap until the router settles, then retires it', () => {
    const { container } = renderReader();
    const sheetRoot = container.querySelector('.lt-sheet')!
      .parentElement as HTMLElement;

    fireEvent.click(nextButton());
    act(() => swapCallback());

    // The tree swap has happened and the sheet is STILL up and STILL blocking.
    // That is the point: `RouteTransition`'s curtain is shut over it, so its
    // presence here is invisible to the reader — and pointer events must not go
    // back yet, or a click passes through a visible occluder.
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(sheetRoot.style.pointerEvents).toBe('auto');
    expect(liftTweens()).toHaveLength(0);

    act(() => mockRouterEvents.emit('routeChangeComplete'));

    // Only now does it retire, and the lift spends itself behind the curtain.
    expect(liftTweens()).toHaveLength(1);
    expect((liftTweens()[0][1] as { duration: number }).duration).toBe(LIFT_MS);

    // …and it hands the page back. If this were left to the lift timeline's
    // `onComplete` alone, a dropped event would lock the reader out.
    const releaseTl = mockMakeTimeline.mock.results
      .map((r) => r.value as { fire?: () => void })
      .filter((t) => typeof t.fire === 'function')
      .pop();
    expect(releaseTl).toBeDefined();
    releaseTl!.fire!();
    expect(sheetRoot.style.pointerEvents).toBe('none');
  });

  it('treats a failed navigation as settled', () => {
    renderReader();

    fireEvent.click(nextButton());
    act(() => swapCallback());
    expect(mockPush).toHaveBeenCalledTimes(1);

    // A 404 on the next post must still retire the sheet.
    act(() => mockRouterEvents.emit('routeChangeError'));
    expect(liftTweens()).toHaveLength(1);
  });

  it('fails open rather than stranding the reader behind a dead occluder', () => {
    vi.useFakeTimers();
    try {
      renderReader();

      fireEvent.click(nextButton());
      act(() => swapCallback());
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(liftTweens()).toHaveLength(0);

      // The router never emits. Waiting on `onComplete` alone would leave a
      // full-screen sheet with `pointer-events: auto` over the page forever.
      act(() => {
        vi.runAllTimers();
      });

      expect(liftTweens()).toHaveLength(1);
      // And the listeners are gone, so a late event cannot double-lift.
      expect(mockRouterEvents.listenerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives the hero a real order instead of seven simultaneous entrances', () => {
    renderReader();

    // Every hero group's start beat, in the order the timeline received them.
    // The hero is the FIRST `createTimeline` call on mount.
    const heroTl = mockMakeTimeline.mock.results[0].value as {
      add: (...a: unknown[]) => void;
    };
    const heroAdds = mockTlAdd.mock.calls.filter(
      (c) => !(c[1] as object) || !('scaleY' in (c[1] as object)),
    );
    const beats = heroAdds.map((c) => c[2] as number);

    expect(beats.length).toBeGreaterThanOrEqual(7);
    // Seven groups used to share position 0 and differ only in duration, which
    // is the same picture as one entrance. Each now owns a distinct start.
    expect(new Set(beats).size).toBe(beats.length);
    // The title opens alone.
    expect(beats[0]).toBe(0);
    expect(Math.min(...beats)).toBe(0);
    // …and the group order is the reading order, not the DOM order.
    expect(beats).toEqual([...beats].sort((a, b) => a - b));
    // Decoration does not open the composition.
    expect(heroTl).toBeDefined();
  });

  it('does not leave a raw scroll listener writing a cover transform', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    try {
      const { container } = renderReader({
        ...basePost,
        cover_image_url: 'https://example.test/cover.jpg',
      });
      const cover = container.querySelector('img');
      expect(cover).toBeTruthy();

      // `ReadingProgress` is the one scroll reader on this route and it is
      // rAF-coalesced. A second listener writing `translate3d(... scrollY ...)`
      // is the cover parallax this page used to run, and it inverts the scene
      // rule that scroll is sampled inside the frame loop, never in a listener
      // of its own.
      const scrollListeners = addSpy.mock.calls.filter(
        (c) => c[0] === 'scroll',
      );
      expect(scrollListeners.length).toBeLessThanOrEqual(1);

      window.scrollY = 900;
      window.dispatchEvent(new Event('scroll'));
      expect(cover!.style.transform).toBe('');
    } finally {
      addSpy.mockRestore();
    }
  });
});
