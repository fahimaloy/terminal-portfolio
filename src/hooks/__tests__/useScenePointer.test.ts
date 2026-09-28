/**
 * Regression test for the module-level pointer singleton.
 *
 * `useScenePointer` used to seed its ref with the module-level `IDLE` object
 * itself rather than a copy. `useRef(IDLE)` stores the object BY REFERENCE, and
 * the effect mutates `ref.current` in place on every `pointermove`, so the very
 * first pointer event of any mount permanently flipped `IDLE.active = true` on
 * the module. Every later fresh mount then handed out a pointer that already
 * read as active — a scene that had never seen the cursor would start
 * parallaxing, and particle repulsion would pull from the origin.
 *
 * This is why `src/components/scene/__tests__/scene.test.tsx` asserts
 * `expect(seen.active).toBe(false)` on a fresh mount: that assertion is correct
 * and is evidence, not the bug. This file pins the underlying cause directly,
 * which the scene test can only observe when the file happens to run after a
 * pointer event.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useContext } from 'react';

import { ScenePointerContext, useScenePointer } from '../useScenePointer';

/** jsdom has no PointerEvent; MouseEvent carries the same client coords. */
const moveMouse = (clientX: number, clientY: number) => {
  act(() => {
    window.dispatchEvent(
      new MouseEvent('pointermove', { clientX, clientY, bubbles: true }),
    );
  });
};

const viewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true,
  });
};

const cleanup: Array<() => void> = [];
/** Returns the mounted ref plus its `unmount`, tracked for automatic teardown. */
const mountPointer = () => {
  const hook = renderHook(() => useScenePointer());
  cleanup.push(hook.unmount);
  return { pointer: hook.result.current, unmount: hook.unmount };
};

afterEach(() => {
  while (cleanup.length) cleanup.pop()?.();
});

describe('useScenePointer per-instance state', () => {
  it('hands a fresh mount an inactive pointer, not the previous one', () => {
    viewport(1440, 900);

    // First instance: pristine, then activated by a real pointer event.
    const { pointer: first } = mountPointer();
    expect(first.current.active).toBe(false);
    moveMouse(1440, 0);
    expect(first.current.active).toBe(true);
    expect(first.current.x).toBeCloseTo(1, 5);

    // A second, independent mount must not inherit any of that.
    const { pointer: second } = mountPointer();
    expect(second.current).not.toBe(first.current);
    expect(second.current.active).toBe(false);
    expect(second.current.x).toBe(0);
    expect(second.current.y).toBe(0);
    expect(second.current.clientX).toBe(0);
    expect(second.current.clientY).toBe(0);
    expect(second.current.movedAt).toBe(0);
  });

  it('survives an unmount/remount cycle after a pointer event', () => {
    viewport(1440, 900);

    const { pointer: first, unmount } = mountPointer();
    moveMouse(720, 450);
    expect(first.current.active).toBe(true);
    unmount();

    const { pointer: second } = mountPointer();
    expect(second.current).not.toBe(first.current);
    expect(second.current.active).toBe(false);
  });

  it('leaves the unprovided context default inactive', () => {
    viewport(1440, 900);

    mountPointer();
    moveMouse(100, 100);

    // No provider: consumers fall back to the context default, which must not
    // be reachable by any instance's listener.
    const { result, unmount } = renderHook(() =>
      useContext(ScenePointerContext),
    );
    cleanup.push(unmount);
    expect(result.current.current.active).toBe(false);
    expect(result.current.current.x).toBe(0);
  });
});
