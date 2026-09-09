// src/pages/__tests__/404.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

const { pushMock, backMock, mockRevert404, mockTlAdd404, mockSplitterRevert404, mockStaggerFn, mockScrambleFn } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  mockRevert404: vi.fn(),
  mockTlAdd404: vi.fn(),
  mockSplitterRevert404: vi.fn(),
  mockStaggerFn: vi.fn((v: unknown) => v as any),
  mockScrambleFn: vi.fn(() => 'SCRAMBLE'),
}));

// mock next/router
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({ push: pushMock, back: backMock, asPath: '/missing-page', pathname: '/404', query: {} })),
}));

// mock next/head
vi.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

// mock primitives
vi.mock('../../components/ui/graphics/primitives/MorphOrb', () => ({
  __esModule: true,
  default: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'morph-orb' });
  },
}));
vi.mock('../../components/ui/graphics/primitives/Bracket', () => ({
  __esModule: true,
  default: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'bracket' });
  },
}));
vi.mock('../../components/ui', () => ({
  HudPanel: (props: any) => {
    const React = require('react');
    return React.createElement('div', null, props.title, props.children);
  },
  NeonButton: (props: any) => {
    const React = require('react');
    return React.createElement('button', { onClick: props.onClick, className: props.className }, props.children);
  },
  StatBar: () => {
    const React = require('react');
    return React.createElement('div', null);
  },
}));

vi.mock('animejs', () => {
  const mockScope: any = {
    add: vi.fn((cb: () => void) => {
      cb();
      return mockScope;
    }),
    revert: mockRevert404,
  };
  return {
    __esModule: true,
    createScope: vi.fn(() => mockScope),
    createTimeline: vi.fn(() => ({ add: mockTlAdd404 } as any)),
    stagger: mockStaggerFn,
    createDrawable: vi.fn(() => [] as any),
    spring: vi.fn(() => 'spring-ease' as any),
    splitText: vi.fn(() => ({ chars: [{ style: {} }], words: [{ style: {} }], revert: mockSplitterRevert404 } as any)),
    scrambleText: mockScrambleFn,
    animate: vi.fn(),
  };
});

import NotFoundPage from '../404';
import { createScope, createTimeline, stagger, splitText, scrambleText, createDrawable, spring, animate } from 'animejs';

const mockedCreateScope = vi.mocked(createScope);
const mockedStagger = vi.mocked(stagger);
const mockedScrambleText = vi.mocked(scrambleText);

const TARGET_MSG =
  "THE PAGE YOU'RE LOOKING FOR ISN'T IN THE LOCAL NETWORK. THE ROUTE MAY HAVE BEEN DECOMMISSIONED OR NEVER EXISTED.";

function mockMatchMedia(reduceMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reduceMatches : false,
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

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    clearMatchMedia();
    vi.clearAllMocks();
  });

  it('normal motion: createTimeline.add called for scrambleText with innerHTML', async () => {
    render(<NotFoundPage />);
    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
    const calls = mockTlAdd404.mock.calls as any[];
    expect(calls.length).toBeGreaterThan(0);
    const scrambleCall = calls.find((c) => {
      const args = c[1] as any;
      return args && typeof args.innerHTML !== 'undefined';
    });
    expect(scrambleCall).toBeDefined();
    const inner = (scrambleCall![1] as any).innerHTML;
    expect(inner).toBe('SCRAMBLE');
    expect(mockedScrambleText).toHaveBeenCalled();
    const scrambleArg = (mockedScrambleText.mock.calls[0][0] as any);
    expect(scrambleArg.text).toBe(TARGET_MSG);
    expect(mockedStagger).toHaveBeenCalled();
    expect(vi.mocked(animate)).not.toHaveBeenCalled();
  });

  it('reduced-motion: subtitle textContent equals targetMsg literal, diag/button opacity 1 transform none, split artifacts cleared', async () => {
    mockMatchMedia(true);
    const { container } = render(<NotFoundPage />);

    const found = Array.from(container.querySelectorAll('*')).find(el => el.textContent === TARGET_MSG);
    expect(found).toBeTruthy();
    expect(found!.textContent).toBe(TARGET_MSG);

    const diagItems = container.querySelectorAll<HTMLElement>('.diag-item');
    expect(diagItems.length).toBeGreaterThan(0);
    diagItems.forEach((el) => {
      expect(el.style.opacity).toBe('1');
      expect(el.style.transform).toBe('none');
    });
    const btns = container.querySelectorAll<HTMLElement>('.notfound-btn');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach((el) => {
      expect(el.style.opacity).toBe('1');
      expect(el.style.transform).toBe('none');
    });

    const headers = container.querySelectorAll<HTMLElement>('[data-notfound="404"], [data-notfound="signal"], [data-notfound="notfound"]');
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((el) => {
      expect(el.style.opacity).toBe('1');
      expect(el.style.transform).toBe('none');
    });

    const splitSpans = container.querySelectorAll<HTMLElement>(
      '[data-notfound="404"] span, [data-notfound="signal"] span, [data-notfound="notfound"] span'
    );
    splitSpans.forEach((el) => {
      expect(el.style.opacity).toBe('1');
      expect(el.style.transform).toBe('none');
    });

    const bracketStrokes = container.querySelectorAll<HTMLElement>('.notfound-bracket [data-graphic="grat-stroke"]');
    bracketStrokes.forEach((el) => {
      expect((el as unknown as HTMLElement).style.opacity).toBe('1');
    });

    expect(mockedCreateScope).not.toHaveBeenCalled();
    expect(mockTlAdd404).not.toHaveBeenCalled();
  });

  it('reduced-motion does not call scrambleText timeline path', () => {
    mockMatchMedia(true);
    render(<NotFoundPage />);
    expect(mockedScrambleText).not.toHaveBeenCalled();
    expect(mockTlAdd404).not.toHaveBeenCalled();
  });

  it('unmount cleans up splitters and scope via revert', () => {
    const { unmount } = render(<NotFoundPage />);
    expect(mockedCreateScope).toHaveBeenCalled();
    unmount();
    expect(mockRevert404).toHaveBeenCalled();
  });

  it('renders 404 heading and diagnostic structure', () => {
    const { container } = render(<NotFoundPage />);
    expect(container.textContent).toContain('404');
    expect(container.textContent).toContain('SIGNAL_LOST');
    expect(container.textContent).toContain('DIAGNOSTIC_LOG');
  });
});
