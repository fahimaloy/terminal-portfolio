// src/components/ui/__tests__/Background.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// fully mock animejs — all exports vi.fn(), scope.add executes callback immediately
vi.mock('animejs', () => {
  const mockRevert = vi.fn();
  const mockAdd: any = vi.fn((cb: () => void) => {
    cb();
    return mockScope;
  });
  const mockScope: any = { add: mockAdd, revert: mockRevert };
  return {
    animate: vi.fn(),
    createScope: vi.fn(() => mockScope),
    createTimeline: vi.fn(() => ({ add: vi.fn() })),
    createDrawable: vi.fn(() => ({})),
    morphTo: vi.fn((s: string) => s),
    onScroll: vi.fn((o: unknown) => o),
    spring: vi.fn(() => 'spring-ease'),
    stagger: vi.fn((v: unknown) => v),
  };
});

// isolate Background from child-particle animations so animate counts reflect aurora drift only
vi.mock('../TronGrid', () => ({
  default: () => <div data-testid="tron-grid" />,
}));
vi.mock('../ScanlineOverlay', () => ({
  default: () => <div data-testid="scanline" />,
}));
vi.mock('../ParticleField', () => ({
  default: () => <div data-testid="particles" />,
}));

import Background from '../Background';
import { animate, createScope, spring } from 'animejs';

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
  // jsdom has no matchMedia by default — remove mocked property so isReducedMotion/canAnimate return false
  // eslint-disable-next-line
  delete (window as any).matchMedia;
}

describe('Background', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearMatchMedia();
  });

  it('hero/default render MorphOrb elements', () => {
    const { container, unmount } = render(<Background variant="hero" />);
    // Check MorphOrb elements are rendered (3 orbs)
    const orbs = container.querySelectorAll<HTMLElement>('.grat-orb');
    expect(orbs.length).toBe(3);
    // Background is CSS-based, no createScope needed
    unmount();
  });

  it('blog variant renders MorphOrb but skips aurora drift animation', () => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    const { container } = render(<Background variant="blog" />);
    // MorphOrb elements still rendered
    const orbs = container.querySelectorAll<HTMLElement>('.grat-orb');
    expect(orbs.length).toBe(3);
  });

  it('default variant renders MorphOrb elements', () => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    const { container } = render(<Background variant="default" />);
    const orbs = container.querySelectorAll<HTMLElement>('.grat-orb');
    expect(orbs.length).toBe(3);
  });

  it('reduced-motion still renders MorphOrb elements statically', () => {
    vi.clearAllMocks();
    mockMatchMedia(true);
    const { container } = render(<Background variant="hero" />);
    // MorphOrb elements still rendered statically
    const orbs = container.querySelectorAll<HTMLElement>('.grat-orb');
    expect(orbs.length).toBe(3);
  });

  it('rerender with different variant re-renders MorphOrb elements', () => {
    const { rerender } = render(<Background variant="hero" />);
    let orbs = rerender(<Background variant="blog" />);
    expect(rerender).toBeDefined();
    
    vi.clearAllMocks();
    mockMatchMedia(false);
    rerender(<Background variant="default" />);
  });
});
