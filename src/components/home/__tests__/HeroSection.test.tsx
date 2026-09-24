// src/components/home/__tests__/HeroSection.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

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
    onScroll: vi.fn((options: unknown) => options),
    splitText: vi.fn(() => ({ chars: [], words: [], revert: vi.fn() })),
    spring: vi.fn(() => 'spring-ease'),
    stagger: vi.fn((value: unknown) => value),
  };
});

import HeroSection from '../HeroSection';
import { createScope, onScroll } from 'animejs';

const mockedCreateScope = vi.mocked(createScope);
const mockedOnScroll = vi.mocked(onScroll);

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

describe('HeroSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearMatchMedia();
  });

  it('uses the default document scroll container for stats and cleans up its scope', () => {
    const { container, unmount } = render(
      <HeroSection
        profile={null}
        projects={[]}
        skills={[]}
        experiences={[]}
        siteTexts={{}}
        projectCount={0}
        skillCount={0}
        expCount={0}
        onSend={vi.fn()}
        onOpenChat={vi.fn()}
      />,
    );

    const statEls = container.querySelectorAll('[data-hero="stats"] > div');
    expect(statEls).toHaveLength(3);
    expect(mockedOnScroll).toHaveBeenCalledTimes(3);
    expect(mockedOnScroll.mock.calls.map(([options]) => options)).toEqual([
      { sync: false },
      { sync: false },
      { sync: false },
    ]);

    const scope = mockedCreateScope.mock.results[0].value as {
      revert: ReturnType<typeof vi.fn>;
    };
    unmount();
    expect(scope.revert).toHaveBeenCalledTimes(1);
  });
});
