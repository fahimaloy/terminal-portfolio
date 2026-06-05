// src/components/ui/__tests__/StatBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatBar from '../StatBar';

describe('StatBar', () => {
  it('renders the label', () => {
    render(<StatBar label="CPU" value={50} />);
    expect(screen.getByText('CPU')).toBeInTheDocument();
  });
  it('renders the value with %', () => {
    render(<StatBar label="CPU" value={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
  it('clamps value to 0-100', () => {
    const { rerender } = render(<StatBar label="X" value={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    rerender(<StatBar label="X" value={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
  it('sets bar width style to value%', () => {
    render(<StatBar label="X" value={42} />);
    const bar = document.querySelector('[data-testid="stat-bar-fill"]') as HTMLElement;
    expect(bar.style.width).toBe('42%');
  });
});
