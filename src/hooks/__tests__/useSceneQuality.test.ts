/**
 * Regression tests for the scene quality tier heuristic.
 *
 * The heuristic previously treated a coarse pointer and a narrow window as
 * evidence of a weak device. Both were wrong:
 *
 *   - `(pointer: coarse)` is true on most touch-enabled laptops, which are
 *     frequently the most capable machines in the room. A 16-core touchscreen
 *     laptop was classified `low`, and the tube layer was switched off on
 *     hardware that renders it easily. This is the most likely reason the
 *     effect "wasn't showing" on a real machine.
 *   - `innerWidth < 768` measures the browser WINDOW, not the device. Dragging
 *     a desktop window narrow silently downgraded the scene, and it never
 *     recovered without a reload.
 *
 * The tier now depends only on what actually predicts render cost: core count
 * and reported device memory.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useSceneQuality, tierForDevice } from '../useSceneQuality';

const setCores = (cores: number) => {
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => cores,
    configurable: true,
  });
};

const mediaMock = (opts: { coarse: boolean; reduced: boolean }) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('pointer: coarse')
        ? opts.coarse
        : query.includes('prefers-reduced-motion')
          ? opts.reduced
          : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
};

const realInnerWidth = window.innerWidth;
const setWidth = (w: number) => {
  Object.defineProperty(window, 'innerWidth', {
    value: w,
    configurable: true,
  });
};

/**
 * `navigator.deviceMemory` is a global. Overriding it without restoring it
 * leaks `1` into every later `tierForDevice()` in the file, which then returns
 * `'low'` for reasons the later tests never intended. jsdom does not define the
 * property at all, so "absent" is the state to return to — a plain `undefined`
 * value is not the same thing, because `useSceneQuality` narrows with
 * `'deviceMemory' in navigator` and then reads `.deviceMemory`.
 */
const nav = navigator as Navigator & { deviceMemory?: number };
const realDeviceMemory = Object.getOwnPropertyDescriptor(nav, 'deviceMemory');
const restoreDeviceMemory = () => {
  if (realDeviceMemory) {
    Object.defineProperty(nav, 'deviceMemory', realDeviceMemory);
  } else {
    delete nav.deviceMemory;
  }
};

describe('scene quality tier', () => {
  beforeEach(() => {
    mediaMock({ coarse: false, reduced: false });
    setWidth(1440);
  });

  afterEach(() => {
    setWidth(realInnerWidth);
    restoreDeviceMemory();
  });

  it('does not downgrade a high-core touch laptop', () => {
    // The regression: a coarse pointer used to force `low`, which disabled the
    // tube layer on hardware that renders it easily.
    setCores(16);
    mediaMock({ coarse: true, reduced: false });
    expect(tierForDevice()).toBe('high');
  });

  it('does not downgrade on a narrow window', () => {
    // The regression: resizing a desktop window downgraded the scene, with no
    // recovery until a reload.
    setCores(16);
    setWidth(420);
    expect(tierForDevice()).toBe('high');
  });

  it('scales down on genuinely few cores', () => {
    setCores(2);
    expect(tierForDevice()).toBe('low');

    setCores(4);
    expect(tierForDevice()).toBe('medium');

    setCores(16);
    expect(tierForDevice()).toBe('high');
  });

  it('treats reported low memory as a weak device', () => {
    setCores(16);
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 1,
      configurable: true,
    });
    expect(tierForDevice()).toBe('low');
  });
});

describe('useSceneQuality under reduced motion', () => {
  it('reports no scene at all', async () => {
    setCores(16);
    mediaMock({ coarse: false, reduced: true });
    const { result } = renderHook(() => useSceneQuality());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.reduced).toBe(true);
    expect(result.current.tier).toBe('none');
  });
});
