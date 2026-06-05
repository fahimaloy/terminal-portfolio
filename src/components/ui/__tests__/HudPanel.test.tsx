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
    expect(screen.getByTestId('p').className).toMatch(/hud-glow-yellow/);
  });

  it('applies the chosen accent glow class', () => {
    render(
      <HudPanel accent="magenta" data-testid="p">
        X
      </HudPanel>,
    );
    expect(screen.getByTestId('p').className).toMatch(/hud-glow-magenta/);
  });

  it('uses a notched clip path via utility class', () => {
    render(
      <HudPanel notch="md" data-testid="p">
        X
      </HudPanel>,
    );
    expect(screen.getByTestId('p').className).toMatch(/clip-notch-md/);
  });

  it('renders a title bar when title prop is provided', () => {
    render(<HudPanel title="// STATUS">X</HudPanel>);
    expect(screen.getByText('// STATUS')).toBeInTheDocument();
  });
});
