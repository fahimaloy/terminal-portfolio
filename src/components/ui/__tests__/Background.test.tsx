// src/components/ui/__tests__/Background.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// fully mock animejs — all exports vi.fn(), scope.add executes callback immediately
vi.mock('animejs', () => {
  const scope = {
    add: (callback: () => void) => {
      callback();
    },
    revert: vi.fn(),
  };
  return {
    animate: vi.fn(),
    createScope: vi.fn(() => scope),
    createTimeline: vi.fn(() => ({ add: vi.fn() })),
    createDrawable: vi.fn(() => ({})),
    morphTo: vi.fn((s: string) => s),
    onScroll: vi.fn((options: unknown) => options),
    spring: vi.fn(() => 'spring-ease'),
    stagger: vi.fn((value: unknown) => value),
  };
});

// The aurora primitive supplies the background layer; expose only the
// selector contract consumed by Background, not its internal markup.
vi.mock('../graphics/primitives/AuroraMesh', () => ({
  default: () => <div className="bg-aurora-layer" />,
}));

import Background from '../Background';
import { animate, createScope, onScroll } from 'animejs';

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
  // jsdom has no matchMedia by default — remove the mocked property.
  Reflect.deleteProperty(window, 'matchMedia');
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

  it('configures every scroll animation with the current background targets', () => {
    // Arrange + Act: render with motion enabled so the scope queries the current markup.
    const { container } = render(<Background variant="hero" />);
    const root = container.firstElementChild as HTMLElement;
    const grid = root.querySelector<HTMLElement>('.bg-grid-lattice');
    const scrollCalls = (onScroll as unknown as ReturnType<typeof vi.fn>).mock
      .calls as Array<[Record<string, unknown>]>;

    // Assert: particles, grid, aurora, and orbs use the default document
    // scroll container; only the grid uses its own element as the trigger target.
    expect(grid).not.toBeNull();
    expect(scrollCalls.map(([options]) => options)).toEqual([
      { sync: true, target: root },
      { sync: false, target: grid },
      { sync: true, target: root },
      { sync: true, target: root },
    ]);
  });

  it('reduced-motion still renders MorphOrb elements without scroll animations', () => {
    // Arrange
    mockMatchMedia(true);

    // Act
    const { container } = render(<Background variant="hero" />);

    // Assert
    expect(container.querySelectorAll('.grat-orb')).toHaveLength(3);
    expect(createScope).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
    expect(onScroll).not.toHaveBeenCalled();
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

  it('rerender with different variant re-renders MorphOrb elements', () => {
    const { container, rerender } = render(<Background variant="hero" />);
    rerender(<Background variant="blog" />);
    expect(container.querySelectorAll('.grat-orb')).toHaveLength(3);

    vi.clearAllMocks();
    mockMatchMedia(false);
    rerender(<Background variant="default" />);
  });
});
