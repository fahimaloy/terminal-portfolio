// src/components/ui/__tests__/HudPanelEntrance.test.tsx
//
// Animation-contract coverage for the HudPanel entrance.
//
// HudPanel is the single most-used container in the repo (~60 call sites, and
// `src/components/ui/**` is shared with the admin panel), so its motion has to
// be provably boring. Four properties are pinned here, each of which is a
// constraint the entrance is not allowed to break:
//
//   1. IT RUNS ON MOUNT. `createScope` is the first thing the animated path
//      does, so `scopes.length === 1` isolates "the entrance exists" from any
//      other styling on the node.
//   2. IT IS ONE-SHOT. Deps are `[]`, so a re-render caused by a new title, a
//      new accent or new children — every one of which the composer above the
//      chat sheet produces on each keystroke — must not replay it.
//   3. THE RESTING STATE IS CORRECT WITHOUT MOTION. Under reduced motion and
//      under SSR/jsdom (no `matchMedia`) the panel writes NO inline opacity at
//      all, because there is deliberately no `opacity-0` class to fall back
//      on: it is server-rendered in ~60 places and a hidden default would
//      blank the markup for anyone whose JS never runs.
//   4. CLEANUP REVERTS, and cannot throw. A scope whose root was already
//      detached throws on revert; cleanup must not take the tree with it.
//
// Also pinned: opacity and transform are the only animated properties (nothing
// that triggers layout, with a WebGL canvas running behind the page), and
// children are never gated on the animation finishing.
//
// `src/components/ui/__tests__/HudPanel.test.tsx` covers the static rendering
// contract and runs with no `matchMedia` at all, i.e. the SSR branch.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const { scopes, mockAnimate } = vi.hoisted(() => ({
  scopes: [] as Array<{
    add: (cb: () => void) => unknown;
    revert: ReturnType<typeof vi.fn>;
  }>,
  mockAnimate: vi.fn(),
}));

vi.mock('animejs', () => ({
  __esModule: true,
  animate: mockAnimate,
  createScope: vi.fn(() => {
    const scope = {
      add: vi.fn((cb: () => void) => {
        cb();
        return scope;
      }),
      revert: vi.fn(),
    };
    scopes.push(scope);
    return scope;
  }),
}));

import HudPanel from '../HudPanel';
import { durations, easings } from '../../../config/animations';

function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function clearMatchMedia() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).matchMedia;
}

/** The panel root — the outermost element HudPanel renders. */
function rootOf(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

/** The single `animate()` call the entrance is expected to make. */
function entranceCall() {
  expect(mockAnimate).toHaveBeenCalledTimes(1);
  return mockAnimate.mock.calls[0] as [HTMLElement, Record<string, unknown>];
}

/** The params object of the entrance tween. */
function entranceParams(): Record<string, unknown> {
  return entranceCall()[1];
}

/**
 * Drive the tween's `onComplete` the way anime would, so the assertions about
 * the end state are about the component's own bookkeeping rather than about
 * whether the (mocked) animation library applied a style.
 */
function completeEntrance() {
  const onComplete = entranceParams().onComplete;
  expect(typeof onComplete).toBe('function');
  (onComplete as () => void)();
}

describe('HudPanel — entrance animation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    mockAnimate.mockClear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    clearMatchMedia();
  });

  it('runs the entrance once on mount, on the panel root', () => {
    const { container } = render(<HudPanel data-testid="p">CONTENT</HudPanel>);

    expect(scopes).toHaveLength(1);

    const [target, params] = entranceCall();
    expect(target).toBe(rootOf(container));

    // Fade + rise, in that order, over the house panel value. Both ends are
    // explicit arrays so the tween cannot inherit a value from the node.
    expect(params.opacity).toEqual([0, 1]);
    expect(params.translateY).toEqual([8, 0]);

    // Tokens, not literals. `durations` is `Record<string, number>`, so the
    // numeric key is read through the index signature.
    expect(params.duration).toBe(durations[300] * 1000);
    expect(params.ease).toBe(easings.outExpo);
  });

  it('starts from a pre-paint hidden frame and hands the node back when it lands', () => {
    const { container } = render(<HudPanel data-testid="p">CONTENT</HudPanel>);
    const root = rootOf(container);

    // Written synchronously by the layout effect, before the browser paints,
    // so the panel never flashes fully formed for one frame.
    expect(root.style.opacity).toBe('0');
    expect(root.style.transform).toContain('8px');

    completeEntrance();

    // Handed back to the call site's own CSS, which is what keeps
    // `group-hover:scale-[1.015]` and `opacity-60` working on the three card
    // surfaces that own their resting transform/opacity.
    expect(root.style.opacity).toBe('');
    expect(root.style.transform).toBe('');
  });

  it('does not re-run on a re-render with changed props', () => {
    const { container, rerender } = render(
      <HudPanel accent="amber" title="FIRST">
        BODY-ONE
      </HudPanel>,
    );
    expect(scopes).toHaveLength(1);

    // Title, accent and children all change — the three props a caller has
    // reason to update in place. Mount stays the only trigger.
    rerender(
      <HudPanel accent="coral" title="SECOND">
        BODY-TWO
      </HudPanel>,
    );

    expect(scopes).toHaveLength(1);
    expect(mockAnimate).toHaveBeenCalledTimes(1);

    // And the new content is on screen, not deferred behind the entrance.
    expect(container.textContent).toContain('BODY-TWO');
    expect(rootOf(container).style.opacity).toBe('0');
  });

  it('creates no scope and writes no hidden state under reduced motion', () => {
    mockMatchMedia(true);
    const { container } = render(<HudPanel data-testid="p">CONTENT</HudPanel>);
    const root = rootOf(container);

    expect(scopes).toHaveLength(0);
    expect(mockAnimate).not.toHaveBeenCalled();

    // The whole point: the resting state is the plain CSS default, so there is
    // nothing to undo and nothing to be left stuck at `opacity: 0`.
    expect(root.style.opacity).toBe('');
    expect(root.style.transform).toBe('');
    expect(root.style.transition).toBe('');
    expect(container.textContent).toContain('CONTENT');
  });

  it('creates no scope and writes no hidden state without matchMedia (SSR / jsdom)', () => {
    clearMatchMedia();
    const { container } = render(<HudPanel data-testid="p">CONTENT</HudPanel>);
    const root = rootOf(container);

    expect(scopes).toHaveLength(0);
    expect(mockAnimate).not.toHaveBeenCalled();
    expect(root.style.opacity).toBe('');
    expect(container.textContent).toContain('CONTENT');
  });

  it('honours the enter={false} opt-out without touching the node', () => {
    const { container } = render(
      <HudPanel enter={false} data-testid="p">
        CONTENT
      </HudPanel>,
    );
    const root = rootOf(container);

    expect(scopes).toHaveLength(0);
    expect(mockAnimate).not.toHaveBeenCalled();
    expect(root.style.opacity).toBe('');
    expect(root.style.transform).toBe('');
    expect(container.textContent).toContain('CONTENT');
  });

  it('animates opacity and transform only — nothing that triggers layout', () => {
    render(<HudPanel data-testid="p">CONTENT</HudPanel>);

    const params = entranceParams();
    const layoutProps = [
      'height',
      'width',
      'top',
      'left',
      'right',
      'bottom',
      'margin',
      'padding',
      'maxHeight',
      'minHeight',
      'maxWidth',
      'minWidth',
      'fontSize',
      'lineHeight',
      'borderWidth',
      'scale',
      'rotate',
    ];
    for (const prop of layoutProps) {
      expect(params).not.toHaveProperty(prop);
    }

    // The pre-paint write must not smuggle a layout property in either.
    // `baseStyle` is background/border/borderRadius/borderTop, so none of these
    // appear in the style attribute for any other reason.
    const root = document.querySelector('[data-testid="p"]') as HTMLElement;
    const css = root.getAttribute('style') ?? '';
    expect(css).not.toMatch(
      /(^|;)\s*(height|width|top|left|right|bottom|margin|padding)\s*:/,
    );
  });

  it('never gates or delays its children', () => {
    const { container } = render(
      <HudPanel title="HUD" grid>
        CONTENT
      </HudPanel>,
    );

    const root = rootOf(container);
    // Nothing is hidden, made inert, or withheld until the tween completes.
    expect(root.style.visibility).toBe('');
    expect(root.style.pointerEvents).toBe('');
    expect(root.style.height).toBe('');
    expect(root.textContent).toContain('CONTENT');

    // The grid overlay is decorative and inert by design (`pointer-events-none`
    // in the class list, not in the animated style) — asserted here so the
    // entrance cannot be mistaken for permission to touch it.
    const overlay = root.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(overlay.className).toContain('pointer-events-none');
  });

  it('reverts the scope on unmount', () => {
    const { unmount } = render(<HudPanel data-testid="p">CONTENT</HudPanel>);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].revert).not.toHaveBeenCalled();

    unmount();

    expect(scopes[0].revert).toHaveBeenCalledTimes(1);
  });

  it('survives a revert that throws, and still leaves the node clean', () => {
    const { container, unmount } = render(
      <HudPanel data-testid="p">CONTENT</HudPanel>,
    );
    const root = rootOf(container);
    scopes[0].revert.mockImplementationOnce(() => {
      throw new Error('scope root was already detached');
    });

    expect(() => unmount()).not.toThrow();
    expect(scopes[0].revert).toHaveBeenCalledTimes(1);
    // The catch is not an excuse to skip the cleanup: the node still goes back
    // to the call site's CSS.
    expect(root.style.opacity).toBe('');
    expect(root.style.transform).toBe('');
  });

  it('restores the node even if unmount happens before the tween lands', () => {
    const { container, unmount } = render(
      <HudPanel data-testid="p">CONTENT</HudPanel>,
    );
    const root = rootOf(container);
    expect(root.style.opacity).toBe('0');

    // A panel that is torn down mid-entrance (route change, list re-key, a
    // chat sheet closed while a message is streaming) must not leave a
    // half-faded node behind if React ever keeps the DOM around.
    unmount();

    expect(root.style.opacity).toBe('');
    expect(root.style.transform).toBe('');
  });
});
