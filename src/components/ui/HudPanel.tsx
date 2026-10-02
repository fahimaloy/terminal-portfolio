// src/components/ui/HudPanel.tsx
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import {
  canAnimate,
  durations,
  easings,
  isReducedMotion,
} from '../../config/animations';
import { GlitchAccent } from './GlitchText';
import GridLattice from './graphics/primitives/GridLattice';

const ACCENT_COLOR: Record<GlitchAccent, string> = {
  cyan: 'var(--neon-cyan)',
  violet: 'var(--neon-violet)',
  coral: 'var(--neon-coral)',
  amber: 'var(--neon-amber)',
  lime: 'var(--neon-lime)',
  ice: 'var(--neon-ice)',
};

/**
 * Layout effect on the client, passive on the server: this panel is server
 * rendered and `useLayoutEffect` warns when it is. Same guard as
 * `HeroSection` and `AccentSwitcher`.
 */
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Entrance travel, in px. A distance, not a timing, so it is deliberately not
 * a `--dur-*` token — the same reasoning that keeps the scene's simulation
 * constants in `ambient.ts` rather than `tokens.css`. Eight pixels reads as a
 * surface powering on; more than that reads as a card sliding, which is the
 * wrong idiom for a container whose children animate inside it.
 */
const ENTER_RISE_PX = 8;

type Props = React.HTMLAttributes<HTMLDivElement> & {
  accent?: GlitchAccent;
  title?: string;
  innerClassName?: string;
  /** AAA wash — saturated tint behind card (Out-of-Actions grade) */
  wash?: boolean;
  /** Subtle HUD grid on card back */
  grid?: boolean;
  /**
   * One-shot arrival on mount: a short fade plus `ENTER_RISE_PX` of rise,
   * animated on the panel ROOT so it never competes with the entrance
   * animation of the content inside it.
   *
   * Turn it off where motion is decoration rather than information:
   *
   *   - the admin panel, which is dense and functional and shares this file
   *     with the public site — pass `enter={false}` there;
   *   - a parent that already staggers this panel (a grid's `y`/`opacity`
   *     cascade), so the two do not compound into a mush;
   *   - a call site that sets its own resting opacity or transform.
   */
  enter?: boolean;
};

export default function HudPanel({
  accent = 'amber',
  title,
  className = '',
  innerClassName = '',
  wash = false,
  grid = false,
  enter = true,
  children,
  ...rest
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  // One-shot entrance. Mount is the ONLY trigger: `[]` deps means a re-render
  // from a new title, a new accent or new children cannot replay it, and a
  // panel that re-renders on every keystroke of the composer above it cannot
  // flicker.
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!enter || !root) return;

    // `canAnimate()` as well as `isReducedMotion()`: `canAnimate()` is also
    // false during SSR and in jsdom (no `matchMedia`), and the repo rule is
    // that a component renders its final resting value when motion cannot run.
    // This panel has NO CSS resting state to fall back on — deliberately no
    // `opacity-0` class, because it is server-rendered in ~60 places and a
    // hidden default would leave the markup blank for anyone whose JS never
    // runs. So the skipped path writes nothing at all and the plain CSS
    // resting state IS the correct resting state.
    if (isReducedMotion() || !canAnimate()) return;

    // Written before the first paint. anime applies the tween's first frame on
    // its own rAF tick, which is AFTER the browser has already painted this
    // element — without this the panel would appear fully formed for one
    // frame and then snap back to transparent. Opacity and transform only:
    // nothing here can trigger layout, which matters with a WebGL canvas
    // running behind it.
    root.style.opacity = '0';
    root.style.transform = `translate3d(0, ${ENTER_RISE_PX}px, 0)`;

    // Several call sites own a transform transition on this same node for
    // their hover lift (`group-hover:scale-[1.015] transition-transform
    // duration-200` on the project cards). A CSS transition on `transform`
    // restarts on every per-frame write, which would smear this 300ms rise
    // into a laggy drift. Suppress it for the length of the entrance only.
    root.style.transition = 'none';

    const clearEntranceStyles = () => {
      // Removing the inline values hands the node back to the call site's own
      // CSS. Leaving anime's end values inline would silently win over
      // `group-hover:scale-[1.015]` on the project cards and over the
      // deliberate `opacity-60` on an inactive preview tab, and neither of
      // those call sites passes a `ref` or an inline `style` to undo it.
      root.style.opacity = '';
      root.style.transform = '';
      root.style.transition = '';
    };

    const scope = createScope({ root });
    scope.add(() => {
      animate(root, {
        opacity: [0, 1],
        translateY: [ENTER_RISE_PX, 0],
        // 300ms / outExpo is the house value for a panel arriving
        // (`ConfirmDeleteModal`, the admin nav cascade). Fast enough that a
        // panel scrolling into view reads as present rather than late, and
        // `outExpo` has no overshoot — a HUD surface settles, it does not
        // bounce.
        duration: durations[300] * 1000,
        ease: easings.outExpo,
        onComplete: clearEntranceStyles,
      });
    });

    return () => {
      try {
        scope.revert();
      } catch {
        // A scope whose root was already detached throws on revert; cleanup
        // must never take the tree down with it.
      }
      clearEntranceStyles();
    };
  }, []);

  const accentColor = ACCENT_COLOR[accent];
  const baseStyle: React.CSSProperties = {
    background: wash ? `var(--wash-${accent})` : 'var(--bg-2)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    borderTop: `3px solid ${accentColor}`,
    ...(rest.style || {}),
  };

  // When wash is true, blend wash over bg-2 via backgroundImage overlay to keep depth
  if (wash) {
    baseStyle.backgroundColor = 'var(--bg-2)';
    (baseStyle as Record<string, string>).backgroundImage =
      `linear-gradient(var(--wash-${accent}), var(--wash-${accent}))`;
  }

  return (
    <div
      {...rest}
      ref={rootRef}
      className={`rounded-card relative overflow-hidden ${className}`}
      style={baseStyle}
    >
      {grid && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          aria-hidden="true"
        >
          <GridLattice opacity={1} color="var(--grid-1)" />
        </div>
      )}
      {title && (
        <div
          className="relative px-3 py-1.5 border-b font-display text-[10px] tracking-[3px] uppercase"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--fg-2)' }}
        >
          {title}
        </div>
      )}
      <div className={`relative ${innerClassName}`}>{children}</div>
    </div>
  );
}
