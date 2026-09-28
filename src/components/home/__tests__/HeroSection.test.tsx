// src/components/home/__tests__/HeroSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('animejs', () => {
  const scope = {
    add: vi.fn((...args: unknown[]) => {
      const callback = args.find(
        (arg): arg is () => void => typeof arg === 'function',
      );
      callback?.();
      return scope;
    }),
    revert: vi.fn(),
  };

  return {
    __esModule: true,
    animate: vi.fn(),
    createScope: vi.fn(() => scope),
    createTimeline: vi.fn(() => ({ add: vi.fn() })),
    createDrawable: vi.fn(() => []),
    splitText: vi.fn(() => ({ chars: [], words: [], revert: vi.fn() })),
    spring: vi.fn(() => 'spring-ease'),
    stagger: vi.fn((value: unknown) => value),
  };
});

import HeroSection from '../HeroSection';
import { createScope } from 'animejs';

const mockedCreateScope = vi.mocked(createScope);

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
  Reflect.deleteProperty(window, 'matchMedia');
}

const noop = vi.fn();

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearMatchMedia();
  });

  // Regression guard: the quick cards were invisible because they carried a
  // Tailwind `opacity-0` class that survived every scope.revert(). If an
  // animated node ever regains a hiding class, this fails.
  it('never hides animated nodes with a utility opacity class', () => {
    const { container } = render(
      <HeroSection
        profile={null}
        siteTexts={{}}
        projectCount={0}
        skillCount={0}
        expCount={0}
        onSend={noop}
      />,
    );

    const animated = container.querySelectorAll(
      '[data-hero="label"], [data-hero="name"], [data-hero="title"], ' +
        '[data-hero="stats"] > div, [data-hero="card"]',
    );
    expect(animated.length).toBeGreaterThan(0);
    animated.forEach((el) => {
      const hiding = Array.from(el.classList).filter((c) =>
        /^opacity-\d+$/.test(c),
      );
      expect(hiding).toEqual([]);
    });
  });

  it('renders six quick-command cards and three stats', () => {
    const { container } = render(
      <HeroSection
        profile={null}
        siteTexts={{}}
        projectCount={4}
        skillCount={12}
        expCount={3}
        onSend={noop}
      />,
    );
    expect(container.querySelectorAll('[data-hero="card"]')).toHaveLength(6);
    expect(
      container.querySelectorAll('[data-hero="stats"] > div'),
    ).toHaveLength(3);
  });

  it('reverts its scope on unmount', () => {
    const { unmount } = render(
      <HeroSection
        profile={null}
        siteTexts={{}}
        projectCount={0}
        skillCount={0}
        expCount={0}
        onSend={noop}
      />,
    );
    const scope = mockedCreateScope.mock.results[0].value as {
      revert: ReturnType<typeof vi.fn>;
    };
    unmount();
    expect(scope.revert).toHaveBeenCalledTimes(1);
  });
});
