// src/config/animations.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   ANIMATION CONFIGURATION — Centralized animation presets, tokens, and factories
   All components import from here to ensure consistent timing, easing, and behavior.
   Uses Anime.js v4 under the hood.
═══════════════════════════════════════════════════════════════════════════════ */

import { createScope, spring } from 'animejs';
import {
  accentConfig as generatedAccentConfig,
  generatedDurations,
  generatedEasings,
  generatedSprings,
  type AccentColor as GeneratedAccentColor,
} from './generated/tokens.generated';

// Type aliases for Anime.js options (avoids importing internal types)
type StaggerOptions = Record<string, unknown>;
type EasingFunction = string | number | ((v: number) => number);

// ── Accent Types ─────────────────────────────────────────────────────────────
// One vocabulary for the whole app: 3 primary (cyan / violet / coral) + 3
// support (amber / lime / ice). Previously each component declared its own
// union plus "legacy aliases for backward compatibility", which is how a
// 15-hue palette grew. New components import `AccentColor`; they do not
// re-declare it.
export type AccentColor = GeneratedAccentColor;

// ── Duration Tokens — derived from tokens.css via generated file ───────────
// tokens.css is single source of truth (AGENTS.md: Design-token contract).
// generatedDurations/generatedEasings are produced by scripts/generate-tokens.mjs.
// Re-export under legacy names so existing imports keep working; values are
// validated by `npm run tokens:check` so drift fails CI rather than silently.
export const durations: Record<string, number> =
  generatedDurations as unknown as Record<string, number>;
export const easings: Record<string, string> =
  generatedEasings as unknown as Record<string, string>;

// ── Spring Presets (Anime.js v4 spring() parameters) ───────────────────────
// Single source of truth: tokens.css --spring-* via generatedSprings.
export const springs = generatedSprings;

// ── Default Options ──────────────────────────────────────────────────────────
export const defaults = {
  // Global animation defaults
  duration: durations.enter,
  ease: easings.expoOut,
  composition: 'blend' as const,
  autoplay: true,
  reducedMotionDuration: 0,
} as const;

// ── Stagger Presets ──────────────────────────────────────────────────────────
export const staggers = {
  // Standard stagger options for lists and grids
  list: {
    delay: durations.stagger * 1000,
    ease: easings.quadOut,
  },
  grid: {
    delay: durations.stagger * 1000,
    from: 'center' as const,
    grid: [13, 13],
  },
  center: {
    delay: durations.stagger * 1000,
    from: 'center' as const,
  },
  first: {
    delay: durations.stagger * 1000,
    from: 'first' as const,
  },
  last: {
    delay: durations.stagger * 1000,
    from: 'last' as const,
  },
  random: {
    delay: durations.stagger * 1000,
    from: 'random' as const,
  },
} as const;

// ── Scroll Trigger Presets ───────────────────────────────────────────────────
export const scrollTriggers = {
  // Reveal when element enters viewport (play once)
  reveal: {
    sync: false,
    follow: false,
    start: 'top 80%',
    threshold: 0,
  },
  // Follow scroll position (loop)
  follow: {
    sync: true,
    threshold: 0,
  },
  // Play when centered
  center: {
    sync: false,
    follow: false,
    start: 'top center',
    end: 'bottom center',
    threshold: 0.5,
  },
} as const;

// ── Preset Animation Factories ───────────────────────────────────────────────

/**
 * Creates a reusable scope for a React component with media query support.
 * Always call scope.revert() in cleanup.
 */
export function createComponentScope(root: HTMLElement | string) {
  const prefersReduced = isReducedMotion();

  return createScope({
    root,
    mediaQueries: {
      isSmall: '(max-width: 768px)',
      isTablet: '(max-width: 1024px)',
      isDesktop: '(min-width: 1025px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
      portrait: '(orientation: portrait)',
      landscape: '(orientation: landscape)',
    },
    defaults: {
      duration: prefersReduced ? 0 : durations.enter * 1000,
      ease: easings.expoOut,
    },
  });
}

/**
 * Standard stagger delay for lists based on item index.
 */
export function getStaggerDelay(
  index: number,
  baseDelay: number = durations.stagger,
  maxDelay: number = 0.5,
): number {
  return Math.min(index * baseDelay, maxDelay);
}

/**
 * Returns duration adjusted for reduced motion preference.
 */
export function getReducedDuration(
  duration: number,
  reduced: boolean = false,
): number {
  return reduced ? 0 : duration;
}

/**
 * The house card lift, as a CSS `transition` VALUE — one string, shared
 * verbatim by `InlineProjectCard`, `ProjectPreview`'s tab strip and
 * `SkillCard` (`src/components/InlineProjectCard.tsx`,
 * `src/components/ProjectPreview.tsx`, `src/components/SkillCard.tsx`).
 *
 * It lives here rather than in three module-local copies for two reasons. One,
 * the three cards must not be able to drift: the whole point of "the house
 * lift" is that a card behaves the same wherever it appears, and three copies
 * of a string is three chances to get one of them subtly wrong (which is
 * exactly what had happened — `InlineProjectCard` shipped a `duration-200`
 * Tailwind class while `ProjectPreview` still carried an 8px glow map). Two,
 * this module is the hand-written seam that re-exports
 * `src/config/generated/tokens.generated.ts`, so it is the one place that may
 * name a token var without pulling a generated file into a component.
 *
 * WHY A VAR AND NOT A `duration-*` CLASS — `tailwind.tokens.generated.js`
 * compiles `duration-200` to a LITERAL `200ms`, and a literal cannot see the
 * reduced-motion block in `tokens.css` that collapses `--dur-hover` to `0ms`.
 * So a Tailwind class silently ignores a visitor who asked for less motion.
 * Reading `--dur-hover` as a custom property means that block reaches them:
 * an instant, still visible, still legible state change, with no JS and no
 * render-time branch.
 *
 * Only `transform` and `box-shadow` are transitioned — the two properties the
 * lift actually touches. `transition: all` would also animate the ripple disc's
 * own opacity and would re-run layout on every frame.
 *
 * THE LIFT RIDES ON THE INTERACTIVE ELEMENT, never on the `HudPanel` inside
 * it: `HudPanel` owns the panel root and its entrance animation writes and then
 * clears inline `opacity`/`transform`/`transition` on exactly that node
 * (`src/components/ui/HudPanel.tsx`), so a transition declared there is erased
 * on mount. `SkillCard` is the one card where the panel IS the surface — it is
 * safe there only because that call site already passes `enter={false}`, which
 * makes the entrance effect return before it writes anything.
 */
export const HOVER_LIFT_TRANSITION =
  'transform var(--dur-hover) var(--ease-out), box-shadow var(--dur-hover) var(--ease-out)';

/**
 * Standard hover animation parameters for interactive elements.
 * Uses blend composition for smooth combination with base animations.
 */
export const hoverAnim = {
  scale: 1.02,
  duration: durations.hover,
  ease: easings.quadOut,
  composition: 'blend' as const,
};

/**
 * Standard tap/press animation parameters.
 */
export const tapAnim = {
  scale: 0.96,
  duration: durations.tap,
  ease: easings.quadOut,
  composition: 'blend' as const,
};

/**
 * Standard entrance animation parameters.
 */
export const entranceAnim = {
  opacity: [0, 1],
  y: [20, 0],
  duration: durations.enter,
  ease: easings.expoOut,
};

/**
 * Standard exit animation parameters.
 */
export const exitAnim = {
  opacity: [1, 0],
  y: [0, -20],
  duration: durations.exit,
  ease: easings.quadIn,
};

/**
 * Subtle opacity pulse — muted editorial (no neon glow).
 * Kept as pulseGlow for compat; no boxShadow.
 */
export const pulseGlow = {
  opacity: [0.96, 1] as [number, number],
  duration: durations.pulse,
  ease: easings.smooth ?? easings.sineInOut,
};

/**
 * Scramble text reveal parameters.
 */
export const scramblePreset = {
  duration: durations.scramble,
  ease: easings.expoOut,
  cursor: '█',
  cursorSpeed: 60,
  scrambleSpeed: 30,
  settleSpeed: 30,
  scrambleCharacters: 'numbers' as const,
};

/**
 * Text split + stagger entrance parameters.
 */
export const textStaggerPreset = {
  opacity: [0, 1],
  y: [10, 0],
  duration: durations.hover,
  ease: easings.quadOut,
};

/**
 * Morph transition parameters for SVG.
 */
export const morphPreset = {
  duration: durations.morph,
  ease: easings.expoInOut,
};

/**
 * Grid layout stagger for masonry/grid animations.
 */
export const gridStagger = (
  rows: number,
  cols: number,
  options: Partial<StaggerOptions> = {},
) => ({
  delay: staggers.grid.delay,
  grid: [cols, rows],
  from: 'center' as const,
  ...options,
});

// ── Accent Helpers ───────────────────────────────────────────────────────────
// Re-export generated tokens — single source of truth is src/styles/tokens.css
export const accentConfig = generatedAccentConfig;

// ── Media Query Helpers ──────────────────────────────────────────────────────
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * True only in a real browser that is willing to run motion.
 * Returns false during SSR and in test environments (jsdom has no matchMedia),
 * so components must render their final resting value rather than an
 * animation start frame.
 */
export function canAnimate(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return !isReducedMotion();
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
