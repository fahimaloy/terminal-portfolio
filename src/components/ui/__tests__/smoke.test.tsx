// src/components/ui/__tests__/smoke.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('smoke', () => {
  it('renders a div', () => {
    render(<div data-testid="ok">ok</div>);
    expect(screen.getByTestId('ok')).toBeInTheDocument();
  });
});
