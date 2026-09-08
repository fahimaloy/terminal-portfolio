// src/components/ui/__tests__/NeonButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NeonButton from '../NeonButton';

describe('NeonButton', () => {
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

  it('disables click when disabled', () => {
    const onClick = vi.fn();
    render(
      <NeonButton onClick={onClick} disabled>
        X
      </NeonButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
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
