// src/components/ui/__tests__/GlitchText.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlitchText from '../GlitchText';

describe('GlitchText', () => {
  it('renders the text content', () => {
    render(<GlitchText>HELLO</GlitchText>);
    expect(screen.getByText('HELLO')).toBeInTheDocument();
  });

  it('applies display font class by default', () => {
    render(<GlitchText data-testid="g">X</GlitchText>);
    const el = screen.getByTestId('g');
    expect(el.className).toMatch(/font-display/);
  });

  it('supports an accent prop that controls text-shadow color', () => {
    render(
      <GlitchText accent="magenta" data-testid="g">
        M
      </GlitchText>,
    );
    const el = screen.getByTestId('g');
    expect(el.style.textShadow).toContain('#ff00aa');
  });
});
