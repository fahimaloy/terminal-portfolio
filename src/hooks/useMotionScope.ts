// src/hooks/useMotionScope.ts
/* The single entry point for anime.js v4 scopes.
 *
 * Every animated surface in the app should own exactly one scope, created
 * here. The contract it enforces:
 *
 *   1. One owner. `run()` reverts any previous scope before creating a new one,
 *      so a re-run can never leave two scopes writing the same properties.
 *   2. StrictMode-safe. `reactStrictMode: true` in next.config.js means every
 *      effect runs, cleans up, then runs again. The hook tears the first scope
 *      down before building the second, so the double-invoke is invisible.
 *   3. Reduced motion is a first-class path, not an early return scattered at
 *      each call site — `run` invokes the callback with `null` and the caller
 *      sets its final state directly.
 *   4. Cleanup order is scope-first, then anything the callback split (e.g.
 *      splitText). Reverting the splitter first rebuilds the DOM the scope is
 *      still bound to.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createScope, type Scope } from 'animejs';
import { isReducedMotion, canAnimate } from '../config/animations';

export interface MotionScopeOptions {
  /** Set false for decorative motion that should still play when reduced. */
  respectReduced?: boolean;
  mediaQueries?: Record<string, string>;
  defaults?: { duration?: number; ease?: string };
}

export type MotionScopeRun = (scope: Scope | null) => void;

export function useMotionScope(
  root: React.RefObject<HTMLElement | null>,
  options: MotionScopeOptions = {},
) {
  const { respectReduced = true, mediaQueries, defaults } = options;
  const scopeRef = useRef<Scope | null>(null);
  /**
   * For standalone tweens that must still be owned by this component — hover
   * feedback on nodes the entrance scope also writes. Reverted with the scope
   * so a hover can never outlive the element it animates.
   */
  const hoverRef = useRef<{ revert: () => void } | null>(null);
  // Held in a ref so `run` stays referentially stable across renders and the
  // caller's effect does not need it in its dependency list.
  const optsRef = useRef({ mediaQueries, defaults, respectReduced });
  optsRef.current = { mediaQueries, defaults, respectReduced };

  const revert = useCallback(() => {
    try {
      hoverRef.current?.revert();
    } catch {
      // hover target already detached
    }
    hoverRef.current = null;
    try {
      scopeRef.current?.revert();
    } catch {
      // A scope whose root was already detached throws on revert. Swallowing
      // it here keeps unmount from crashing a page that is going away anyway.
    }
    scopeRef.current = null;
  }, []);

  /**
   * Build the scope and hand it to `fn`. Pass the `teardown` return value to
   * `useMotionScopeCleanup` ordering — or just call it at the top of your own
   * effect cleanup, *before* reverting split text.
   */
  const run = useCallback(
    (fn: MotionScopeRun) => {
      // One owner: never stack scopes.
      revert();

      const el = root.current;
      const reduced =
        optsRef.current.respectReduced && (isReducedMotion() || !canAnimate());

      if (!el || reduced) {
        fn(null);
        return;
      }

      const { mediaQueries: mq, defaults: def } = optsRef.current;
      const scope = createScope({
        root: el,
        ...(mq ? { mediaQueries: mq } : null),
        ...(def ? { defaults: def } : null),
      }) as unknown as Scope;
      scopeRef.current = scope;
      fn(scope);
    },
    [root, revert],
  );

  useEffect(() => revert, [revert]);

  // The returned object must be referentially stable. Consumers put it in
  // effect deps, and an object literal here produced a new identity every
  // render — so an effect that animates into `setState` re-ran forever,
  // restarting its own animation on each frame (StatBar counted 0→target
  // and never arrived).
  return useMemo(
    () => ({ run, revert, scopeRef, hoverRef }),
    [run, revert, scopeRef, hoverRef],
  );
}

export default useMotionScope;
