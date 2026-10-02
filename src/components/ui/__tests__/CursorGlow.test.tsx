// src/components/ui/__tests__/CursorGlow.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import CursorGlow from '../CursorGlow';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/ui/CursorGlow.tsx'),
  'utf8',
);

const rootOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-cursor-glow]') as HTMLElement;

/** jsdom has no PointerEvent constructor; a MouseEvent carries what we read. */
const movePointer = (x: number, y: number, pointerType = 'mouse') => {
  const event = new MouseEvent('pointermove', { clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  window.dispatchEvent(event);
};

/**
 * jsdom ships no `matchMedia`, which is exactly the reduced-motion path:
 * `canAnimate()` is false and the component must be a plain, visible readout.
 */
const installMotionPreference = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('CursorGlow', () => {
  it('renders an inert, decorative root that cannot intercept input', () => {
    const { container } = render(<CursorGlow />);
    const root = rootOf(container);
    expect(root).toBeTruthy();
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.className).toContain('pointer-events-none');
  });

  it('sits between the scene layer and the page so it can never cover text', () => {
    const { container } = render(<CursorGlow />);
    // SceneLayer is fixed inset-0 z-0; RouteTransition's stage is z-10.
    expect(rootOf(container).className).toContain('z-[1]');
  });

  it('draws from the accent role tokens by default', () => {
    const { container } = render(<CursorGlow />);
    expect(container.innerHTML).toContain('var(--accent-color)');
    expect(container.innerHTML).toContain('var(--accent-glow)');
    expect(container.innerHTML).toContain('var(--accent-wash)');
  });

  it('has no full-screen blur filter left behind', () => {
    expect(source).not.toMatch(/filter:\s*['"`]blur/);
    const { container } = render(<CursorGlow />);
    expect(rootOf(container).style.filter).toBe('');
  });

  it('honours the legacy color, size and intensity props', () => {
    const { container } = render(
      <CursorGlow color="var(--glow-amber-sm)" size={48} intensity={0.5} />,
    );
    const core = container.querySelector<HTMLElement>(
      '[data-cursor-glow] > div:last-child',
    ) as HTMLElement;
    expect(core.style.background).toBe('var(--glow-amber-sm)');
    // The main ring is `size` wide; alpha is halved by intensity.
    const ring = container.querySelector<HTMLElement>(
      '[data-cursor-glow] > div:nth-child(5)',
    ) as HTMLElement;
    expect(ring.style.width).toBe('48px');
    expect(Number(ring.style.opacity)).toBeLessThanOrEqual(0.25);
  });

  it('becomes visible on the first pointer event rather than at page origin', () => {
    const { container } = render(<CursorGlow />);
    expect(rootOf(container).style.opacity).toBe('0');
    act(() => movePointer(120, 240));
    expect(rootOf(container).style.opacity).toBe('1');
  });

  it('coalesces a burst of pointer moves into a single frame', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(11);
    render(<CursorGlow />);
    act(() => {
      for (let i = 0; i < 20; i += 1) movePointer(i * 4, i * 2);
    });
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('ignores touch so a finger drag cannot smear the reticle', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(11);
    const { container } = render(<CursorGlow />);
    act(() => movePointer(200, 200, 'touch'));
    expect(raf).not.toHaveBeenCalled();
    expect(rootOf(container).style.opacity).toBe('0');
  });

  it('snaps 1:1 to the pointer under reduced motion instead of lagging', () => {
    installMotionPreference(true);
    let tick: FrameRequestCallback | null = null;
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        tick = cb;
        return 1;
      });
    const { container } = render(<CursorGlow />);
    act(() => movePointer(300, 180));
    const root = rootOf(container);
    // Calm, never absent: a reduced-motion reticle still tracks the cursor.
    expect(root.style.opacity).toBe('1');
    expect(tick).toBeTypeOf('function');

    act(() => {
      movePointer(320, 190);
      if (tick) tick(0);
    });
    expect(root.style.transform).toBe('translate3d(320.00px, 190.00px, 0)');
    // One frame for two moves, and at rest it parks instead of spinning.
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('cancels its frame and drops every listener on unmount', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(29);
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const { unmount } = render(<CursorGlow />);
    act(() => movePointer(50, 50));
    expect(raf).toHaveBeenCalledTimes(1);
    unmount();
    expect(cancel).toHaveBeenCalledWith(29);
    // No further work may happen after unmount.
    const callsAfterUnmount = raf.mock.calls.length;
    movePointer(90, 90);
    expect(raf.mock.calls.length).toBe(callsAfterUnmount);
  });

  it('guards its frame handle instead of arming a rAF per event', () => {
    expect(source).toMatch(
      /if \(!raf\) raf = window\.requestAnimationFrame\(frame\)/,
    );
  });

  it('takes every timing and colour from tokens', () => {
    expect(source).toMatch(/durations\.\w+ \* 1000|durations\[\d+\] \* 1000/);
    expect(source).toMatch(/easings\.\w+/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/rgba\s*\(/);
  });
});
