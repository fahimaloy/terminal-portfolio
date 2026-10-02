// src/components/ui/__tests__/Tilt3D.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Tilt3D from '../Tilt3D';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/ui/Tilt3D.tsx'),
  'utf8',
);

/* ── motion preference ────────────────────────────────────────────────────
   jsdom ships no `window.matchMedia`, and `canAnimate()` returns false without
   it — which IS the reduced-motion branch. Without this stub every "motion
   enabled" assertion below would pass by never animating at all, which is the
   failure mode this stub exists to prevent. `vitest.setup.ts` does not provide
   one; the repo convention is a per-file helper.
   ───────────────────────────────────────────────────────────────────────── */
const mqState = { reduce: false, listeners: [] as Array<() => void> };

function mockMatchMedia(reduceMatches: boolean) {
  mqState.reduce = reduceMatches;
  mqState.listeners = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? mqState.reduce : false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, cb: () => void) => {
        if (typeof cb === 'function') mqState.listeners.push(cb);
      },
      removeEventListener: (_type: string, cb: () => void) => {
        mqState.listeners = mqState.listeners.filter((l) => l !== cb);
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/** Fires the component's `change` subscription, as a live preference flip does. */
const flipReduceMotion = (reduce: boolean) => {
  mqState.reduce = reduce;
  for (const listener of [...mqState.listeners]) listener();
};

/* ── rAF clock ────────────────────────────────────────────────────────────
   A real clock would make "four 16ms frames land where one 64ms frame does"
   untestable, so frames are queued by handle and advanced on demand. Timestamps
   must start above zero: the component treats `last === 0` as "no frame yet".
   ───────────────────────────────────────────────────────────────────────── */
function installClock() {
  const queue = new Map<number, FrameRequestCallback>();
  let handle = 0;
  const raf = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((cb) => {
      handle += 1;
      queue.set(handle, cb);
      return handle;
    });
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((h) => {
      queue.delete(h);
    });

  return {
    /** Run every frame due at `now`; re-armed callbacks land in the next queue. */
    step(now: number) {
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb(now);
    },
    /** Advance `steps` frames of `dt` ms each, after a first frame at `t0`. */
    drive(steps: number, dt: number, t0: number) {
      for (let i = 1; i <= steps; i += 1) this.step(t0 + i * dt);
    },
    pending: () => queue.size,
    calls: () => raf.mock.calls.length,
    cancelled: () => cancel.mock.calls.map((c) => c[0]),
    /** The handle of the most recent request: the one now live, if any. */
    liveHandle: () =>
      raf.mock.results[raf.mock.calls.length - 1]?.value as number | undefined,
  };
}

/* ── geometry ─────────────────────────────────────────────────────────────
   jsdom reports a 0x0 rect for everything, and a card with no area has no
   inside to map against, so the card under test gets a real box.
   ───────────────────────────────────────────────────────────────────────── */
const BOX = { left: 100, top: 50, width: 200, height: 100 };

function stubBox(el: HTMLElement) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    ...BOX,
    right: BOX.left + BOX.width,
    bottom: BOX.top + BOX.height,
    x: BOX.left,
    y: BOX.top,
    toJSON: () => ({}),
  } as DOMRect);
}

/** `moveTo(el, 0.5, 0.5)` is the bottom-right corner; 0,0 is dead centre. */
const moveTo = (el: HTMLElement, nx: number, ny: number) =>
  fireEvent.mouseMove(el, {
    clientX: BOX.left + (nx + 0.5) * BOX.width,
    clientY: BOX.top + (ny + 0.5) * BOX.height,
  });

/** Degrees the card is actually leaning, as written to the DOM. */
const tiltOf = (el: HTMLElement) => {
  const m = /rotateX\((-?[\d.]+)deg\) rotateY\((-?[\d.]+)deg\)/.exec(
    el.style.transform,
  );
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
};

/** Render a card and return its root element, box stubbed. */
const mountCard = (intensity?: number) => {
  const { container, unmount, rerender } = render(
    <Tilt3D intensity={intensity}>
      <span>panel</span>
    </Tilt3D>,
  );
  const root = container.firstElementChild as HTMLElement;
  stubBox(root);
  return { root, unmount, rerender };
};

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('Tilt3D', () => {
  it('renders its children and forwards className into the 3D context', () => {
    const { container } = render(
      <Tilt3D className="dash-card">
        <span>panel</span>
      </Tilt3D>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.textContent).toBe('panel');
    expect(root.className).toBe('dash-card');
    expect(root.style.transformStyle).toBe('preserve-3d');
    expect(root.style.perspective).toBe('800px');
  });

  it('writes no transform before the pointer arrives', () => {
    installClock();
    const { root } = mountCard();
    expect(root.style.transform).toBe('');
  });

  it('coalesces a burst of pointer moves into a single frame', () => {
    const clock = installClock();
    const { root } = mountCard();
    for (let i = 0; i < 20; i += 1) moveTo(root, -0.5 + i * 0.05, 0);
    expect(clock.calls()).toBe(1);
  });

  it('turns toward the pointer: right nods down, away from it rotates right', () => {
    const clock = installClock();
    const { root } = mountCard(4);
    moveTo(root, 0.5, 0.5); // bottom-right corner
    clock.drive(40, 200, 1000);
    // Bottom-right: the card leans away from the cursor, so rotateX (nod) is
    // negative and rotateY (turn) is positive. This pins the axis mapping — a
    // transposed one turns the card on the wrong axis and reads as a glitch.
    expect(tiltOf(root)?.x).toBeLessThan(-1);
    expect(tiltOf(root)?.y).toBeGreaterThan(1);
  });

  it('follows the newest position in a burst, not an average of it', () => {
    const clock = installClock();
    const { root } = mountCard(4);
    moveTo(root, -0.5, -0.5);
    moveTo(root, 0.5, 0.5);
    clock.step(1000);
    const tilt = tiltOf(root);
    expect(tilt?.x).toBeLessThan(0);
    expect(tilt?.y).toBeGreaterThan(0);
  });

  it('closes the gap every frame without overshooting or snapping', () => {
    const clock = installClock();
    const { root } = mountCard(4);
    moveTo(root, 0.5, 0.5);
    clock.step(1000);
    const first = Math.abs(tiltOf(root)?.y ?? 0);
    clock.step(1016);
    const second = Math.abs(tiltOf(root)?.y ?? 0);
    expect(first).toBeGreaterThan(0);
    // Approaching the 2° corner, never past it: a smoothing filter has no
    // overshoot, which is what tells it apart from a spring.
    expect(second).toBeGreaterThan(first);
    expect(second).toBeLessThan(2);
  });

  it('enters a hover at one frame of progress, not at 63% of the way there', () => {
    // The corner target is 2°, and the first frame runs with `last === 0`,
    // so it has no measured dt to smooth against. Fed the follow-τ itself it
    // would take `k = 1 - e^-1 = 0.632` and land ≈1.26° in a single frame —
    // the card pops to full tilt instead of leaning in. Fed one nominal 60Hz
    // frame (`FOLLOW_TAU_MS / 12`) it lands ≈0.16°, the same rate every later
    // frame starts from.
    const clock = installClock();
    const { root } = mountCard(4);
    moveTo(root, 0.5, 0.5);
    clock.step(1000);
    expect(Math.abs(tiltOf(root)?.y ?? 0)).toBeLessThan(0.5);
  });

  it('is frame-rate independent: 4x16ms lands where 1x64ms lands', () => {
    const corner = { x: 0.5, y: 0.5 };

    // 60Hz-ish: first sighting, then four 16ms frames.
    const fast = installClock();
    const a = mountCard(4);
    moveTo(a.root, corner.x, corner.y);
    fast.step(1000);
    fast.drive(4, 16, 1000);
    const afterFour = tiltOf(a.root);
    a.unmount();

    // 15Hz-ish: the same 64ms of wall clock in a single frame.
    const slow = installClock();
    const b = mountCard(4);
    moveTo(b.root, corner.x, corner.y);
    slow.step(1000);
    slow.step(1064);
    const afterOne = tiltOf(b.root);
    b.unmount();

    expect(afterFour?.x).toBeCloseTo(afterOne?.x ?? 0, 3);
    expect(afterFour?.y).toBeCloseTo(afterOne?.y ?? 0, 3);
  });

  it('parks once it has settled instead of spinning a frame forever', () => {
    const clock = installClock();
    const { root } = mountCard(4);
    moveTo(root, 0.5, 0.5);
    clock.drive(40, 200, 1000);
    expect(clock.pending()).toBe(0);
    // Settled AT the target, not at rest: the pointer is still on the card.
    expect(tiltOf(root)?.x).toBeCloseTo(-2, 1);
    expect(tiltOf(root)?.y).toBeCloseTo(2, 1);
    // And nothing further is written once parked.
    const parked = root.style.transform;
    clock.step(5000);
    expect(root.style.transform).toBe(parked);
  });

  it('eases back to exactly level on leave, then parks', () => {
    const clock = installClock();
    const { root } = mountCard(4);
    moveTo(root, 0.5, 0.5);
    clock.drive(2, 16, 1000);
    expect(tiltOf(root)?.y).toBeGreaterThan(0);
    fireEvent.mouseLeave(root);
    clock.drive(40, 200, 1032);
    expect(tiltOf(root)).toEqual({ x: 0, y: 0 });
    expect(clock.pending()).toBe(0);
  });

  it('peaks at intensity/2 degrees at a corner, as the grid is tuned for', () => {
    const clock = installClock();
    const { root } = mountCard(8);
    moveTo(root, 0.5, 0.5);
    clock.drive(40, 200, 1000);
    expect(Math.abs(tiltOf(root)?.y ?? 0)).toBeCloseTo(4, 1);
  });

  it('never leans under reduced motion', () => {
    mockMatchMedia(true);
    const clock = installClock();
    const { root } = mountCard();
    moveTo(root, 0.5, 0.5);
    expect(clock.calls()).toBe(0);
    expect(root.style.transform).toBe('');
  });

  it('stays inert when the environment has no matchMedia at all', () => {
    // The trap: without this deletion, every "motion enabled" test above is
    // really exercising the reduced-motion branch, and `canAnimate()` is the
    // only thing standing between the two.
    delete (window as { matchMedia?: unknown }).matchMedia;
    const clock = installClock();
    const { root } = mountCard();
    moveTo(root, 0.5, 0.5);
    expect(clock.calls()).toBe(0);
    expect(root.style.transform).toBe('');
  });

  it('releases an existing lean when the preference flips at runtime', () => {
    const clock = installClock();
    const { root } = mountCard(4);
    moveTo(root, 0.5, 0.5);
    clock.drive(2, 16, 1000);
    expect(tiltOf(root)?.y).toBeGreaterThan(0);
    flipReduceMotion(true);
    moveTo(root, 0.5, 0.5);
    clock.drive(40, 200, 1032);
    // A card frozen mid-lean would be a bug, and easing it home would be motion.
    expect(root.style.transform).toBe('');
    expect(clock.pending()).toBe(0);
  });

  it('cancels its pending frame and hands the card back flat on unmount', () => {
    const clock = installClock();
    const { root, unmount } = mountCard(4);
    moveTo(root, 0.5, 0.5);
    clock.step(1000); // first frame lands and re-arms a second
    const handle = clock.liveHandle();
    expect(clock.pending()).toBe(1);
    unmount();
    // The loop's own re-arm handle is the live one; cancelling a consumed
    // handle instead would leave a frame queued against a detached node.
    expect(clock.cancelled()).toContain(handle);
    expect(clock.pending()).toBe(0);
    // A remount must not inherit a tilt from the node it reused.
    expect(root.style.transform).toBe('');
  });

  it('picks up a new intensity without re-arming the loop', () => {
    const clock = installClock();
    const { root, rerender } = mountCard(4);
    moveTo(root, 0.5, 0.5);
    clock.drive(40, 200, 1000);
    expect(Math.abs(tiltOf(root)?.y ?? 0)).toBeCloseTo(2, 1);
    const armedBefore = clock.calls();

    rerender(
      <Tilt3D intensity={10}>
        <span>panel</span>
      </Tilt3D>,
    );
    // Same instance: the loop is not rebuilt, so the re-render itself arms no
    // frame. The next move simply aims somewhere further.
    expect(clock.calls()).toBe(armedBefore);
    moveTo(root, -0.5, -0.5);
    clock.drive(40, 200, 1000);
    expect(Math.abs(tiltOf(root)?.y ?? 0)).toBeCloseTo(5, 1);
  });

  it('builds no animation instance per event, and guards its frame handle', () => {
    // The defect this replaced: one `animate()` per event, per card.
    expect(source).not.toMatch(/from\s+['"]animejs['"]/);
    expect(source).not.toMatch(/\banimate\s*\(/);
    expect(source).toMatch(/if \(!\w+\.raf\)/);
    expect(source).toMatch(
      /if \(\w+\.raf\) window\.cancelAnimationFrame\(\w+\.raf\)/,
    );
  });

  it('solves its follow with frame-rate-independent smoothing', () => {
    expect(source).toMatch(/const k = 1 - Math\.exp\(-dt \/ tau\)/);
  });

  it('takes both time constants from tokens', () => {
    expect(source).toMatch(/durations\[200\] \* 1000/);
    expect(source).toMatch(/durations\[500\] \* 1000/);
  });
});
