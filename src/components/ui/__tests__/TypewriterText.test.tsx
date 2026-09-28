// src/components/ui/__tests__/TypewriterText.test.tsx
// P3.3 — the reveal primitive. Proves three things the old version got wrong:
// timing comes from tokens (not literals), the per-character delay is derived
// from --dur-typing (not a flat 40ms), and nothing leaks or fires after the
// component is gone.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

const h = vi.hoisted(() => ({
  revert: vi.fn(),
  animate: vi.fn(),
  stagger: vi.fn((step: number) => step),
}));

// anime.js is stubbed so nothing animates for real: `animate` records its args
// and never fires `onComplete`, which lets a test decide when the reveal ends.
vi.mock('animejs', () => {
  const scope: any = {
    revert: h.revert,
    add: vi.fn((cb: () => void) => {
      cb();
      return scope;
    }),
  };
  return {
    createScope: vi.fn(() => scope),
    animate: h.animate,
    stagger: h.stagger,
    spring: vi.fn(() => 'spring-ease'),
    createTimeline: vi.fn(() => ({ add: vi.fn() })),
  };
});

import TypewriterText from '../TypewriterText';
import { durations, easings } from '../../../config/animations';

function mockMatchMedia(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reduce : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function animateArgs(call = 0) {
  return h.animate.mock.calls[call][1] as Record<string, any>;
}

function completeReveal(call = 0) {
  act(() => {
    animateArgs(call).onComplete();
  });
}

describe('TypewriterText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    // eslint-disable-next-line
    delete (window as any).matchMedia;
    vi.useRealTimers();
  });

  it('paints the whole string up front, one span per character', () => {
    const { container } = render(<TypewriterText text="hey" />);
    const chars = container.querySelectorAll('.tw-char');
    expect(chars.length).toBe(3);
    expect(container.textContent).toBe('hey');
  });

  it('takes duration and ease from the token set, not literals', () => {
    render(<TypewriterText text="hey" />);
    const args = animateArgs();
    expect(args.duration).toBe(durations.tap * 1000);
    expect(args.ease).toBe(easings.outExpo);
    // The pre-P3.3 version passed `700` and `'outExpo'` inline, and resolved
    // `durations[700] ?? 0.7` — a lookup that can never hit, because
    // `durations` is keyed by NAME.
    expect(args.duration).not.toBe(700);
    expect(args.ease).not.toBe('outExpo');
    expect(animateArgs().ease).toBe(easings.outExpo);
  });

  it('derives the per-character delay from --dur-typing so a long answer still settles', () => {
    const long = 'x'.repeat(300);
    render(<TypewriterText text={long} />);
    // 299 gaps across the 1800ms typing token. A flat `stagger(40)` meant a
    // 300-character reply took ~12s to finish fading.
    expect(h.stagger).toHaveBeenCalledWith((durations.typing * 1000) / 299, {
      from: 'first',
    });
    expect(h.stagger).not.toHaveBeenCalledWith(40, expect.anything());
  });

  it('calls onDone when the reveal completes', () => {
    const onDone = vi.fn();
    render(<TypewriterText text="hey" onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    completeReveal();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reverts its scope and ignores a straggler onComplete after unmount', () => {
    const onDone = vi.fn();
    const { unmount } = render(<TypewriterText text="hey" onDone={onDone} />);
    const args = animateArgs();
    unmount();
    expect(h.revert).toHaveBeenCalled();
    // A late callback must not resolve the caller's "settled" flag against a
    // tree that no longer exists.
    act(() => {
      args.onComplete();
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reduced motion: renders the full text, never animates, reports done immediately', () => {
    mockMatchMedia(true);
    const onDone = vi.fn();
    const { container } = render(<TypewriterText text="hey" onDone={onDone} />);
    // Synchronously, not on a timer — otherwise a settled flag fed by onDone
    // would latch for the whole life of the component.
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(h.animate).not.toHaveBeenCalled();
    expect(container.textContent).toBe('hey');
  });

  it('honours startDelay and cancels a pending delay timer on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<TypewriterText text="hey" startDelay={500} />);
    expect(h.animate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(h.animate).toHaveBeenCalledTimes(1);

    h.animate.mockClear();
    const second = render(<TypewriterText text="yo" startDelay={500} />);
    second.unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // The timer was cleared, so the second reveal never starts.
    expect(h.animate).not.toHaveBeenCalled();
    unmount();
  });
});
