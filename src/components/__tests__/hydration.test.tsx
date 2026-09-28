// src/components/__tests__/hydration.test.tsx
/**
 * Regression tests for the two classes of bug that made the landing page
 * throw "Hydration failed because the server rendered HTML didn't match the
 * client" on every load:
 *
 *  1. Transcendental math used as a "deterministic" seed. StaticField derived
 *     circle positions from `Math.sin(...)`, and V8's inlined fast path and its
 *     runtime fdlibm path disagree in the low mantissa bits — so Node (SSR) and
 *     Chrome (hydration) produced different `cy`/`r` attributes.
 *
 *  2. A render-time branch on a browser-only value. `isReducedMotion()` returns
 *     false when there is no `window` and the user's real preference in a
 *     browser, so any component branching its JSX on it renders a different
 *     tree on each side.
 *
 * Both tests assert the real invariant — the server HTML and the hydrated DOM
 * must be byte-identical — rather than re-stating the implementation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

import SceneLayer from '../scene/SceneLayer';
import ScrollIndicator from '../HUD/ScrollIndicator';
import { useMotionPreference } from '../../hooks/useMotionPreference';

const HYDRATION_ERROR = /hydrat|did not match|server rendered HTML/i;

const setMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

/**
 * Renders as the server does: with no `window` at all. jsdom keeps a global
 * `window` around even under `renderToString`, which would let a
 * `typeof window !== 'undefined'` guard pass and hide the very bug under
 * test. Removing it is what makes this a server render.
 */
function renderOnServer(ui: React.ReactElement): string {
  const win = globalThis.window;
  const media = window.matchMedia;
  // @ts-expect-error -- deliberately simulating the absence of a DOM
  delete globalThis.window;
  try {
    return renderToString(ui);
  } finally {
    globalThis.window = win;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: media,
    });
  }
}

/**
 * Renders `ui` on the server, then hydrates that exact HTML in the browser,
 * collecting anything React logged. Returns the server markup and the
 * post-hydration markup so the caller can compare them directly.
 */
function hydrateAndCompare(ui: React.ReactElement) {
  const serverHtml = renderOnServer(ui);

  const container = document.createElement('div');
  container.innerHTML = serverHtml;
  document.body.appendChild(container);

  const errors: string[] = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args.map(String).join(' '));
  });

  act(() => {
    hydrateRoot(container, ui);
  });

  spy.mockRestore();

  return { serverHtml, clientHtml: container.innerHTML, errors };
}

beforeEach(() => {
  // The reported failure was for a reduced-motion visitor, so that is the
  // default condition for these tests.
  setMatchMedia(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('hydration determinism', () => {
  it('SceneLayer renders identical markup on the server and the client', () => {
    // StaticField is the no-WebGL path, and the one that SSRs.
    const { serverHtml, clientHtml, errors } = hydrateAndCompare(
      <SceneLayer variant="hero" />,
    );

    expect(errors.filter((e) => HYDRATION_ERROR.test(e))).toEqual([]);
    expect(clientHtml).toBe(serverHtml);
  });

  it('SceneLayer circle geometry survives a perturbed Math.sin', () => {
    // The failure mode was Math.sin disagreeing between the two engines, which
    // no single-process test can reproduce. Simulating the disagreement by
    // perturbing Math.sin does: an implementation that seeds from a
    // transcendental changes its output, an integer-hash one cannot.
    const baseline = renderOnServer(<SceneLayer variant="hero" />);

    const realSin = Math.sin;
    Math.sin = (x: number) => realSin(x) * (1 + Number.EPSILON * 4);
    let perturbed: string;
    try {
      perturbed = renderOnServer(<SceneLayer variant="hero" />);
    } finally {
      Math.sin = realSin;
    }

    expect(perturbed).toBe(baseline);
  });

  it('ScrollIndicator renders identical markup on the server and the client', () => {
    const { serverHtml, clientHtml, errors } = hydrateAndCompare(
      <ScrollIndicator />,
    );

    expect(errors.filter((e) => HYDRATION_ERROR.test(e))).toEqual([]);
    expect(clientHtml).toBe(serverHtml);
  });

  it('ScrollIndicator emits the same tree whether or not motion is reduced', () => {
    // The removed branch returned a bare rail for reduced motion and a full
    // progress rail otherwise. One tree must be emitted in both cases.
    setMatchMedia(false);
    const motionOk = renderToString(<ScrollIndicator />);
    setMatchMedia(true);
    const reduced = renderOnServer(<ScrollIndicator />);

    expect(reduced).toBe(motionOk);
  });

  it('useMotionPreference agrees with the server on hydration, then settles', () => {
    // The contract: the value used for the server render is reused for the
    // first client render, so hydration cannot mismatch. Only afterwards does
    // the real preference take over.
    const renders: string[] = [];
    function Probe() {
      const pref = useMotionPreference();
      renders.push(pref.reduced ? 'reduced' : 'animate');
      return <span>{pref.reduced ? 'reduced' : 'animate'}</span>;
    }

    // matchMedia reports reduce for this whole test — a reduced-motion visitor,
    // i.e. the exact condition that broke the landing page.
    const { serverHtml, clientHtml, errors } = hydrateAndCompare(<Probe />);

    expect(errors.filter((e) => HYDRATION_ERROR.test(e))).toEqual([]);

    // The server assumed motion was welcome, and so did the first client
    // render — those agree, which is what hydration requires.
    expect(serverHtml).toContain('animate');
    expect(renders[0]).toBe('animate');

    // Then the visitor's real preference is adopted, in a re-render.
    expect(renders[renders.length - 1]).toBe('reduced');
    expect(clientHtml).toContain('reduced');
  });
});
