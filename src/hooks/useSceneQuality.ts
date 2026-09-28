/**
 * useSceneQuality — decides whether the 3D scene runs, and at what density.
 *
 * The repo has a history of WebGL blowing up in headless/CI/sandboxed
 * environments, so every path here fails *closed* to the static SVG fallback
 * rather than throwing. The FPS probe steps quality down rather than letting
 * the main thread stall.
 */

import { useEffect, useState } from 'react';

export type SceneTier = 'high' | 'medium' | 'low' | 'none';
/** Not a quality level: the tab is hidden, so the scene is unmounted. */
export type SceneTierState = SceneTier | 'paused';

export type SceneQuality = {
  /** null until the client has decided — render the fallback until then. */
  tier: SceneTierState;
  /** The tier the device actually supports, restored after a tab pause. */
  detectedTier: SceneTier;
  ready: boolean;
  reduced: boolean;
  /** True when WebGL is unavailable or refused; the caller must not retry. */
  unsupported: boolean;
};

const detectWebGL = (): boolean => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
    // Release the probe context immediately — browsers cap concurrent contexts.
    const lose = (gl as WebGLRenderingContext).getExtension(
      'WEBGL_lose_context',
    );
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
};

/**
 * Scene density from what the device can actually compute.
 *
 * This used to also treat a coarse pointer and a narrow window as "low". Both
 * were wrong, and badly so:
 *
 *   - `(pointer: coarse)` is true on most touch-enabled laptops, which are
 *     frequently the most capable machines in the room. A 16-core touchscreen
 *     laptop was being classed as a weak device and had the entire tube layer
 *     switched off (`TUBE_TIER.low` is null). Input modality says nothing
 *     about GPU or CPU capability.
 *   - `innerWidth < 768` measures the browser WINDOW, not the device. Resizing
 *     a desktop window narrow silently downgraded the scene, and it never
 *     recovered until a reload. A phone-sized window is also not a slow GPU.
 *
 * Only core count and reported device memory predict render cost, so only
 * those are consulted. Everything else is a viewport concern and belongs to
 * the art direction, not the quality gate.
 */
export const tierForDevice = (): SceneTier => {
  if (typeof navigator === 'undefined') return 'low';
  const cores = navigator.hardwareConcurrency ?? 2;

  // deviceMemory is Chromium-only and reported in gigabytes. Narrowed with
  // `in` rather than an inline cast, so the access is checked, not asserted.
  const memory =
    'deviceMemory' in navigator && typeof navigator.deviceMemory === 'number'
      ? navigator.deviceMemory
      : undefined;

  if (cores <= 2) return 'low';
  if (memory !== undefined && memory <= 2) return 'low';
  if (cores <= 8) return 'medium';
  return 'high';
};

export function useSceneQuality(): SceneQuality {
  const [state, setState] = useState<SceneQuality>({
    tier: 'none',
    detectedTier: 'none',
    ready: false,
    reduced: false,
    unsupported: false,
  });

  useEffect(() => {
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion gets a static, hand-tuned SVG composition. No rAF at all.
    if (reduced) {
      setState({
        tier: 'none',
        detectedTier: 'none',
        ready: true,
        reduced: true,
        unsupported: false,
      });
      return;
    }

    if (!detectWebGL()) {
      setState({
        tier: 'none',
        detectedTier: 'none',
        ready: true,
        reduced: false,
        unsupported: true,
      });
      return;
    }

    const tier = tierForDevice();
    setState({
      tier,
      detectedTier: tier,
      ready: true,
      reduced: false,
      unsupported: false,
    });
  }, []);

  // Degrade while the tab is hidden, and RESTORE when it comes back. The
  // previous version set tier to 'none' and never put it back — and because
  // `state.tier` was a dependency, the effect then re-ran, took the early
  // return, and removed the listener, so hiding the tab for one second
  // stranded the static SVG fallback for the rest of the session.
  useEffect(() => {
    if (!state.ready || state.unsupported || state.reduced) return;
    const onVisibility = () => {
      setState((s) => {
        if (document.hidden) {
          if (s.tier === 'none') return s;
          return { ...s, tier: 'paused' };
        }
        return s.tier === 'paused' ? { ...s, tier: s.detectedTier } : s;
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [state.ready, state.unsupported, state.reduced, state.detectedTier]);

  return state;
}
