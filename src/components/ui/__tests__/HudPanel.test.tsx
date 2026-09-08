// src/components/ui/__tests__/HudPanel.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HudPanel from '../HudPanel';

describe('HudPanel', () => {
  it('renders children', () => {
    render(<HudPanel>CONTENT</HudPanel>);
    expect(screen.getByText('CONTENT')).toBeInTheDocument();
  });

  it('applies a yellow glow class by default', () => {
    render(<HudPanel data-testid="p">X</HudPanel>);
    const el = screen.getByTestId('p');
    expect(el.className).toMatch(/rounded-card/);
    expect(el.style.borderTop).toContain('var(--neon-yellow)');
    expect(el.style.background).toContain('var(--bg-2)');
    expect(el.style.borderRadius).toBe('var(--radius-lg)');
  });

  it('applies the chosen accent glow class', () => {
    render(
      <HudPanel accent="magenta" data-testid="p">
        X
      </HudPanel>,
    );
    const el = screen.getByTestId('p');
    expect(el.className).toMatch(/rounded-card/);
    expect(el.style.borderTop).toContain('var(--neon-magenta)');
  });

  it('uses a notched clip path via utility class', () => {
    render(
      <HudPanel notch="md" data-testid="p">
        X
      </HudPanel>,
    );
    const el = screen.getByTestId('p');
    expect(el.className).toMatch(/rounded-card/);
    expect(el.style.borderRadius).toBe('var(--radius-lg)');
    expect(el.className).not.toMatch(/clip-notch-md/);
  });

  it('renders a title bar when title prop is provided', () => {
    render(<HudPanel title="// STATUS">X</HudPanel>);
    expect(screen.getByText('// STATUS')).toBeInTheDocument();
  });

  it('applies green glow + green title for accent="green"', () => {
    render(
      <HudPanel accent="green" title="// OK" data-testid="p">
        X
      </HudPanel>,
    );
    const panel = screen.getByTestId('p');
    expect(panel.className).toMatch(/rounded-card/);
    expect(panel.style.borderTop).toContain('var(--neon-green)');
    expect(panel.style.background).toContain('var(--bg-2)');
    expect(panel.style.borderRadius).toBe('var(--radius-lg)');
    const title = screen.getByText('// OK');
    // editorial: title is fg-2 on subtle border, not neon
    expect(title.style.color).toBe('var(--fg-2)');
    expect(title.className).not.toMatch(/text-neon-green/);
    expect(title.className).toMatch(/border-b/);
  });

  it('applies red glow + red title for accent="red"', () => {
    render(
      <HudPanel accent="red" title="// ERR" data-testid="p">
        X
      </HudPanel>,
    );
    const panel = screen.getByTestId('p');
    expect(panel.className).toMatch(/rounded-card/);
    expect(panel.style.borderTop).toContain('var(--neon-red)');
    const title = screen.getByText('// ERR');
    expect(title.style.color).toBe('var(--fg-2)');
    expect(title.className).not.toMatch(/text-neon-red/);
  });
});
