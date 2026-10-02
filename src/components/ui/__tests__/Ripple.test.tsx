// src/components/ui/__tests__/Ripple.test.tsx
/* `Ripple` had a `color` prop that was accepted and then discarded — it was
   destructured as `color: _color` and the disc was hardcoded to
   `var(--fg-1)`, so every ripple rendered white. `MessageOverlay.tsx:512`
   passes `color="var(--glow-amber-sm)"` around an `accent="amber"` panel and
   was getting white. The prop is now honoured; these tests pin that, plus the
   two ways it silently broke before.
*/
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Ripple from '../Ripple';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/ui/Ripple.tsx'),
  'utf8',
);

/** The single animated disc `Ripple` spawns on click. */
function rippleDisc(container: HTMLElement): HTMLElement {
  const disc = container.querySelector<HTMLElement>('span[aria-hidden="true"]');
  if (!disc) throw new Error('no ripple disc rendered');
  return disc;
}

describe('Ripple — colour', () => {
  it('paints the disc with the colour the caller asked for', async () => {
    const { container } = render(
      <Ripple color="var(--glow-amber-sm)" data-testid="wrap">
        <span>CONTENT</span>
      </Ripple>,
    );

    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();

    fireEvent.click(container.firstElementChild as HTMLElement);

    await waitFor(() => expect(rippleDisc(container)).toBeInTheDocument());
    expect(rippleDisc(container).style.background).toContain(
      'var(--glow-amber-sm)',
    );
  });

  it('honours a different colour for a different caller', async () => {
    const { container } = render(
      <Ripple color="var(--wash-coral-strong)">
        <span>CONTENT</span>
      </Ripple>,
    );

    fireEvent.click(container.firstElementChild as HTMLElement);

    await waitFor(() => expect(rippleDisc(container)).toBeInTheDocument());
    const { background } = rippleDisc(container).style;
    expect(background).toContain('var(--wash-coral-strong)');
    // The amber call must not have bled into this one.
    expect(background).not.toContain('--glow-amber-sm');
    expect(background).not.toContain('var(--fg-1)');
  });

  it('falls back to the neutral --fg-1 wash when no colour is passed', async () => {
    const { container } = render(
      <Ripple>
        <span>CONTENT</span>
      </Ripple>,
    );

    fireEvent.click(container.firstElementChild as HTMLElement);

    await waitFor(() => expect(rippleDisc(container)).toBeInTheDocument());
    expect(rippleDisc(container).style.background).toContain('var(--fg-1)');
  });

  it('is not an accepted-and-ignored prop: the source keeps no discarded parameter', () => {
    // The original defect: `color: _color = 'var(--fg-1)'` — accepted, renamed
    // to mark itself unused, never referenced.
    expect(SOURCE).not.toMatch(/color:\s*_color/);
    expect(SOURCE).not.toMatch(/_color\b/);
    // And the disc colour is the `color` binding, not a second hardcoded value.
    expect(SOURCE).toMatch(/background:\s*color\b/);
    expect(SOURCE).not.toMatch(/background:\s*'var\(/);
    expect(SOURCE).not.toMatch(/background:\s*"var\(/);
  });
});
