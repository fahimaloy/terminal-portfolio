// src/components/home/__tests__/ChatInputBar.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('animejs', () => ({
  createScope: vi.fn(() => {
    const scope: any = {};
    scope.revert = vi.fn();
    scope.add = vi.fn((cb: () => void) => {
      cb();
      return scope;
    });
    return scope;
  }),
  animate: vi.fn(),
  spring: vi.fn(() => 'spring-ease'),
  stagger: vi.fn(() => 0),
  createTimeline: vi.fn(() => ({ add: vi.fn() })),
}));

vi.mock('react-icons/fi', () => {
  const ReactMod = require('react');
  return {
    FiSend: (props: any) =>
      ReactMod.createElement('svg', { 'data-testid': 'fi-send', ...props }),
    FiRotateCcw: (props: any) =>
      ReactMod.createElement('svg', { 'data-testid': 'fi-rotate', ...props }),
  };
});

import ChatInputBar from '../ChatInputBar';
import { animate, createScope, spring } from 'animejs';

const mockedAnimate = vi.mocked(animate);
const mockedCreateScope = vi.mocked(createScope);
const mockedSpring = vi.mocked(spring);

function getSendButton(container: HTMLElement): HTMLElement {
  // wrap div has role=button and contains SEND text via descendant button,
  // so getByRole(/SEND/i) matches both wrap and button. Use DOM query for the real <button>.
  const candidates = Array.from(
    container.querySelectorAll('button'),
  ) as HTMLElement[];
  const found = candidates.find((b) => b.textContent?.includes('SEND'));
  if (!found) throw new Error('SEND button not found');
  return found;
}

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

describe('ChatInputBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearMatchMedia();
  });

  it('createScope called on mount (gated by !isReducedMotion)', () => {
    const onInputChange = vi.fn();
    const onSend = vi.fn();
    const onOpen = vi.fn();
    const onReset = vi.fn();
    render(
      <ChatInputBar
        input=""
        onInputChange={onInputChange}
        onSend={onSend}
        onOpen={onOpen}
        onReset={onReset}
        showClear={false}
      />,
    );
    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
    expect(mockedCreateScope).toHaveBeenCalledWith(
      expect.objectContaining({ root: expect.any(Object) }),
    );
  });

  it('focus on wrap triggers scope.add -> animate with var(--border-strong); blur -> var(--border-subtle)', () => {
    const onOpen = vi.fn();
    const { container } = render(
      <ChatInputBar
        input=""
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onOpen={onOpen}
        onReset={vi.fn()}
        showClear={false}
      />,
    );
    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
    const scope = mockedCreateScope.mock.results[0].value as {
      add: ReturnType<typeof vi.fn>;
      revert: ReturnType<typeof vi.fn>;
    };

    const wrap = container.querySelector('[role="button"]') as HTMLElement;
    expect(wrap).not.toBeNull();

    vi.clearAllMocks();
    fireEvent.focus(wrap);

    expect(scope.add).toHaveBeenCalledTimes(1);
    expect(mockedAnimate).toHaveBeenCalledTimes(1);
    const firstCallArgs = mockedAnimate.mock.calls[0];
    const firstTarget = firstCallArgs[0] as HTMLElement;
    const firstParams = firstCallArgs[1] as Record<string, unknown>;
    expect(firstTarget).toBe(wrap);
    expect(firstParams.borderColor).toBe('var(--border-strong)');
    expect(String(firstParams.boxShadow)).toContain('var(--border-strong)');
    expect(String(firstParams.boxShadow)).toContain('var(--glow-cyan-sm)');

    vi.clearAllMocks();
    fireEvent.blur(wrap);
    expect(scope.add).toHaveBeenCalledTimes(1);
    expect(mockedAnimate).toHaveBeenCalledTimes(1);
    const blurParams = mockedAnimate.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(blurParams.borderColor).toBe('var(--border-subtle)');
    expect(String(blurParams.boxShadow)).toContain('0 0 0 0');
  });

  it('pressDown pressUp via scope.add: scale 0.96 and scale 1', () => {
    const { container } = render(
      <ChatInputBar
        input=""
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onOpen={vi.fn()}
        onReset={vi.fn()}
        showClear={false}
      />,
    );
    const scope = mockedCreateScope.mock.results[0].value as {
      add: ReturnType<typeof vi.fn>;
      revert: ReturnType<typeof vi.fn>;
    };
    const sendBtn = getSendButton(container);
    expect(sendBtn).toBeInTheDocument();

    vi.clearAllMocks();
    fireEvent.mouseDown(sendBtn);
    expect(scope.add).toHaveBeenCalledTimes(1);
    expect(mockedAnimate).toHaveBeenCalledTimes(1);
    const downParams = mockedAnimate.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(downParams.scale).toBe(0.96);
    expect(downParams.composition).toBe('blend');
    expect(mockedSpring).toHaveBeenCalled();

    vi.clearAllMocks();
    fireEvent.mouseUp(sendBtn);
    expect(scope.add).toHaveBeenCalledTimes(1);
    expect(mockedAnimate).toHaveBeenCalledTimes(1);
    const upParams = mockedAnimate.mock.calls[0][1] as Record<string, unknown>;
    expect(upParams.scale).toBe(1);
    expect(upParams.composition).toBe('blend');
  });

  it('reduced-motion: createScope NOT called, animate NOT called on focus/press', () => {
    vi.clearAllMocks();
    mockMatchMedia(true);

    const { container } = render(
      <ChatInputBar
        input=""
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onOpen={vi.fn()}
        onReset={vi.fn()}
        showClear={false}
      />,
    );
    expect(mockedCreateScope).not.toHaveBeenCalled();
    expect(mockedAnimate).not.toHaveBeenCalled();

    const wrap = container.querySelector('[role="button"]') as HTMLElement;
    fireEvent.focus(wrap);
    expect(mockedAnimate).not.toHaveBeenCalled();

    const sendBtn = getSendButton(container);
    fireEvent.mouseDown(sendBtn);
    fireEvent.mouseUp(sendBtn);
    expect(mockedAnimate).not.toHaveBeenCalled();
  });

  it('unmount calls scope.revert', () => {
    const { unmount } = render(
      <ChatInputBar
        input=""
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onOpen={vi.fn()}
        onReset={vi.fn()}
        showClear={false}
      />,
    );
    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
    const scope = mockedCreateScope.mock.results[0].value as {
      revert: ReturnType<typeof vi.fn>;
    };
    expect(scope.revert).not.toHaveBeenCalled();
    unmount();
    expect(scope.revert).toHaveBeenCalledTimes(1);
  });

  it('input change & send click invoke callbacks; showClear CLEAR button works', () => {
    const onInputChange = vi.fn();
    const onSend = vi.fn();
    const onOpen = vi.fn();
    const onReset = vi.fn();

    const { container, rerender } = render(
      <ChatInputBar
        input=""
        onInputChange={onInputChange}
        onSend={onSend}
        onOpen={onOpen}
        onReset={onReset}
        showClear={false}
      />,
    );

    const input = screen.getByPlaceholderText(
      'Ask about my development work...',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onInputChange).toHaveBeenCalledWith('hello');

    const sendBtn = getSendButton(container);
    fireEvent.click(sendBtn);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onSend).not.toHaveBeenCalled();

    onOpen.mockClear();
    onSend.mockClear();
    rerender(
      <ChatInputBar
        input="hello"
        onInputChange={onInputChange}
        onSend={onSend}
        onOpen={onOpen}
        onReset={onReset}
        showClear={false}
      />,
    );
    const sendBtn2 = getSendButton(container);
    fireEvent.click(sendBtn2);
    expect(onSend).toHaveBeenCalledTimes(1);

    rerender(
      <ChatInputBar
        input="hello"
        onInputChange={onInputChange}
        onSend={onSend}
        onOpen={onOpen}
        onReset={onReset}
        showClear={true}
      />,
    );
    // wrap has role=button whose accessible name includes descendants ("CLEAR", "SEND"), so getByRole(/CLEAR/i) matches both wrap and clear button
    const clearCandidates = Array.from(
      container.querySelectorAll('button'),
    ) as HTMLElement[];
    const clearBtn = clearCandidates.find((b) =>
      b.textContent?.includes('CLEAR'),
    );
    expect(clearBtn).toBeDefined();
    expect(clearBtn!).toBeInTheDocument();
    expect(screen.getByTestId('fi-rotate')).toBeInTheDocument();
    fireEvent.click(clearBtn!);
    expect(onReset).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('fi-send')).toBeInTheDocument();
  });
});
