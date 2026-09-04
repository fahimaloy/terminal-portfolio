// src/config/animations.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   ANIMATION CONFIGURATION — Centralized animation presets, tokens, and factories
   All components import from here to ensure consistent timing, easing, and behavior.
   Uses Anime.js v4 under the hood.
═══════════════════════════════════════════════════════════════════════════════ */

import { createScope, spring } from 'animejs';

// Type aliases for Anime.js options (avoids importing internal types)
type StaggerOptions = Record<string, unknown>;
type EasingFunction = string | number | ((v: number) => number);

// ── Accent Types ─────────────────────────────────────────────────────────────
export type AccentColor =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'red'
  | 'purple'
  | 'blue';

// ── Duration Tokens (mirrors CSS --dur-* tokens) ────────────────────────────
export const durations = {
  tap: 0.12, // 120ms
  hover: 0.24, // 240ms
  enter: 0.48, // 480ms
  exit: 0.32, // 320ms
  stagger: 0.08, // 80ms between items
  slide: 0.32, // 320ms
  pulse: 1.2, // 1200ms
  typing: 2.0, // 2000ms
  scramble: 1.5, // 1500ms
  draw: 1.2, // 1200ms
  morph: 2.0, // 2000ms
  transition: 0.3, // 300ms
  spring: 0.8, // 800ms
  scroll: 0.6, // 600ms
  counter: 2.0, // 2000ms
} as const;

// ── Easing Presets ───────────────────────────────────────────────────────────
export const easings = {
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  expoIn: 'inExpo',
  expoOut: 'outExpo',
  expoInOut: 'inOutExpo',
  circIn: 'inCirc',
  circOut: 'outCirc',
  circInOut: 'inOutCirc',
  quadIn: 'inQuad',
  quadOut: 'outQuad',
  quadInOut: 'inOutQuad',
  sineIn: 'inSine',
  sineOut: 'outSine',
  sineInOut: 'inOutSine',
  bounceOut: 'outBounce',
  backOut: 'outBack',
  elasticOut: 'outElastic',
} as const;

// ── Spring Presets (Anime.js v4 spring() parameters) ───────────────────────
export const springs = {
  stiff: { stiffness: 200, damping: 15 }, // snappy
  soft: { stiffness: 100, damping: 10 }, // soft
  bouncy: { stiffness: 120, damping: 6 }, // bouncy
  gentle: { stiffness: 80, damping: 12 }, // gentle
  hard: { stiffness: 300, damping: 20 }, // hard stop
} as const;

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
 * Neon glow pulse animation parameters.
 */
export const pulseGlow = {
  boxShadow: [
    '0 0 10px rgba(0, 240, 255, 0.3)',
    '0 0 20px rgba(0, 240, 255, 0.6)',
    '0 0 10px rgba(0, 240, 255, 0.3)',
  ],
  duration: durations.pulse,
  loop: true,
  alternate: true,
  ease: easings.sineInOut,
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
 * Line drawing parameters for SVG.
 */
export const drawPreset = {
  draw: '0 1',
  duration: durations.draw,
  ease: easings.expoOut,
  delay: 100,
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
// Mirrors src/styles/tokens.css (--neon-*, --glow-*). Keep hex values identical
// to tokens.css; tokens.css remains the single source of truth for color.
export const accentConfig: Record<
  AccentColor,
  { color: string; glow: string; shadow: string }
> = {
  yellow: {
    color: '#ffaa00',
    glow: 'rgba(255, 170, 0, 0.5)',
    shadow: '0 0 18px #ffaa00',
  },
  magenta: {
    color: '#ff00aa',
    glow: 'rgba(255, 0, 170, 0.5)',
    shadow: '0 0 18px #ff00aa',
  },
  cyan: {
    color: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.5)',
    shadow: '0 0 18px #00f0ff',
  },
  green: {
    color: '#39ff14',
    glow: 'rgba(57, 255, 20, 0.5)',
    shadow: '0 0 18px #39ff14',
  },
  red: {
    color: '#ff3355',
    glow: 'rgba(255, 51, 85, 0.5)',
    shadow: '0 0 18px #ff3355',
  },
  purple: {
    color: '#8a2be2',
    glow: 'rgba(138, 43, 226, 0.5)',
    shadow: '0 0 18px #8a2be2',
  },
  blue: {
    color: '#00aaff',
    glow: 'rgba(0, 170, 255, 0.5)',
    shadow: '0 0 18px #00aaff',
  },
};

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
