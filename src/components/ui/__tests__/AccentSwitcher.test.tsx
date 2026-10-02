// src/components/ui/__tests__/AccentSwitcher.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

import AccentSwitcher from '../AccentSwitcher';
import {
  ACCENT_ATTRIBUTE,
  ACCENT_CHANGE_EVENT,
  ACCENT_NAMES,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  SCENE_ACCENTS,
  SCENE_ACCENT_RUNS,
  activeAccentIndex,
  resetPaletteCache,
  sceneAccentRun,
  scenePrimary,
} from '../../scene/palette';

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const radio = (name: string) => screen.getByRole('radio', { name });

/**
 * jsdom never loads tokens.css, so `getComputedStyle` returns '' for every
 * custom property. Stand in for it with a map the test can mutate, which also
 * makes the one thing this whole feature depends on observable: the token NAME
 * `--accent-color` is constant while its VALUE moves with `data-accent`.
 */
const NEON: Record<string, string> = {
  cyan: 'rgb(61, 242, 255)',
  violet: 'rgb(124, 92, 255)',
  coral: 'rgb(255, 77, 109)',
  amber: 'rgb(255, 176, 32)',
  lime: 'rgb(77, 255, 166)',
  ice: 'rgb(155, 232, 255)',
};

function stubComputedStyle(values: Record<string, string> = {}) {
  const styles: Record<string, string> = { ...values };
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        getPropertyValue: (name: string) => styles[name] ?? '',
      }) as unknown as CSSStyleDeclaration,
  );
  return styles;
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute(ACCENT_ATTRIBUTE);
  resetPaletteCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.removeAttribute(ACCENT_ATTRIBUTE);
  resetPaletteCache();
});

/* ── the contract ─────────────────────────────────────────────────────────── */

describe('AccentSwitcher — accent vocabulary', () => {
  it('renders exactly the six accents, in the scene rotation order', () => {
    render(<AccentSwitcher />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(SCENE_ACCENT_RUNS);
    expect(ACCENT_NAMES).toEqual([
      'cyan',
      'violet',
      'coral',
      'amber',
      'lime',
      'ice',
    ]);
    // The switcher renders its own list of names; the scene derives the accent
    // as an INDEX into ACCENT_TOKENS. If the render order drifts from that
    // table, clicking "amber" would light the WebGL scene up violet. This is
    // the only thing tying the two lists together — the shared `AccentColor`
    // type stops a bad NAME compiling, not a bad ORDER.
    expect(radios.map((el) => el.getAttribute('data-accent-swatch'))).toEqual([
      ...ACCENT_NAMES,
    ]);
    for (const name of ACCENT_NAMES) {
      document.documentElement.setAttribute(ACCENT_ATTRIBUTE, name);
      expect(ACCENT_NAMES[activeAccentIndex()]).toBe(name);
    }
  });
});

/* ── writing the attribute ────────────────────────────────────────────────── */

describe('AccentSwitcher — writing the accent', () => {
  it('writes data-accent to documentElement, not to a wrapper', async () => {
    const { container } = render(<AccentSwitcher />);
    fireEvent.click(radio('amber'));
    await flush();

    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      'amber',
    );
    // No element inside the component carries the attribute either, so CSS
    // outside a wrapper could not see it — which is why <html> is required.
    expect(container.querySelector(`[${ACCENT_ATTRIBUTE}]`)).toBeNull();
  });

  it('marks the chosen radio checked and gives it the only tab stop', async () => {
    render(<AccentSwitcher />);
    fireEvent.click(radio('lime'));
    await flush();

    expect(radio('lime')).toHaveAttribute('aria-checked', 'true');
    expect(radio('cyan')).toHaveAttribute('aria-checked', 'false');
    expect(radio('lime')).toHaveAttribute('tabindex', '0');
    expect(radio('cyan')).toHaveAttribute('tabindex', '-1');
  });

  it('persists the choice to localStorage', async () => {
    render(<AccentSwitcher />);
    fireEvent.click(radio('coral'));
    await flush();
    expect(window.localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('coral');
  });
});

/* ── rehydration ──────────────────────────────────────────────────────────── */

describe('AccentSwitcher — rehydration', () => {
  it('applies a persisted accent on mount', async () => {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, 'violet');
    render(<AccentSwitcher />);
    await flush();

    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      'violet',
    );
    expect(radio('violet')).toHaveAttribute('aria-checked', 'true');
  });

  it('falls back to the default and repairs an invalid stored value', async () => {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, 'red');
    render(<AccentSwitcher />);
    await flush();

    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      DEFAULT_ACCENT,
    );
    expect(radio(DEFAULT_ACCENT)).toHaveAttribute('aria-checked', 'true');
    // Repaired, not left to rot.
    expect(window.localStorage.getItem(ACCENT_STORAGE_KEY)).toBe(
      DEFAULT_ACCENT,
    );
  });

  it('survives storage that throws on access', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(() => render(<AccentSwitcher />)).not.toThrow();
    await flush();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      DEFAULT_ACCENT,
    );
  });

  it('writes the default accent onto a document that has none', async () => {
    render(<AccentSwitcher />);
    await flush();
    // The switcher mounts inside the chat sheet only, so /blog, admin and 404
    // never run this code — which is why tokens.css now gives `:root` its own
    // default instance of the three role tokens.
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      DEFAULT_ACCENT,
    );
  });
});

/* ── server rendering ─────────────────────────────────────────────────────── */

describe('AccentSwitcher — SSR', () => {
  it('renders the default without reading storage or writing the document', () => {
    // A stored preference must not reach the server's markup: the client's
    // first render would then disagree with it and React would raise a
    // hydration mismatch on every such page load.
    window.localStorage.setItem(ACCENT_STORAGE_KEY, 'violet');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setAttribute = vi.spyOn(Element.prototype, 'setAttribute');
    // `useLayoutEffect` no-ops on the server and React logs about it. Expected
    // for any layout-effect rehydration; muted so the run stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const markup = renderToStaticMarkup(<AccentSwitcher />);

    expect(getItem).not.toHaveBeenCalled();
    expect(setAttribute).not.toHaveBeenCalledWith(
      ACCENT_ATTRIBUTE,
      expect.anything(),
    );
    expect(markup).toContain('role="radiogroup"');
    // Exactly one radio checked, five not — a server that checked all six, or
    // none, would be describing a preference it cannot know.
    expect(markup.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(markup.match(/aria-checked="false"/g)).toHaveLength(5);
    expect(markup).toContain(`aria-checked="true"`);
  });
});

/* ── keyboard ─────────────────────────────────────────────────────────────── */

describe('AccentSwitcher — keyboard', () => {
  it('moves selection and focus with arrow keys, wrapping', async () => {
    render(<AccentSwitcher />);
    radio(DEFAULT_ACCENT).focus();

    fireEvent.keyDown(radio(DEFAULT_ACCENT), { key: 'ArrowRight' });
    await flush();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      'violet',
    );
    expect(document.activeElement).toBe(radio('violet'));

    fireEvent.keyDown(radio('violet'), { key: 'ArrowLeft' });
    await flush();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      DEFAULT_ACCENT,
    );
    expect(document.activeElement).toBe(radio(DEFAULT_ACCENT));

    // Wrap backwards off the head.
    fireEvent.keyDown(radio(DEFAULT_ACCENT), { key: 'ArrowLeft' });
    await flush();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe('ice');
    expect(document.activeElement).toBe(radio('ice'));
  });

  it('jumps to the ends with Home and End', async () => {
    render(<AccentSwitcher />);
    fireEvent.keyDown(radio(DEFAULT_ACCENT), { key: 'End' });
    await flush();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe('ice');

    fireEvent.keyDown(radio('ice'), { key: 'Home' });
    await flush();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      DEFAULT_ACCENT,
    );
  });

  it('ignores keys that are not part of the pattern', async () => {
    render(<AccentSwitcher />);
    const before = document.documentElement.getAttribute(ACCENT_ATTRIBUTE);

    fireEvent.keyDown(radio(DEFAULT_ACCENT), { key: 'Tab' });
    fireEvent.keyDown(radio(DEFAULT_ACCENT), { key: 'a' });
    fireEvent.keyDown(radio(DEFAULT_ACCENT), { key: 'Escape' });
    await flush();

    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      before,
    );
    expect(document.activeElement).not.toBe(radio('ice'));
  });

  it('exposes a radiogroup with a visible, associated label', () => {
    render(<AccentSwitcher />);
    const group = screen.getByRole('radiogroup');
    const labelId = group.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toBe('Accent');
  });

  it('announces the change for users who do not move focus with the keyboard', async () => {
    render(<AccentSwitcher />);
    const status = document.querySelector('[aria-live="polite"]');
    expect(status?.textContent).toBe(`Accent set to ${DEFAULT_ACCENT}`);

    fireEvent.click(radio('lime'));
    await flush();
    expect(status?.textContent).toBe('Accent set to lime');
  });
});

/* ── reaching Three.js ────────────────────────────────────────────────────── */

describe('AccentSwitcher — the scene palette', () => {
  it('drops the scene memo and announces the change on window', async () => {
    render(<AccentSwitcher />);
    const listener = vi.fn();
    window.addEventListener(ACCENT_CHANGE_EVENT, listener);

    fireEvent.click(radio('amber'));
    await flush();

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      accent: 'amber',
    });

    window.removeEventListener(ACCENT_CHANGE_EVENT, listener);
  });

  it('announces once per real change, not for a no-op re-selection', async () => {
    const listener = vi.fn();
    // Attached before mount: the document starts with no attribute, so the
    // rehydration that installs the default IS a real change worth announcing.
    window.addEventListener(ACCENT_CHANGE_EVENT, listener);

    render(<AccentSwitcher />);
    await flush();
    const afterMount = listener.mock.calls.length;
    expect(afterMount).toBe(1);

    // Re-selecting the accent already in force must not ask the scene to
    // repaint, or the event stops meaning "something moved".
    fireEvent.click(radio(DEFAULT_ACCENT));
    await flush();
    expect(listener.mock.calls.length).toBe(afterMount);

    fireEvent.click(radio('lime'));
    await flush();
    expect(listener.mock.calls.length).toBe(afterMount + 1);

    window.removeEventListener(ACCENT_CHANGE_EVENT, listener);
  });

  it('actually changes what the scene would resolve next render', async () => {
    const styles = stubComputedStyle();
    styles['--accent-color'] = NEON.cyan;

    // Prime the memo while the document wears cyan.
    document.documentElement.setAttribute(ACCENT_ATTRIBUTE, 'cyan');
    render(<AccentSwitcher />);
    await flush();
    expect(scenePrimary('')).toBe(NEON.cyan);

    fireEvent.click(radio('amber'));
    await flush();
    // In a browser the attribute write would already have moved the computed
    // value; the stub is not reactive, so move it here.
    styles['--accent-color'] = NEON.amber;

    // `resetPaletteCache()` has run by now, so the very next read — which is
    // what the next `SceneCanvas` render does — sees amber.
    expect(scenePrimary('')).toBe(NEON.amber);
  });

  it('leads the particle ramp with the chosen accent', async () => {
    const styles = stubComputedStyle();
    for (const [name, value] of Object.entries(NEON)) {
      styles[`--neon-${name}`] = value;
    }

    render(<AccentSwitcher />);
    await flush();

    // Default is byte-identical to the old fixed ramp.
    expect(SCENE_ACCENTS()).toEqual([NEON.cyan, NEON.violet, NEON.coral]);

    fireEvent.click(radio('amber'));
    await flush();
    // Three consecutive accents led by the one that was picked — a rotation
    // over the existing token table, not a second hard-coded palette.
    expect(SCENE_ACCENTS()).toEqual(
      sceneAccentRun(ACCENT_NAMES.indexOf('amber'), 3),
    );
    expect(SCENE_ACCENTS()).toEqual([NEON.amber, NEON.lime, NEON.ice]);
  });

  it('degrades to the default ramp for an unknown data-accent', () => {
    document.documentElement.setAttribute(ACCENT_ATTRIBUTE, 'red');
    expect(activeAccentIndex()).toBe(0);
    expect(SCENE_ACCENTS()).toEqual(sceneAccentRun(0, 3));
  });

  it('never hands THREE.Color an empty string', () => {
    // `new THREE.Color('')` does not throw: three's setStyle('') matches no
    // keyword and leaves the colour opaque white. FloorGrid and CoreObject both
    // call `scenePrimary('')` as a default, so the fallback is load-bearing.
    expect(scenePrimary('')).not.toBe('');
    expect(scenePrimary('')).toBeTruthy();
  });
});
