// src/components/ui/__tests__/NeonChip.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NeonChip from '../NeonChip';

describe('NeonChip', () => {
  it('renders text', () => {
    render(<NeonChip>TypeScript</NeonChip>);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });
  it('applies accent text color', () => {
    render(
      <NeonChip accent="cyan" data-testid="c">
        Go
      </NeonChip>,
    );
    const el = screen.getByTestId('c');
    // editorial: accent via soft color-mix border/bg, text is fg-2, not neon
    expect(el.className).toMatch(/inline-flex/);
    expect(el.style.background).toContain('var(--neon-cyan)');
    expect(el.style.border).toContain('var(--neon-cyan)');
    expect(el.style.borderRadius).toBe('var(--radius-full)');
    expect(el.style.color).toBe('var(--fg-2)');
    expect(el.className).not.toMatch(/text-neon-cyan/);
  });
});
