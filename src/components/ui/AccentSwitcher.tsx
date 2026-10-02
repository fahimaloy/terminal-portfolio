// src/components/ui/AccentSwitcher.tsx
/**
 * The site-wide accent control.
 *
 * tokens.css has carried six `[data-accent='…']` blocks since the accent map
 * landed, and nothing ever set the attribute — the whole feature was dormant.
 * This turns it on.
 *
 * ## Why `<html>` and not a wrapper
 *
 * The six blocks repoint three ROLE tokens (`--accent-color`, `--accent-glow`,
 * `--accent-wash`), not `--neon-*`. A wrapper `<div data-accent>` would give
 * those tokens a value only inside the wrapper and leave the rest of the page
 * resolving an undefined custom property. On `documentElement` every element
 * inherits it, it is readable from JS (`palette.activeAccentIndex`), and it
 * cannot be lost to component mount order.
 *
 * ## Why it looks like a mixer strip
 *
 * This is a preference, not a feature button, so it is dressed as a HUD
 * calibration bay: six colour cells in a row, each with its name spelled out
 * underneath. Names, not colour alone, carry the meaning — an amber dot on a
 * dark panel is unreadable to a lot of people, and unreadable to a screen
 * reader. The selected cell gets a hairline bracket, a larger dot and a halo.
 *
 * That is also why the name is a header above the cells rather than a caption
 * beside them: six 44px cells plus 2px gaps is 274px, and `ACCENT` inline would
 * have needed 333px — past a 320px viewport. Above the row it costs the width
 * budget nothing, and nothing has to be hidden to pay for it.
 *
 * ## The flash
 *
 * A stored accent cannot be applied before first paint from here: that needs a
 * blocking inline script in `_document.tsx`, which is out of scope. This
 * component therefore does the next best thing — it rehydrates in a *layout*
 * effect (see `useIsoLayoutEffect`), so the correction lands in the same frame
 * as hydration instead of one paint later, and it never renders an invalid
 * accent in the meantime: `tokens.css` gives `:root` a default instance of the
 * three role tokens, so "no preference" is a valid cyan rather than `unset`.
 */
import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { animate, stagger } from 'animejs';

import {
  canAnimate,
  durations,
  easings,
  type AccentColor,
} from '../../config/animations';
import { useMotionScope } from '../../hooks/useMotionScope';
import {
  ACCENT_ATTRIBUTE,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  resetPaletteCache,
} from '../scene/palette';

/**
 * Render order, matching the rotation order in `palette.ts` so that
 * `activeAccentIndex()` — which indexes that table — lines up with what the
 * visitor clicks. Type-checked against the generated union, so a name that
 * does not exist in tokens.css fails to compile;
 * `AccentSwitcher.test.tsx` pins the ORDER, which the type cannot.
 */
const ACCENTS: readonly AccentColor[] = [
  'cyan',
  'violet',
  'coral',
  'amber',
  'lime',
  'ice',
];

/**
 * Layout effect on the client, passive on the server: this component is server
 * rendered and `useLayoutEffect` warns when it is. Same guard as
 * `HeroSection`.
 */
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function isAccent(value: string | null | undefined): value is AccentColor {
  return (
    typeof value === 'string' && (ACCENTS as readonly string[]).includes(value)
  );
}

/**
 * `null` for anything we do not recognise. A hand-edited
 * `portfolio:accent = "red"` is not an error state to surface — it is a
 * corrupt value to overwrite with the default, which is what the caller does.
 */
function readStoredAccent(): AccentColor | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    return isAccent(raw) ? raw : null;
  } catch {
    // Safari private mode and "block all cookies" throw on access.
    return null;
  }
}

function writeStoredAccent(accent: AccentColor): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    // Storage being unavailable must not take the page down with it.
  }
}

/**
 * Writes the document accent. Order matters: the attribute first, so that the
 * re-render `resetPaletteCache()` asks for reads the NEW value rather than the
 * old one, then the memo drop + `portfolio:accent-change` announcement.
 *
 * The scene samples colours during render and freezes them into
 * `useMemo`ed `THREE.Color` uniforms — nothing reads them per frame — so
 * without this step the WebGL background would keep the accent that was live
 * on its first render.
 *
 * Re-selecting the accent already in force is a no-op. Announcing a repaint
 * that cannot change anything would just make the event stop meaning
 * "something moved".
 */
function applyAccent(accent: AccentColor): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root.getAttribute(ACCENT_ATTRIBUTE) === accent) return;
  root.setAttribute(ACCENT_ATTRIBUTE, accent);
  writeStoredAccent(accent);
  resetPaletteCache(accent);
}

export default function AccentSwitcher() {
  // Seeded with the default rather than read from storage during render:
  // the server cannot see localStorage, so reading it here would make the
  // first client render disagree with the server HTML and React would throw a
  // hydration mismatch on every page load that has a stored preference.
  const [accent, setAccent] = useState<AccentColor>(
    DEFAULT_ACCENT as AccentColor,
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const swatchRefs = useRef<Array<HTMLButtonElement | null>>([]);
  /** Set by keyboard nav so the effect below moves focus; never on mount. */
  const focusPendingRef = useRef(false);
  const labelId = useId();

  const motion = useMotionScope(rootRef, {
    defaults: { duration: durations.enter * 1000, ease: easings.expoOut },
  });

  // Rehydrate. Layout-effect so the browser does not get to paint the server's
  // cyan before the correction lands.
  useIsoLayoutEffect(() => {
    const stored = readStoredAccent() ?? (DEFAULT_ACCENT as AccentColor);
    setAccent(stored);
    // Repairs a corrupt stored value rather than leaving it to rot. Runs even
    // when `applyAccent` below short-circuits on an unchanged attribute.
    writeStoredAccent(stored);
    applyAccent(stored);
  }, []);

  // Entrance: one orchestrated cascade as the chat sheet opens. `useMotionScope`
  // hands the callback a null scope under reduced motion or in jsdom, and the
  // resting state below is the finished frame, so nothing has to be undone.
  useEffect(() => {
    if (!canAnimate()) return;
    motion.run((scope) => {
      if (!scope) return;
      animate('[data-accent-swatch]', {
        opacity: [0, 1],
        translateY: [6, 0],
        duration: durations.enter * 1000,
        ease: easings.expoOut,
        delay: stagger(durations.stagger * 1000, { from: 'first' }),
      });
    });
  }, [motion]);

  const select = useCallback((next: AccentColor) => {
    setAccent(next);
    applyAccent(next);
  }, []);

  // Arrow keys move focus AND commit, per the ARIA radio-group pattern. The
  // newly selected cell takes the roving tab stop, so tabbing out and back
  // returns to where the visitor left off.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const current = ACCENTS.indexOf(accent);
      let nextIndex: number;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (current + 1) % ACCENTS.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (current - 1 + ACCENTS.length) % ACCENTS.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = ACCENTS.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      focusPendingRef.current = true;
      select(ACCENTS[nextIndex]);
    },
    [accent, select],
  );

  // Runs after the commit that followed a key press. The ref guard is what
  // keeps it from stealing focus on mount or on rehydration.
  useEffect(() => {
    if (!focusPendingRef.current) return;
    focusPendingRef.current = false;
    swatchRefs.current[ACCENTS.indexOf(accent)]?.focus();
  }, [accent]);

  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-labelledby={labelId}
      className="flex flex-col gap-1"
    >
      {/* Module header. The label sits above the swatches rather than beside
          them: at 44px minimum per target the row is 274px wide, and inline it
          pushed the panel past a 320px viewport. Above, the same word costs the
          row nothing and the hairline rule — the `HudChrome` divider idiom —
          fills the width it frees up. It stays visible at every size, so the
          group's accessible name is always on screen and never icon-only. */}
      <div className="flex items-center gap-2">
        <span
          id={labelId}
          className="font-display text-[10px] uppercase leading-none tracking-[2px]"
          style={{ color: 'var(--fg-3)' }}
        >
          Accent
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1"
          style={{ background: 'var(--border-subtle)' }}
        />
      </div>

      {/* `flex-wrap` is a floor, not a breakpoint strategy: the panel is
          shrink-to-fit, so this only ever engages below ~292px, where a
          second row beats a clipped one. Width is 292px under `sm` (twelve
          clear of a 320px viewport) and 300px from `sm` up. */}
      <div className="flex flex-wrap items-center justify-center gap-0.5">
        {ACCENTS.map((name, index) => {
          const isSelected = name === accent;
          return (
            <button
              key={name}
              ref={(el) => {
                swatchRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              data-accent-swatch={name}
              onClick={() => select(name)}
              onKeyDown={handleKeyDown}
              className="relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1.5 px-0 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]"
            >
              {isSelected && (
                <span
                  aria-hidden="true"
                  data-accent-bracket
                  className="pointer-events-none absolute inset-x-1 top-0 h-px"
                  style={{ background: `var(--neon-${name})` }}
                />
              )}

              <span
                aria-hidden="true"
                className="block rounded-full transition-[transform,background-color,box-shadow] duration-150"
                style={{
                  width: 10,
                  height: 10,
                  transform: `scale(${isSelected ? 1.2 : 0.66})`,
                  // `color-mix` rather than a Tailwind `/40` modifier: nothing
                  // can alpha-modify a bare `var()`, and Tailwind 3.4 silently
                  // emits nothing at all for `border-[var(--x)]/30`.
                  background: isSelected
                    ? `var(--neon-${name})`
                    : `color-mix(in srgb, var(--neon-${name}) 42%, var(--bg-3))`,
                  boxShadow: isSelected
                    ? `0 0 10px var(--glow-${name})`
                    : 'none',
                }}
              />

              <span
                className="font-display text-[8px] uppercase leading-none tracking-[0.1em] transition-colors duration-150"
                style={{ color: isSelected ? 'var(--fg-1)' : 'var(--fg-3)' }}
              >
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {/*
        The radio pattern already announces the new checked state, but only if
        focus moved with it — which it does not on a pointer click. This is the
        only channel that tells a screen-reader user on a virtual cursor that
        the whole page just changed colour.
      */}
      <span aria-live="polite" className="sr-only">
        Accent set to {accent}
      </span>
    </div>
  );
}
