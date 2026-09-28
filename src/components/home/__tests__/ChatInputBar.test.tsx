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
    FiMaximize2: (props: any) =>
      ReactMod.createElement('svg', { 'data-testid': 'fi-maximize', ...props }),
  };
});

import ChatInputBar from '../ChatInputBar';
import { animate, createScope, spring } from 'animejs';

const mockedAnimate = vi.mocked(animate);
const mockedCreateScope = vi.mocked(createScope);
const mockedSpring = vi.mocked(spring);

function getSendButton(container: HTMLElement): HTMLElement {
  // Matched on the button's own trimmed text rather than a loose "includes
  // SEND", because the composer trigger also renders text and a draft that
  // happens to contain the word "send" would otherwise match first.
  const candidates = Array.from(
    container.querySelectorAll('button'),
  ) as HTMLElement[];
  const found = candidates.find((b) =>
    /^SEND(ING)?$/.test(b.textContent?.trim() ?? ''),
  );
  if (!found) throw new Error('SEND button not found');
  return found;
}

function getTriggerButton(container: HTMLElement): HTMLElement {
  // The button that opens the composer. It is the one carrying aria-describedby
  // → chat-input-shortcuts, which nothing else in the bar does.
  const found = Array.from(container.querySelectorAll('button')).find(
    (b) => b.getAttribute('aria-describedby') === 'chat-input-shortcuts',
  ) as HTMLElement | undefined;
  if (!found) throw new Error('composer trigger button not found');
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

    const wrap = container.querySelector('[data-chat-inputbar]') as HTMLElement;
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

    const wrap = container.querySelector('[data-chat-inputbar]') as HTMLElement;
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

  it('the bar is not a text field: no textbox, no readOnly input, no placeholder', () => {
    const onInputChange = vi.fn();
    const { container } = render(
      <ChatInputBar
        input=""
        onInputChange={onInputChange}
        onSend={vi.fn()}
        onOpen={vi.fn()}
        onReset={vi.fn()}
        showClear={false}
      />,
    );

    // P3.5: this used to be a readOnly <input placeholder="Type a message…">.
    // A caret plus that placeholder told phone users it was typeable, and
    // every keystroke went nowhere. There must now be no text field at all.
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByPlaceholderText(/type a message/i)).toBeNull();

    // And nothing in the bar can be typed into: there is no handler wired.
    fireEvent.change(getTriggerButton(container), {
      target: { value: 'hello' },
    });
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('the trigger is a real button that opens the composer, and says so', () => {
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

    const trigger = getTriggerButton(container);
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('type', 'button');

    // The affordance is legible at a glance: pointer cursor, an expand icon
    // and the word OPEN, rather than a caret.
    expect(trigger.className).toContain('cursor-pointer');
    expect(trigger.className).not.toContain('cursor-text');
    expect(screen.getByTestId('fi-maximize')).toBeInTheDocument();
    expect(trigger.parentElement?.textContent).toContain('OPEN');

    // No visible "Type a message…" lie anywhere in the bar.
    expect(container.textContent).not.toMatch(/type a message/i);

    fireEvent.click(trigger);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('accessible name states what activating the bar does, and describes the shortcuts', () => {
    const { container, rerender } = render(
      <ChatInputBar
        input=""
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onOpen={vi.fn()}
        onReset={vi.fn()}
        showClear={false}
      />,
    );

    // Empty state: the name carries the visible label ("ASK ANYTHING") so
    // WCAG 2.5.3 Label in Name holds, and says it opens a composer.
    const emptyName =
      getTriggerButton(container).getAttribute('aria-label') ?? '';
    expect(emptyName).toContain('ASK ANYTHING');
    expect(emptyName).toMatch(/open the message composer/i);
    expect(getTriggerButton(container)).toHaveAccessibleName(emptyName);

    // aria-describedby points at a node that really exists in the document.
    const descId =
      getTriggerButton(container).getAttribute('aria-describedby')!;
    const desc = document.getElementById(descId);
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toMatch(/opens the full message composer/i);
    expect(desc!.textContent).toMatch(/slash/i);

    // Draft state: still a button, and the name leads with the draft.
    rerender(
      <ChatInputBar
        input="tell me about the pricing"
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onOpen={vi.fn()}
        onReset={vi.fn()}
        showClear={false}
      />,
    );
    const draftName =
      getTriggerButton(container).getAttribute('aria-label') ?? '';
    expect(draftName).toContain('tell me about the pricing');
    expect(draftName).toMatch(/open the message composer to edit it/i);
    expect(container.textContent).toContain('DRAFT');
  });

  it('every interactive control is at least 44px tall (P3.7)', () => {
    const { container } = render(
      <ChatInputBar
        input="hello"
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onOpen={vi.fn()}
        onReset={vi.fn()}
        showClear={true}
      />,
    );

    // CLEAR and SEND were min-h-[36px] and are the two tappable controls on the
    // bar. The trigger and the OPEN pill also carry a 44px minimum.
    const controls = Array.from(container.querySelectorAll('button'));
    expect(controls.length).toBeGreaterThanOrEqual(3);
    for (const btn of controls) {
      expect(btn.className).toContain('min-h-[44px]');
    }

    // The OPEN pill is a decorative <span> inside the trigger, not a nested
    // interactive element — a <button> inside a <button> is invalid HTML.
    const pill = container.querySelector('[data-testid="fi-maximize"]')!;
    expect(pill.closest('button')).toBe(getTriggerButton(container));
    expect(pill.parentElement!.tagName).toBe('SPAN');
  });

  it('send click invokes callbacks; showClear CLEAR button works', () => {
    const onSend = vi.fn();
    const onOpen = vi.fn();
    const onReset = vi.fn();

    const { container, rerender } = render(
      <ChatInputBar
        input=""
        onInputChange={vi.fn()}
        onSend={onSend}
        onOpen={onOpen}
        onReset={onReset}
        showClear={false}
      />,
    );

    // No draft: SEND cannot send, so it opens the composer instead of
    // silently doing nothing.
    const sendBtn = getSendButton(container);
    fireEvent.click(sendBtn);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onSend).not.toHaveBeenCalled();

    onOpen.mockClear();
    onSend.mockClear();
    rerender(
      <ChatInputBar
        input="hello"
        onInputChange={vi.fn()}
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
        onInputChange={vi.fn()}
        onSend={onSend}
        onOpen={onOpen}
        onReset={onReset}
        showClear={true}
      />,
    );
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

  it('SEND goes inert and reads SENDING while a request is in flight', () => {
    const onSend = vi.fn();
    const onOpen = vi.fn();
    const { container, rerender } = render(
      <ChatInputBar
        input="hello"
        onInputChange={vi.fn()}
        onSend={onSend}
        onOpen={onOpen}
        onReset={vi.fn()}
        showClear={false}
      />,
    );

    // Idle: labelled SEND, enabled, and the real <button> fires the callback.
    let sendBtn = getSendButton(container);
    expect(sendBtn).not.toBeDisabled();
    expect(sendBtn.textContent).toContain('SEND');
    expect(sendBtn.textContent).not.toContain('SENDING');
    fireEvent.click(sendBtn);
    expect(onSend).toHaveBeenCalledTimes(1);

    rerender(
      <ChatInputBar
        input="hello"
        onInputChange={vi.fn()}
        onSend={onSend}
        onOpen={onOpen}
        onReset={vi.fn()}
        showClear={false}
        isLoading
      />,
    );

    // Pending: the label swaps and the button is genuinely disabled, so a
    // double tap can no longer queue a second turn.
    sendBtn = getSendButton(container);
    expect(sendBtn).toBeDisabled();
    expect(sendBtn.textContent).toContain('SENDING');
    expect(sendBtn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(sendBtn);
    expect(onSend).toHaveBeenCalledTimes(1); // unchanged — the click was inert
    expect(screen.queryByTestId('fi-send')).toBeNull(); // spinner replaces the icon
  });
});
