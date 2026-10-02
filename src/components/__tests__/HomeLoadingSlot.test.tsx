// src/components/__tests__/HomeLoadingSlot.test.tsx
//
// The homepage hero slot had TWO loading affordances under the identical
// `isInitial && isDataLoading` predicate: Homepage's neon `StatBar` trio above
// HeroChat's grey pulse skeleton. Two visual languages in one frame — and the
// StatBars animated toward hardcoded 40/70/20, i.e. invented numbers on a
// progress readout.
//
// This pins the composition with the REAL HeroChat (its children are mocked, so
// the slot's own logic is exercised, not a stand-in): exactly one busy region
// while loading, none of it a StatBar, and none left once the data lands.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';

vi.mock('axios', () => {
  const postMock = vi.fn();
  const getMock = vi.fn(() => Promise.resolve({ data: {} }));
  return {
    __esModule: true,
    default: { post: postMock, get: getMock, isAxiosError: vi.fn(() => false) },
    post: postMock,
    get: getMock,
    isAxiosError: vi.fn(() => false),
  };
});

// Data that never settles on demand: `releaseAll()` flips the page out of the
// loading state without any timer. Every getter gets its own gate, so all five
// must be released — `Promise.all` waits for the slowest.
let gates: Array<() => void> = [];
const releaseAll = () => {
  const open = gates;
  gates = [];
  open.forEach((open1) => open1());
};
vi.mock('../../utils/api', () => {
  const gate = () => new Promise((resolve) => gates.push(() => resolve([])));
  return {
    getPortfolioProfile: vi.fn(gate),
    getPortfolioProjects: vi.fn(gate),
    getPortfolioSkills: vi.fn(gate),
    getPortfolioExperiences: vi.fn(gate),
    getSiteTexts: vi.fn(gate),
  };
});

vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    asPath: '/',
    pathname: '/',
    query: {},
  }),
}));
vi.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement('img', props),
}));

vi.mock('../SEOMeta', () => ({ __esModule: true, default: () => null }));
vi.mock('../home/HudChrome', () => ({ __esModule: true, default: () => null }));
vi.mock('../home/HeroSection', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../home/ChatStream', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../home/ChatModalHost', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('../home/ProjectStrip', () => ({
  ProjectStrip: () => null,
  ProjectInlineDetail: () => null,
}));

vi.mock('animejs', () => ({
  __esModule: true,
  animate: vi.fn(),
  createScope: vi.fn(() => ({ add: vi.fn(), revert: vi.fn() })),
  createTimeline: vi.fn(() => ({ add: vi.fn() })),
  stagger: vi.fn((v: number) => v),
  spring: vi.fn(() => 'spring'),
  createDrawable: vi.fn(() => []),
  splitText: vi.fn(() => ({ chars: [], words: [], revert: vi.fn() })),
  scrambleText: vi.fn(() => 'SCRAMBLE'),
}));

import Homepage from '../Homepage';

const busy = () => document.querySelectorAll('[aria-busy="true"]');
const statBars = () =>
  document.querySelectorAll('[data-testid="stat-bar-fill"]');

describe('homepage hero loading slot', () => {
  beforeEach(() => {
    gates = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts exactly one loading affordance, and it is not a StatBar', async () => {
    const { container } = render(<Homepage />);

    // One affordance, not two stacked visual languages.
    expect(busy()).toHaveLength(1);
    expect(busy()[0]).toHaveAttribute('aria-label', 'Loading profile');

    // `StatBar`'s fill is the DOM signature of the deleted readout. Any bar back
    // in this slot is a fabricated-numbers bar, so it must be absent — and the
    // real component is unmocked here, so the marker cannot be faked away.
    expect(statBars()).toHaveLength(0);

    // Nothing in the slot is advertising a percentage.
    expect(container.textContent ?? '').not.toMatch(/\d+%/);

    // Loading finished → the affordance goes, it is not merely restyled.
    await act(async () => {
      releaseAll();
      await Promise.resolve();
    });
    await waitFor(() => expect(busy()).toHaveLength(0));
    expect(statBars()).toHaveLength(0);
  });
});
