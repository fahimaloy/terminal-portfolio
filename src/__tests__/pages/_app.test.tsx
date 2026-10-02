// src/__tests__/pages/_app.test.tsx
//
// WHAT THIS PROTECTS
//
// The admin panel is the one route where the WebGL background is mounted at
// zero benefit: every admin root (`min-h-screen bg-bg-void` in AdminLayout,
// `--bg-1` on the login page) is opaque and covers the fixed `z-0` scene
// entirely. `_app.tsx` therefore skips mounting `SceneLayer` and `CursorGlow`
// when `isAdmin` is true, so the admin stops paying for a context, up to 9000
// particles, the floor grid, a `pointermove` listener and a cursor layer.
//
// These assertions fail if that gate is dropped, inverted, hoisted to a
// one-shot-on-mount check, or widened into a second route→scene mapping. They
// also pin the three routes that DO get a scene, so the saving cannot be
// bought by giving the admin its background at the hero's expense.
//
// REVERT
//
// The gate is reversible from a single place, and the last test below is what
// keeps it that way: delete `{!isAdmin && (...)}` in `src/pages/_app.tsx` and
// the `sceneVariant` expression still resolves `isAdmin` to the `blog` variant
// with no other edit. If that expression is ever refactored, the one-place
// revert becomes a two-place one and this file fails loudly.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import type { AppProps } from 'next/app';

// Explicitly typed at module level, and only ever written through
// `setPathname`. An unannotated `let` would narrow to the literal assigned
// inside a test body and stop the router mock below from type-checking.
let pathname: string = '/';

const setPathname = (next: string) => {
  pathname = next;
};

const routerStub = () => ({
  pathname,
  asPath: pathname,
  route: pathname,
  query: {},
  basePath: '',
  isReady: true,
  isFallback: false,
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  reload: vi.fn(),
  back: vi.fn(),
  beforePopState: vi.fn(),
  events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
});

vi.mock('next/router', () => ({
  useRouter: () => routerStub(),
}));

// `next/head` reaches for a `HeadManagerContext` that only exists inside a real
// Next runtime. Rendering the children inline is the usual stand-in.
vi.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => (
    <React.Fragment>{children}</React.Fragment>
  ),
}));

// The claim under test is whether these mount at all, not what they draw, so
// both are replaced with testid probes. Rendering the real SceneLayer here
// would only ever tell us the canvas exists — the thing we assert should NOT
// happen.
vi.mock('../../components/scene/SceneLayer', () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => (
    <div data-testid="scene-layer" data-variant={variant} />
  ),
}));

vi.mock('../../components/ui/CursorGlow', () => ({
  __esModule: true,
  default: () => <div data-testid="cursor-glow" />,
}));

// The splash is the one thing `_app.tsx` mounts only on `/`, and it reads
// `window.matchMedia`, which this jsdom harness does not provide — it threw and
// the surrounding `ErrorBoundary` replaced the whole tree, including the scene
// we are asserting on. Stub the component, keep every real export, so the boot
// gate in `_app.tsx` still runs unchanged against the real event name and
// attribute name.
vi.mock('../../components/ui/BootSequence', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../components/ui/BootSequence')>();
  return { ...actual, default: () => null };
});

import App from '../../pages/_app';

const appAt = (p: string): React.ReactElement => {
  setPathname(p);
  return (
    <App
      Component={() => <div data-testid="page-content" />}
      pageProps={{}}
      router={routerStub() as unknown as AppProps['router']}
    />
  );
};

const renderAt = (p: string) => render(appAt(p));

const scene = () => screen.queryByTestId('scene-layer');
const cursorGlow = () => screen.queryByTestId('cursor-glow');

afterEach(() => {
  cleanup();
  setPathname('/');
});

describe('scene mount gate', () => {
  it.each([
    '/sudosuperuser-ostaad',
    '/sudosuperuser-ostaad/login',
    '/sudosuperuser-ostaad/skills',
    '/sudosuperuser-ostaad/blogs',
    '/sudosuperuser-ostaad/blogs/1a2b3c',
  ])('mounts no scene and no cursor glow on %s', (p) => {
    renderAt(p);
    // The page content still renders: the gate scopes to the background and
    // must not short-circuit the tree around it.
    expect(screen.getByTestId('page-content')).toBeTruthy();
    expect(scene()).toBeNull();
    expect(cursorGlow()).toBeNull();
  });

  it('leaves the hero scene untouched on /', () => {
    renderAt('/');
    expect(scene()?.getAttribute('data-variant')).toBe('hero');
    expect(cursorGlow()).not.toBeNull();
  });

  it('leaves the blog scene untouched on /blog', () => {
    renderAt('/blog');
    expect(scene()?.getAttribute('data-variant')).toBe('blog');
    expect(cursorGlow()).not.toBeNull();
  });

  it('leaves the blog scene untouched on a nested blog slug', () => {
    renderAt('/blog/some-slug');
    expect(scene()?.getAttribute('data-variant')).toBe('blog');
  });

  it('still switches hero to chat on the chat-mode event', () => {
    renderAt('/');
    expect(scene()?.getAttribute('data-variant')).toBe('hero');
    act(() => {
      window.dispatchEvent(
        new CustomEvent('portfolio:chat-mode', { detail: { open: true } }),
      );
    });
    expect(scene()?.getAttribute('data-variant')).toBe('chat');
  });

  it('re-evaluates the gate on every render, not once per mount', () => {
    // The failure this catches is a gate captured on first render, which would
    // leave the scene mounted for anyone who reached the admin by a
    // client-side navigation instead of a fresh load.
    const view = render(appAt('/sudosuperuser-ostaad/skills'));
    expect(scene()).toBeNull();
    view.rerender(appAt('/'));
    expect(scene()?.getAttribute('data-variant')).toBe('hero');
    expect(cursorGlow()).not.toBeNull();
  });

  it('keeps the admin term in sceneVariant so the gate is a one-place revert', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/_app.tsx'),
      'utf8',
    );
    // While the gate exists the admin's variant is unobservable — there is no
    // SceneLayer to read a `variant` prop from. This is the only place that can
    // notice a refactor of `sceneVariant` quietly turning the one-place revert
    // into a two-place one.
    expect(source).toMatch(/isAdmin\s*\|\|\s*isBlog\s*\?\s*'blog'/);
  });
});
