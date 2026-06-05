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
    expect(el.className).toMatch(/clip-notch-sm/);
  });
});
