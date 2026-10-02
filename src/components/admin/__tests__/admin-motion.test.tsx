// src/components/admin/__tests__/admin-motion.test.tsx
//
// Animation-contract coverage for the two admin components that call anime.js
// directly. Two defects are pinned here:
//
//   1. REDUCED MOTION. `ConfirmDeleteModal` used to animate unconditionally — it
//      was the only anime.js-calling file in the repo that checked neither
//      `isReducedMotion()` nor `canAnimate()`. The same early-out is asserted for
//      the logout modal inside `AdminLayout`. Both nodes carry Tailwind
//      `opacity-0`, so "no animation ran" is NOT sufficient on its own: the
//      resting value has to be written, or the dialog opens invisible.
//   2. TIMING LITERALS. Every `animate()` call must be sourced from
//      `durations.*` / `easings.*`, never a bare number or a `'outExpo'` string.
//
// The observable that distinguishes an early-out from any other path is that no
// scope was ever created: `createScope` is the first thing the animated path
// does, so `scopes.length === 0` isolates the guard from the animation itself.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import React from 'react';

const { scopes, mockAnimate, mockStagger } = vi.hoisted(() => ({
  scopes: [] as Array<{
    add: (cb: () => void) => unknown;
    revert: ReturnType<typeof vi.fn>;
    matches: Record<string, boolean>;
  }>,
  mockAnimate: vi.fn(),
  mockStagger: vi.fn((v: unknown) => v),
}));

vi.mock('animejs', () => ({
  __esModule: true,
  animate: mockAnimate,
  stagger: mockStagger,
  createScope: vi.fn(() => {
    const scope = {
      add: vi.fn((cb: () => void) => {
        cb();
        return scope;
      }),
      revert: vi.fn(),
      matches: {} as Record<string, boolean>,
    };
    scopes.push(scope);
    return scope;
  }),
}));

vi.mock('../../ui', () => ({
  __esModule: true,
  HudPanel: ({ children, title }: any) =>
    React.createElement('div', { 'data-testid': 'hud-panel', title }, children),
  NeonButton: (props: any) =>
    React.createElement('button', { ...props }, props.children),
  GlitchText: ({ children }: any) =>
    React.createElement('span', null, children),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: any) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: any) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/sudosuperuser-ostaad',
    asPath: '/sudosuperuser-ostaad',
    query: {},
    events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  }),
}));

vi.mock('../../../utils/adminPageGuard', () => ({
  __esModule: true,
  logout: vi.fn(async () => {}),
  clearAdminSession: vi.fn(),
}));

vi.mock('../../../utils/api', () => ({
  __esModule: true,
  getMeetings: vi.fn(async () => []),
}));

import ConfirmDeleteModal from '../ConfirmDeleteModal';
import { AdminLayout } from '../AdminLayout';
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

/** `animate()` calls whose target lives inside an open dialog. */
function dialogAnimations() {
  return mockAnimate.mock.calls.filter(([target]) => {
    const el = target as Element | null;
    return (
      !!el &&
      typeof el.closest === 'function' &&
      !!el.closest('[role="dialog"]')
    );
  });
}

function renderConfirmDelete() {
  return render(
    <ConfirmDeleteModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
  );
}

function renderAdminLayout() {
  return render(
    <AdminLayout user={{ username: 'ostaad', email: null }}>
      <p>panel body</p>
    </AdminLayout>,
  );
}

function openLogoutModal() {
  const utils = renderAdminLayout();
  const button = utils.container.querySelector(
    'button[aria-label="Logout"]',
  ) as HTMLButtonElement;
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  return utils;
}

describe('admin modals — animation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scopes.length = 0;
    mockAnimate.mockClear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    clearMatchMedia();
  });

  // ── ConfirmDeleteModal ─────────────────────────────────────────────────────

  it('ConfirmDeleteModal animates from tokens when motion is allowed', () => {
    renderConfirmDelete();

    // Animate runs; the timing comes from --dur-200 / --dur-300 / --ease-out-expo.
    expect(dialogAnimations().length).toBe(2);
    const [, backdrop] = dialogAnimations()[0];
    const [, panel] = dialogAnimations()[1];
    expect(backdrop.duration).toBe(durations[200] * 1000);
    expect(backdrop.duration).toBe(200);
    expect(backdrop.ease).toBe(easings.outExpo);
    expect(panel.duration).toBe(durations[300] * 1000);
    expect(panel.duration).toBe(300);
    expect(panel.ease).toBe(easings.outExpo);
    expect(scopes.length).toBe(1);
  });

  it('ConfirmDeleteModal creates no scope and animates nothing under reduced motion', () => {
    mockMatchMedia(true);
    const { container } = renderConfirmDelete();

    expect(dialogAnimations()).toHaveLength(0);
    expect(scopes).toHaveLength(0);

    // The dialog must still be legible: `opacity-0` is on both nodes, so the
    // resting value has to be written when the animation is skipped.
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const backdrop = dialog.querySelector('.backdrop-blur-sm') as HTMLElement;
    const panel = dialog.querySelector('.max-w-sm') as HTMLElement;
    expect(backdrop.style.opacity).toBe('1');
    expect(panel.style.opacity).toBe('1');
    expect(dialog.textContent).toContain('DELETE');
    expect(screen.getByTestId('hud-panel').getAttribute('title')).toBe(
      '// CONFIRM_DELETE',
    );
  });

  it('ConfirmDeleteModal also skips motion when matchMedia is unavailable (SSR/jsdom)', () => {
    clearMatchMedia();
    const { container } = renderConfirmDelete();

    expect(scopes).toHaveLength(0);
    expect(dialogAnimations()).toHaveLength(0);
    const backdrop = container.querySelector(
      '.backdrop-blur-sm',
    ) as HTMLElement;
    expect(backdrop.style.opacity).toBe('1');
  });

  it('ConfirmDeleteModal reverts its scope on unmount', () => {
    const { unmount } = renderConfirmDelete();
    const scope = scopes[0];
    unmount();
    expect(scope.revert).toHaveBeenCalledTimes(1);
  });

  it('ConfirmDeleteModal swallows a throwing scope.revert() in cleanup', () => {
    const { unmount } = renderConfirmDelete();
    scopes[0].revert.mockImplementationOnce(() => {
      throw new Error('revert on a detached node');
    });
    expect(() => unmount()).not.toThrow();
  });

  it('ConfirmDeleteModal renders nothing when closed, whatever the motion setting', () => {
    mockMatchMedia(true);
    const { container } = render(
      <ConfirmDeleteModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(scopes).toHaveLength(0);
  });

  // ── AdminLayout logout modal ───────────────────────────────────────────────

  it('AdminLayout logout modal animates from tokens when motion is allowed', () => {
    openLogoutModal();

    const animations = dialogAnimations();
    expect(animations.length).toBe(2);
    const [, backdrop] = animations[0];
    const [, panel] = animations[1];
    expect(backdrop.duration).toBe(durations[200] * 1000);
    expect(panel.duration).toBe(durations[300] * 1000);
    expect(backdrop.ease).toBe(easings.outExpo);
    expect(panel.ease).toBe(easings.outExpo);
  });

  it('AdminLayout logout modal skips motion under reduced motion but stays visible', () => {
    mockMatchMedia(true);
    const { container } = openLogoutModal();

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(dialogAnimations()).toHaveLength(0);
    // The nav entrance scope is the only scope the layout builds, and it is
    // skipped here too — no dialog scope exists.
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const backdrop = dialog.querySelector('.backdrop-blur-sm') as HTMLElement;
    const panel = dialog.querySelector('.max-w-sm') as HTMLElement;
    expect(backdrop.style.opacity).toBe('1');
    expect(panel.style.opacity).toBe('1');
    expect(dialog.textContent).toContain('CONFIRM LOGOUT');
  });

  it('AdminLayout nav entrance uses token-derived duration, ease and stagger', () => {
    renderAdminLayout();

    // The nav entrance targets the whole `.admin-nav-item` NodeList.
    const navCall = mockAnimate.mock.calls.find(([target]) => {
      const list = target as ArrayLike<Element> | null;
      if (!list || typeof list.length !== 'number') return false;
      return (
        list.length > 0 &&
        (list[0] as Element).classList?.contains('admin-nav-item')
      );
    });
    expect(navCall).toBeDefined();
    const [, params] = navCall!;
    expect(params.duration).toBe(durations[300] * 1000);
    expect(params.ease).toBe(easings.outExpo);
    expect(mockStagger).toHaveBeenCalledWith(durations.stagger * 1000, {
      from: 'first',
    });
    expect(scopes).toHaveLength(1);
  });

  it('AdminLayout nav entrance is skipped entirely under reduced motion', () => {
    mockMatchMedia(true);
    renderAdminLayout();
    expect(scopes).toHaveLength(0);
    expect(mockAnimate).not.toHaveBeenCalled();
  });

  it('AdminLayout nav scope revert is wrapped so a throw cannot escape unmount', () => {
    const { unmount } = renderAdminLayout();
    scopes[0].revert.mockImplementationOnce(() => {
      throw new Error('revert on a detached node');
    });
    expect(() => unmount()).not.toThrow();
  });
});
