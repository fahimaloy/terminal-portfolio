// src/components/ui/__tests__/NeonButton.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NeonButton from '../NeonButton';

vi.mock('animejs', () => {
  const scope = { add: vi.fn(), revert: vi.fn() };
  return {
    animate: vi.fn(),
    createScope: vi.fn(() => scope),
    spring: vi.fn(() => 'spring-ease'),
    stagger: vi.fn((value: unknown) => value),
  };
});

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

describe('NeonButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia();
  });

  afterEach(() => {
    clearMatchMedia();
  });

  it('renders children', () => {
    render(<NeonButton>GO</NeonButton>);
    expect(screen.getByText('GO')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<NeonButton onClick={onClick}>X</NeonButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables click and active callbacks when disabled', () => {
    const onClick = vi.fn();
    const onMouseLeave = vi.fn();
    render(
      <NeonButton onClick={onClick} onMouseLeave={onMouseLeave} disabled>
        X
      </NeonButton>,
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.mouseDown(screen.getByRole('button'), {
      clientX: 10,
      clientY: 10,
    });
    fireEvent.mouseLeave(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
    expect(onMouseLeave).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button').querySelector('span[style*="ripple-out"]'),
    ).not.toBeInTheDocument();
  });

  it('clears an active ripple and preserves the callback on mouse leave', () => {
    const onMouseLeave = vi.fn();
    render(
      <NeonButton data-testid="button" onMouseLeave={onMouseLeave}>
        X
      </NeonButton>,
    );
    const button = screen.getByTestId('button');

    // Arrange + Act: start an active ripple on the enabled button.
    fireEvent.mouseDown(button, { clientX: 10, clientY: 10 });
    expect(
      button.querySelector('span[style*="ripple-out"]'),
    ).toBeInTheDocument();

    // Act: leave the button while the interaction is active.
    fireEvent.mouseLeave(button);

    // Assert: the transient ripple is gone and the consumer callback still runs.
    expect(
      button.querySelector('span[style*="ripple-out"]'),
    ).not.toBeInTheDocument();
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('applies filled variant style by default', () => {
    render(<NeonButton data-testid="b">X</NeonButton>);
    const el = screen.getByTestId('b');
    // editorial: rounded card via inline style var(--radius-md), no clip-notch
    expect(el.style.borderRadius).toBe('var(--radius-md)');
    expect(el.style.background).toContain('var(--neon-');
    expect(el.className).not.toMatch(/clip-notch-sm/);
    expect(el.className).toMatch(/focus-visible:ring/);
    expect(el.className).toMatch(/font-display/);
  });
});
