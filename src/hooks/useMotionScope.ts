// src/hooks/useMotionScope.ts
/* useMotionScope — canonical anime.js v4 scope wrapper with reduced-motion guard */

import { useRef, useCallback, useEffect } from 'react';
import { createScope } from 'animejs';
import { isReducedMotion, canAnimate } from '../config/animations';

// Avoid ReturnType coupling — lightweight handle
export interface MotionScopeHandle {
  revert: () => void;
  add: (fn: () => void | Promise<void>) => void;
}

export interface MotionScopeOptions {
  respectReduced?: boolean;
  mediaQueries?: Record<string, string>;
  defaults?: { duration?: number; ease?: string };
}

export function useMotionScope(
  root: React.RefObject<HTMLElement | null>,
  options: MotionScopeOptions = {},
) {
  const { respectReduced = true, mediaQueries, defaults } = options;
  const scopeRef = useRef<MotionScopeHandle | null>(null);

  const isReduced = useCallback(
    () => respectReduced && (isReducedMotion() || !canAnimate()),
    [respectReduced],
  );

  const canAnimateNow = useCallback(() => !isReduced(), [isReduced]);

  const revert = useCallback(() => {
    scopeRef.current?.revert();
    scopeRef.current = null;
  }, []);

  const create = useCallback(() => {
    if (!root.current) return null;
    if (isReduced()) return null;
    const scope = createScope({
      root: root.current,
      ...(mediaQueries ? { mediaQueries } : {}),
      ...(defaults ? { defaults } : {}),
    }) as unknown as MotionScopeHandle;
    scopeRef.current = scope;
    return scope;
  }, [root, isReduced, mediaQueries, defaults]);

  useEffect(() => () => revert(), [revert]);

  return { scopeRef, isReduced, canAnimateNow, create, revert };
}

export default useMotionScope;
