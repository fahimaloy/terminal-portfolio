// src/components/HUD/__tests__/ScrollIndicator.test.tsx
//
// The rail was pinned at 0% on the landing page: the listener was capture-phase
// (so it saw the inner scroller) but the measurement still read
// `document.scrollingElement`, whose scrollHeight equals the viewport on a
// `h-[100dvh] overflow-hidden` page. These tests pin the measurement, not the
// listener: the progress fill must move for an inner-div scroller AND for a
// window scroller, must not divide by zero, and must not force layout.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import React from 'react';
import ScrollIndicator from '../ScrollIndicator';

// ── rAF queue ────────────────────────────────────────────────────────────────
// Hand-rolled so a "frame" is an explicit, synchronous step: the component's
// coalescing means one rAF covers N scroll events, and the test needs to see
// the committed width after exactly that frame.
let pending = new Map<number, FrameRequestCallback>();
let seq = 0;

function flushFrame() {
  const queued = [...pending.values()];
  pending = new Map();
  act(() => {
    queued.forEach((cb) => cb(0));
  });
}

// ── layout instrumentation ───────────────────────────────────────────────────
const trap = { rect: 0, offsetTop: 0, offsetHeight: 0 };

function installLayoutTrap() {
  const proto = Element.prototype;
  const originalRect = proto.getBoundingClientRect;
  const hProto = HTMLElement.prototype;
  const descriptors = [
    Object.getOwnPropertyDescriptor(hProto, 'offsetTop'),
    Object.getOwnPropertyDescriptor(hProto, 'offsetHeight'),
  ];

  proto.getBoundingClientRect = function (this: Element) {
    trap.rect++;
    return originalRect.call(this);
  };
  (['offsetTop', 'offsetHeight'] as const).forEach((key, i) => {
    const d = descriptors[i];
    Object.defineProperty(hProto, key, {
      configurable: true,
      get() {
        trap[key]++;
        return d?.get ? (d.get.call(this) as number) : 0;
      },
    });
  });

  return () => {
    proto.getBoundingClientRect = originalRect;
    (['offsetTop', 'offsetHeight'] as const).forEach((key, i) => {
      if (descriptors[i]) Object.defineProperty(hProto, key, descriptors[i]!);
      else delete (hProto as unknown as Record<string, unknown>)[key];
    });
  };
}

function resetTrap() {
  trap.rect = 0;
  trap.offsetTop = 0;
  trap.offsetHeight = 0;
}

// ── scroller stubbing ────────────────────────────────────────────────────────
// jsdom has no layout: scrollTop is inert and scrollHeight/clientHeight are 0.
// Each stub therefore installs own properties, which is also what lets a test
// assert on the numbers the component actually read.
const cleanups: Array<() => void> = [];

function stubScroller(
  el: Element,
  sizes: { scrollHeight: number; clientHeight: number; scrollTop: number },
) {
  let scrollTop = sizes.scrollTop;
  const defs: Array<[string, PropertyDescriptor]> = [
    ['scrollHeight', { configurable: true, get: () => sizes.scrollHeight }],
    ['clientHeight', { configurable: true, get: () => sizes.clientHeight }],
    [
      'scrollTop',
      {
        configurable: true,
        get: () => scrollTop,
        set: (v: number) => {
          scrollTop = v;
        },
      },
    ],
  ];
  defs.forEach(([key, d]) =>
    Object.defineProperty(el, key, d as PropertyDescriptor),
  );
  cleanups.push(() =>
    defs.forEach(([key]) => {
      delete (el as unknown as Record<string, unknown>)[key];
    }),
  );
  return { setScrollTop: (v: number) => (scrollTop = v) };
}

function fill(container: HTMLElement) {
  const el = container.querySelector<HTMLElement>('.scroll-rail__fill');
  if (!el) throw new Error('progress fill not rendered');
  return el;
}

beforeEach(() => {
  pending = new Map();
  seq = 0;
  resetTrap();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    pending.set(++seq, cb);
    return seq;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending.delete(id);
  });
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('ScrollIndicator progress measurement', () => {
  it('tracks an inner scrolling container, not the window', () => {
    const { container } = render(
      <div className="h-screen overflow-hidden">
        <div data-testid="scroller" className="overflow-y-auto">
          <ScrollIndicator />
        </div>
      </div>,
    );
    const scroller = container.querySelector<HTMLElement>(
      '[data-testid="scroller"]',
    )!;
    // 1000 tall, 400 visible → 600 of travel.
    const handle = stubScroller(scroller, {
      scrollHeight: 1000,
      clientHeight: 400,
      scrollTop: 0,
    });

    // First paint: nothing scrolled yet, so the rail starts empty.
    expect(fill(container).style.width).toBe('0%');

    handle.setScrollTop(300);
    act(() => {
      fireEvent.scroll(scroller);
    });
    flushFrame();
    expect(fill(container).style.width).toBe('50%');

    handle.setScrollTop(600);
    act(() => {
      fireEvent.scroll(scroller);
    });
    flushFrame();
    expect(fill(container).style.width).toBe('100%');

    // A regression guard on the other end: the window is NOT the scroller here
    // and must not be consulted for progress.
    handle.setScrollTop(0);
    act(() => {
      fireEvent.scroll(scroller);
    });
    flushFrame();
    expect(fill(container).style.width).toBe('0%');
  });

  it('coalesces a burst of scroll events into one measured frame', () => {
    const { container } = render(
      <div data-testid="scroller" className="overflow-y-auto">
        <ScrollIndicator />
      </div>,
    );
    const scroller = container.querySelector<HTMLElement>(
      '[data-testid="scroller"]',
    )!;
    const handle = stubScroller(scroller, {
      scrollHeight: 2000,
      clientHeight: 1000,
      scrollTop: 0,
    });

    handle.setScrollTop(250);
    act(() => {
      fireEvent.scroll(scroller);
      fireEvent.scroll(scroller);
      fireEvent.scroll(scroller);
    });
    // One rAF queued for three events.
    expect(pending.size).toBe(1);
    flushFrame();
    expect(fill(container).style.width).toBe('25%');
  });

  it('still measures the window when the window is the scroller', () => {
    const root = document.documentElement;
    stubScroller(root, {
      scrollHeight: 3000,
      clientHeight: 1000,
      scrollTop: 0,
    });

    const { container } = render(<ScrollIndicator />);
    expect(fill(container).style.width).toBe('0%');

    // A window scroll is dispatched at `document`; the listener must resolve
    // that to the documentElement scroller rather than to anything else.
    (document.documentElement as unknown as { scrollTop: number }).scrollTop =
      500;
    act(() => {
      fireEvent.scroll(document);
    });
    flushFrame();
    expect(fill(container).style.width).toBe('25%');

    (document.documentElement as unknown as { scrollTop: number }).scrollTop =
      1000;
    act(() => {
      fireEvent.scroll(document);
    });
    flushFrame();
    expect(fill(container).style.width).toBe('50%');
  });

  it.each([
    ['content shorter than the viewport', 300, 1000],
    ['content exactly the viewport height', 1000, 1000],
  ])(
    'reports 0%% instead of dividing by zero when the scroller has %s',
    (_label, scrollHeight, clientHeight) => {
      const { container } = render(
        <div data-testid="scroller" className="overflow-y-auto">
          <ScrollIndicator />
        </div>,
      );
      const scroller = container.querySelector<HTMLElement>(
        '[data-testid="scroller"]',
      )!;
      const handle = stubScroller(scroller, {
        scrollHeight,
        clientHeight,
        scrollTop: 0,
      });

      act(() => {
        fireEvent.scroll(scroller);
      });
      flushFrame();
      expect(fill(container).style.width).toBe('0%');

      // A stale scrollTop left over from before the content shrank must still
      // clamp to 0, not surface as a ratio over a zero/negative maximum.
      handle.setScrollTop(250);
      act(() => {
        fireEvent.scroll(scroller);
      });
      flushFrame();
      expect(fill(container).style.width).toBe('0%');
    },
  );

  it('does not flush layout (no rect/offset reads) while measuring a scroll step', () => {
    const restore = installLayoutTrap();
    try {
      const { container } = render(
        <div data-testid="scroller" className="overflow-y-auto">
          <ScrollIndicator />
        </div>,
      );
      const scroller = container.querySelector<HTMLElement>(
        '[data-testid="scroller"]',
      )!;
      const handle = stubScroller(scroller, {
        scrollHeight: 5000,
        clientHeight: 1000,
        scrollTop: 0,
      });

      handle.setScrollTop(1250);
      resetTrap();
      act(() => {
        fireEvent.scroll(scroller);
      });
      flushFrame();
      expect(fill(container).style.width).toBe('31.25%');

      expect(trap.rect).toBe(0);
      expect(trap.offsetTop).toBe(0);
      expect(trap.offsetHeight).toBe(0);
    } finally {
      restore();
    }
  });

  it('a resize keeps measuring the remembered inner scroller', () => {
    const { container } = render(
      <div data-testid="scroller" className="overflow-y-auto">
        <ScrollIndicator />
      </div>,
    );
    const scroller = container.querySelector<HTMLElement>(
      '[data-testid="scroller"]',
    )!;
    const handle = stubScroller(scroller, {
      scrollHeight: 1000,
      clientHeight: 400,
      scrollTop: 300,
    });

    act(() => {
      fireEvent.scroll(scroller);
    });
    flushFrame();
    expect(fill(container).style.width).toBe('50%');

    // No event target on resize, so the last scroller must be reused rather
    // than dropping back to the (non-scrolling) window.
    handle.setScrollTop(600);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    flushFrame();
    expect(fill(container).style.width).toBe('100%');
  });

  it('unmounts cleanly: a pending frame is cancelled and no listener survives', () => {
    const { container, unmount } = render(
      <div data-testid="scroller" className="overflow-y-auto">
        <ScrollIndicator />
      </div>,
    );
    const scroller = container.querySelector<HTMLElement>(
      '[data-testid="scroller"]',
    )!;
    stubScroller(scroller, {
      scrollHeight: 1000,
      clientHeight: 400,
      scrollTop: 300,
    });

    act(() => {
      fireEvent.scroll(scroller);
    });
    expect(pending.size).toBe(1);
    unmount();
    expect(pending.size).toBe(0);

    // No error when the scroller scrolls after unmount.
    act(() => {
      fireEvent.scroll(scroller);
    });
    expect(pending.size).toBe(0);
  });
});
