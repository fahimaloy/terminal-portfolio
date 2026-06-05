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
    expect(screen.getByTestId('c').className).toMatch(/text-neon-cyan/);
  });
});
