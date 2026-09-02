import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Tooltip from '../Tooltip';

vi.mock('animejs', () => ({
  animate: vi.fn(),
}));

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <Tooltip content="Hello">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.getByText('Hover me')).toBeTruthy();
  });

  it('shows tooltip on mouse enter after delay', () => {
    render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('Tooltip text')).toBeTruthy();
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByText('Tooltip text')).toBeTruthy();
    fireEvent.mouseLeave(screen.getByText('Hover me'));
    act(() => {
      vi.advanceTimersByTime(200);
    });
  });
});
