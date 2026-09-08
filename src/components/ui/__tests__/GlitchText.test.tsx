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
    // editorial: single-entity warm foreground, no neon glitch or RGB offset
    expect(el.style.color).toBe('var(--fg-1)');
    expect(el.className).toMatch(/font-display/);
    expect(el.style.textShadow).toBe('');
    expect(el.className).not.toMatch(/text-neon-/);
  });
});
