// src/components/home/__tests__/ChatStreamAtmosphere.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { act } from '@testing-library/react';

vi.mock('animejs', () => ({
  createScope: vi.fn(() => {
    const scope: { revert: () => void; add: (cb: () => void) => unknown } = {
      revert: vi.fn(),
      add: vi.fn((cb: () => void) => {
        cb();
        return scope;
      }),
    };
    return scope;
  }),
  animate: vi.fn(),
  stagger: vi.fn(() => 0),
  spring: vi.fn(() => 'spring-ease'),
  createTimeline: vi.fn(() => ({ add: vi.fn() })),
}));

vi.mock('../../ChatMessage', () => ({
  default: (props: { text: string }) => {
    const React = require('react');
    return React.createElement(
      'div',
      { 'data-testid': 'chat-msg-mock' },
      props.text,
    );
  },
}));

import ChatStream from '../ChatStream';

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('ChatStream atmosphere', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the lattice backdrop and mini scope typing indicator', () => {
    render(
      <ChatStream
        messages={[{ role: 'user', text: 'hi' }]}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading
      />,
    );
    expect(
      document.querySelector('[data-graphic="grat-lattice"]'),
    ).not.toBeNull();
    expect(screen.getByText('THINKING')).toBeInTheDocument();
    expect(
      document.querySelector('[data-graphic="grat-scope"]'),
    ).not.toBeNull();
  });

  it('autoscrolls only when the tail is more than 120px below the fold', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
      writable: true,
      configurable: true,
      value: () => ({ top: window.innerHeight + 200 } as DOMRect),
    });
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <ChatStream
        messages={[{ role: 'user', text: 'far below' }]}
        projects={[]}
        skills={[]}
        experiences={[]}
        isLoading={false}
      />,
    );
    act(() => {
      vi.runAllTimers();
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'end',
      behavior: 'smooth',
    });
  });
});
