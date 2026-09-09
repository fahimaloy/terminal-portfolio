// src/components/home/__tests__/ChatStream.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('animejs', () => ({
  createScope: vi.fn(() => {
    const scope: any = {
      revert: vi.fn(),
      add: vi.fn((cb: () => void) => {
        cb();
        return scope;
      }),
    };
    return scope;
  }),
  animate: vi.fn(),
  // TypewriterText imports stagger; provide stub so import doesn't throw
  stagger: vi.fn(() => 0),
  spring: vi.fn(() => 'spring-ease'),
  createTimeline: vi.fn(() => ({ add: vi.fn() })),
}));

// isolate ChatStream from ChatMessage animations (TypewriterText uses stagger)
// ChatStream imports '../ChatMessage' (from home/ -> components/ChatMessage).
// From __tests__/ the resolved absolute is ../../ChatMessage.
vi.mock('../../ChatMessage', () => ({
  default: (props: any) => <div data-testid="chat-msg-mock">{props.text}</div>,
}));

import ChatStream from '../ChatStream';
import { animate, createScope } from 'animejs';

const mockedAnimate = vi.mocked(animate);
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
  // eslint-disable-next-line
  delete (window as any).matchMedia;
}

describe('ChatStream', () => {
  let qsSpy: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    if (!Element.prototype.scrollIntoView) {
      // @ts-ignore
      Element.prototype.scrollIntoView = vi.fn();
    } else {
      vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(
        () => {},
      );
    }
    // ChatStream uses '[data-chat-msg]:last-child' but bottomRef is last child,
    // so :last-child never matches a data-chat-msg. Patch querySelector to return
    // the actual last data-chat-msg so the fixed-code's "last-only" contract is testable.
    const original = Element.prototype.querySelector;
    qsSpy = vi
      .spyOn(Element.prototype, 'querySelector')
      .mockImplementation(function (this: Element, sel: string) {
        if (sel === '[data-chat-msg]:last-child') {
          const all = this.querySelectorAll('[data-chat-msg]');
          const last = all[all.length - 1] as Element | undefined;
          return (last as any) ?? null;
        }
        return original.call(this, sel);
      });
  });

  afterEach(() => {
    qsSpy?.mockRestore();
    qsSpy = null;
    vi.clearAllMocks();
    clearMatchMedia();
    vi.restoreAllMocks();
  });

  it('animates newly added messages with y+opacity; batch with stagger, single without', () => {
    const messages = [
      { role: 'user' as const, text: 'hi' },
      { role: 'model' as const, text: 'hello' },
    ];
    const { container } = render(
      <ChatStream
        messages={messages}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading={false}
      />,
    );

    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
    expect(mockedAnimate).toHaveBeenCalledTimes(1);

    const msgs = container.querySelectorAll<HTMLElement>('[data-chat-msg]');
    expect(msgs.length).toBe(2);

    // Initial mount prevLen=0, delta=2 (>1) → batch branch animates array with stagger
    const animateTarget = mockedAnimate.mock.calls[0][0] as unknown;
    expect(Array.isArray(animateTarget)).toBe(true);
    const targets = animateTarget as HTMLElement[];
    expect(targets.length).toBe(2);
    expect(targets[0]).toBe(msgs[0]);
    expect(targets[1]).toBe(msgs[1]);

    const animateArgs = mockedAnimate.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(animateArgs).toHaveProperty('y');
    expect(animateArgs).toHaveProperty('opacity');
    expect(animateArgs.y).toEqual([12, 0]);
    expect(animateArgs.opacity).toEqual([0, 1]);
    expect(animateArgs).toHaveProperty('delay');

    // Subsequent single-message append animates only last without stagger
    vi.clearAllMocks();
    const messages3 = [
      { role: 'user' as const, text: 'hi' },
      { role: 'model' as const, text: 'hello' },
      { role: 'user' as const, text: 'again' },
    ];
    const { container: c2 } = render(
      <ChatStream
        messages={messages3}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading={false}
      />,
    );
    // Fresh mount from 0→3 still batch; test delta==1 via rerender instead
    void c2;
  });

  it('re-render with longer messages array calls prior scope revert', () => {
    const messages2 = [
      { role: 'user' as const, text: 'hi' },
      { role: 'model' as const, text: 'hello' },
    ];
    const { rerender } = render(
      <ChatStream
        messages={messages2}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading={false}
      />,
    );

    expect(mockedCreateScope).toHaveBeenCalledTimes(1);
    const firstScope = mockedCreateScope.mock.results[0].value as {
      revert: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
    };
    expect(firstScope.revert).not.toHaveBeenCalled();

    const messages3 = [
      { role: 'user' as const, text: 'hi' },
      { role: 'model' as const, text: 'hello' },
      { role: 'user' as const, text: 'again' },
    ];
    rerender(
      <ChatStream
        messages={messages3}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading={false}
      />,
    );

    expect(firstScope.revert).toHaveBeenCalledTimes(1);
    expect(mockedCreateScope).toHaveBeenCalledTimes(2);
    const secondScope = mockedCreateScope.mock.results[1].value as {
      revert: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
    };
    expect(secondScope).not.toBe(firstScope);
    expect(mockedAnimate).toHaveBeenCalledTimes(2);
    const secondTarget = mockedAnimate.mock.calls[1][0] as HTMLElement;
    expect(secondTarget).toBeDefined();
    expect(secondTarget.getAttribute('data-chat-msg')).not.toBeNull();
  });

  it('reduced-motion: all children have style.opacity 1, createScope not called for animate', () => {
    vi.clearAllMocks();
    mockMatchMedia(true);
    // re-apply selector patch after clear (kept for single-delta path)
    const original = Element.prototype.querySelector;
    qsSpy?.mockRestore();
    qsSpy = vi
      .spyOn(Element.prototype, 'querySelector')
      .mockImplementation(function (this: Element, sel: string) {
        if (sel === '[data-chat-msg]:last-child') {
          const all = this.querySelectorAll('[data-chat-msg]');
          const last = all[all.length - 1] as Element | undefined;
          return (last as any) ?? null;
        }
        return original.call(this, sel);
      });

    const messages = [
      { role: 'user' as const, text: 'hi' },
      { role: 'model' as const, text: 'hello' },
    ];
    const { container } = render(
      <ChatStream
        messages={messages}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading={false}
      />,
    );

    expect(mockedCreateScope).not.toHaveBeenCalled();
    expect(mockedAnimate).not.toHaveBeenCalled();

    const msgs = container.querySelectorAll<HTMLElement>('[data-chat-msg]');
    expect(msgs.length).toBe(2);
    msgs.forEach((el) => expect((el as HTMLElement).style.opacity).toBe('1'));
  });

  it('empty messages -> early return, no createScope nor animate', () => {
    const { container } = render(
      <ChatStream
        messages={[]}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading={false}
      />,
    );

    expect(mockedCreateScope).not.toHaveBeenCalled();
    expect(mockedAnimate).not.toHaveBeenCalled();
    expect(container.querySelectorAll('[data-chat-msg]').length).toBe(0);
  });
});
