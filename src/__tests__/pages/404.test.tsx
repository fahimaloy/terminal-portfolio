// src/__tests__/pages/404.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';

const {
  pushMock,
  backMock,
  mockRevert404,
  mockTlAdd404,
  mockSplitterRevert404,
  mockStaggerFn,
  mockScrambleFn,
  // Every `createTimeline` params object, so a test can find the *exit*
  // timeline specifically (the entrance timeline passes no `onComplete`) and
  // fire its completion callback on demand.
  timelineParams404,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  mockRevert404: vi.fn(),
  mockTlAdd404: vi.fn(),
  mockSplitterRevert404: vi.fn(),
  mockStaggerFn: vi.fn((v: unknown) => v as any),
  mockScrambleFn: vi.fn(() => 'SCRAMBLE'),
  timelineParams404: [] as Array<Record<string, unknown> | undefined>,
}));

// mock next/router
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
    back: backMock,
    asPath: '/missing-page',
    pathname: '/404',
    query: {},
  })),
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
    // Spread everything, the way the real NeonButton does (it forwards
    // `...rest` onto the button element). An earlier version of this mock
    // passed only `onClick` and `className`, which silently swallowed the
    // `data-notfound-anim` marker the reduced-motion branch queries on.
    return React.createElement('button', { ...props }, props.children);
  },
  StatBar: () => {
    const React = require('react');
    return React.createElement('div', null);
  },
}));

vi.mock('animejs', () => {
  const mockScope: any = {
    // `matches` mirrors the real scope: `execute()` recomputes it from the
    // MediaQueryList, so the production code's live re-check reads it.
    matches: {} as Record<string, boolean>,
    add: vi.fn((cb: () => void) => {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mockScope.matches = { reduceMotion: mql.matches };
      cb();
      return mockScope;
    }),
    revert: mockRevert404,
  };
  return {
    __esModule: true,
    createScope: vi.fn(() => mockScope),
    createTimeline: vi.fn((params?: Record<string, unknown>) => {
      timelineParams404.push(params);
      return { add: mockTlAdd404 } as any;
    }),
    stagger: mockStaggerFn,
    createDrawable: vi.fn(() => [] as any),
    spring: vi.fn(() => 'spring-ease' as any),
    splitText: vi.fn(
      () =>
        ({
          chars: [{ style: {} }],
          words: [{ style: {} }],
          revert: mockSplitterRevert404,
        }) as any,
    ),
    scrambleText: mockScrambleFn,
    animate: vi.fn(),
  };
});

import NotFoundPage from '../../pages/404';
import {
  createScope,
  createTimeline,
  stagger,
  splitText,
  scrambleText,
  createDrawable,
  spring,
  animate,
} from 'animejs';

const mockedCreateScope = vi.mocked(createScope);
const mockedStagger = vi.mocked(stagger);
const mockedScrambleText = vi.mocked(scrambleText);

// Button copy is public and frozen — the tests read it rather than restating it.
const HOME_LABEL = 'RETURN TO ROOT';
const BACK_LABEL = 'GO BACK';

const TARGET_MSG =
  "THE PAGE YOU'RE LOOKING FOR ISN'T IN THE LOCAL NETWORK. THE ROUTE MAY HAVE BEEN DECOMMISSIONED OR NEVER EXISTED.";

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
  // eslint-disable-next-line
  delete (window as any).matchMedia;
}

/** The exit timeline is the one built with an `onComplete`. */
function exitTimelines() {
  return timelineParams404.filter(
    (p): p is Record<string, unknown> =>
      !!p && typeof p.onComplete === 'function',
  );
}

function fireExitTimeline() {
  const tls = exitTimelines();
  expect(tls.length).toBeGreaterThan(0);
  (tls[tls.length - 1].onComplete as () => void)();
}

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    timelineParams404.length = 0;
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
    const scrambleArg = mockedScrambleText.mock.calls[0][0] as any;
    expect(scrambleArg.text).toBe(TARGET_MSG);
    expect(mockedStagger).toHaveBeenCalled();
    expect(vi.mocked(animate)).not.toHaveBeenCalled();
  });

  it('reduced-motion: subtitle textContent equals targetMsg literal, diag/button opacity 1 transform none, split artifacts cleared', async () => {
    mockMatchMedia(true);
    const { container } = render(<NotFoundPage />);

    const found = Array.from(container.querySelectorAll('*')).find(
      (el) => el.textContent === TARGET_MSG,
    );
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

    const headers = container.querySelectorAll<HTMLElement>(
      '[data-notfound="404"], [data-notfound="signal"], [data-notfound="notfound"]',
    );
    expect(headers.length).toBeGreaterThan(0);
    headers.forEach((el) => {
      expect(el.style.opacity).toBe('1');
      expect(el.style.transform).toBe('none');
    });

    const splitSpans = container.querySelectorAll<HTMLElement>(
      '[data-notfound="404"] span, [data-notfound="signal"] span, [data-notfound="notfound"] span',
    );
    splitSpans.forEach((el) => {
      expect(el.style.opacity).toBe('1');
      expect(el.style.transform).toBe('none');
    });

    const bracketStrokes = container.querySelectorAll<HTMLElement>(
      '.notfound-bracket [data-graphic="grat-stroke"]',
    );
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

  // ── Pre-navigation exit ────────────────────────────────────────────────────

  it('reduced motion: clicking GO HOME navigates immediately, no exit timeline', () => {
    mockMatchMedia(true);
    const { getByText } = render(<NotFoundPage />);

    fireEvent.click(getByText(HOME_LABEL) as HTMLElement);
    // Same tick as the click — no scope built, no timeline to wait on.
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
    expect(exitTimelines()).toHaveLength(0);
    // The entrance scope is skipped under reduced motion, so this is the
    // total: the nav path must not build one either.
    expect(mockedCreateScope).not.toHaveBeenCalled();
  });

  it('normal motion: navigation is deferred until the exit timeline completes', () => {
    const { getByText } = render(<NotFoundPage />);
    const before = exitTimelines().length;

    fireEvent.click(getByText(HOME_LABEL) as HTMLElement);

    // An exit timeline now exists...
    expect(exitTimelines().length).toBe(before + 1);
    // ...and navigation has NOT happened yet.
    expect(pushMock).not.toHaveBeenCalled();

    fireExitTimeline();
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('the exit only animates the page root: opacity and transform, no layout props', () => {
    const { container, getByText } = render(<NotFoundPage />);
    const root = container.firstElementChild as HTMLElement;

    fireEvent.click(getByText(HOME_LABEL) as HTMLElement);

    const calls = mockTlAdd404.mock.calls as any[];
    const exitCall = calls[calls.length - 1];
    expect(exitCall[0]).toBe(root);
    const params = exitCall[1];
    expect(Object.keys(params).sort()).toEqual(
      expect.arrayContaining(['opacity', 'y', 'duration', 'ease']),
    );
    // Nothing that would force layout during the navigation.
    expect(params).not.toHaveProperty('height');
    expect(params).not.toHaveProperty('top');
    expect(params).not.toHaveProperty('margin');
    expect(params).not.toHaveProperty('maxHeight');
  });

  it('deadline backstop navigates when onComplete never arrives', () => {
    vi.useFakeTimers();
    try {
      const { getByText } = render(<NotFoundPage />);
      fireEvent.click(getByText(HOME_LABEL) as HTMLElement);
      expect(pushMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/');
    } finally {
      vi.useRealTimers();
    }
  });

  it('double click pushes once', () => {
    const { getByText } = render(<NotFoundPage />);
    const btn = getByText(HOME_LABEL) as HTMLElement;
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    // Exactly one exit, not three stacked exits racing to push.
    expect(exitTimelines()).toHaveLength(1);
    expect(pushMock).not.toHaveBeenCalled();
    fireExitTimeline();
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('the completion callback and the deadline both firing still pushes once', () => {
    vi.useFakeTimers();
    try {
      const { getByText } = render(<NotFoundPage />);
      fireEvent.click(getByText(HOME_LABEL) as HTMLElement);
      // onComplete wins the race...
      fireExitTimeline();
      expect(pushMock).toHaveBeenCalledTimes(1);
      // ...and the deadline, if it survives, must be inert.
      vi.advanceTimersByTime(5000);
      expect(pushMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('if the router call itself throws, the deadline does not retry the navigation', () => {
    // `fire()` marks itself fired *before* running the navigation, so a throw
    // from `router.push` cannot be re-entered by the deadline backstop into a
    // second push.
    vi.useFakeTimers();
    try {
      const { getByText } = render(<NotFoundPage />);
      pushMock.mockImplementation(() => {
        throw new Error('router exploded');
      });

      act(() => {
        try {
          fireEvent.click(getByText(HOME_LABEL) as HTMLElement);
          fireExitTimeline();
        } catch {
          // the throw escaping onComplete is not the point of this test
        }
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
    } finally {
      pushMock.mockReset();
      vi.useRealTimers();
    }
  });

  it('a reduce-motion flip between the click and the scope callback still navigates with no exit', () => {
    // The window anime's `execute()` re-reads the MediaQueryList. This simulates
    // the visitor toggling reduced motion *during* the click tick: Path 1's
    // guard already said "animate", but by the time the scope callback runs the
    // media query says reduce. Navigation must not be stranded behind an exit
    // nobody can watch.
    vi.useFakeTimers();
    try {
      const { getByText } = render(<NotFoundPage />);
      vi.mocked(createScope).mockImplementationOnce(() => {
        const scope: any = {
          matches: {} as Record<string, boolean>,
          add: (cb: () => void) => {
            // `execute()` recomputes `matches` from the live MediaQueryList.
            scope.matches = { reduceMotion: true };
            cb();
            return scope;
          },
          revert: vi.fn(),
        };
        return scope as never;
      });
      fireEvent.click(getByText(HOME_LABEL) as HTMLElement);
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(exitTimelines()).toHaveLength(0);

      // The deadline is armed *after* the scope callback returns, so it is the
      // only thing standing between the already-fired navigation and a second
      // push — `fire()`'s idempotence guard is what makes it inert.
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('the second button (go back) also defers then navigates via router.back', () => {
    const { getByText } = render(<NotFoundPage />);
    const backBtn = getByText(BACK_LABEL) as HTMLElement;
    fireEvent.click(backBtn);
    expect(backMock).not.toHaveBeenCalled();
    fireExitTimeline();
    expect(backMock).toHaveBeenCalledTimes(1);
  });

  it('a throwing exit still navigates — the button is never stranded', () => {
    const { getByText } = render(<NotFoundPage />);
    // Swap the scope only after mount, so the entrance scope is unaffected and
    // the throw happens on the exit path only.
    vi.mocked(createScope).mockImplementationOnce(
      () =>
        ({
          add: () => {
            throw new Error('anime exploded');
          },
          revert: vi.fn(),
          matches: {},
        }) as never,
    );
    fireEvent.click(getByText(HOME_LABEL) as HTMLElement);
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('reduced motion switched on between mount and click still navigates, with no exit timeline', () => {
    const { getByText } = render(<NotFoundPage />);
    expect(exitTimelines()).toHaveLength(0);
    const scopesAtMount = mockedCreateScope.mock.calls.length;

    mockMatchMedia(true); // visitor opts in after the page rendered
    fireEvent.click(getByText(HOME_LABEL) as HTMLElement);

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
    // The Path-1 guard reads matchMedia at click time, so it short-circuits
    // before a scope or timeline is ever built.
    expect(exitTimelines()).toHaveLength(0);
    expect(mockedCreateScope.mock.calls.length).toBe(scopesAtMount);
  });

  it('unmount clears the pending deadline so no second navigation is pushed', () => {
    vi.useFakeTimers();
    try {
      const { getByText, unmount } = render(<NotFoundPage />);
      fireEvent.click(getByText(HOME_LABEL) as HTMLElement);
      fireExitTimeline();
      expect(pushMock).toHaveBeenCalledTimes(1);

      unmount();
      vi.advanceTimersByTime(5000);
      expect(pushMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
