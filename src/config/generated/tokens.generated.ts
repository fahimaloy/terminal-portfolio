// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css

export type AccentColor = 'yellow' | 'magenta' | 'cyan' | 'green' | 'red' | 'purple' | 'blue';

export const accentConfig: Record<AccentColor, { color: string; glow: string; shadow: string }> = {
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
} as const;

// Durations in seconds (derived from --dur-* ms values)
export const generatedDurations = {
  counter: 2,
  draw: 1.2,
  enter: 0.48,
  exit: 0.32,
  hover: 0.24,
  morph: 2,
  pulse: 1.2,
  scramble: 1.5,
  scroll: 0.6,
  slide: 0.32,
  spring: 0.8,
  stagger: 0.08,
  tap: 0.12,
  transition: 0.3,
  typing: 2,
} as const;

// Raw duration strings as authored in tokens.css
export const generatedDurationsRaw = {
  counter: '2000ms',
  draw: '1200ms',
  enter: '480ms',
  exit: '320ms',
  hover: '240ms',
  morph: '2000ms',
  pulse: '1200ms',
  scramble: '1500ms',
  scroll: '600ms',
  slide: '320ms',
  spring: '800ms',
  stagger: '80ms',
  tap: '120ms',
  transition: '300ms',
  typing: '2000ms',
} as const;

// Easing strings (derived from --ease-*)
export const generatedEasings = {
  backIn: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
  backInOut: 'cubic-bezier(0.76, 0, 0.25, 1)',
  backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  elasticIn: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
  elasticInOut: 'cubic-bezier(0.7, 0, 0.3, 1.5)',
  elasticOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  expoIn: 'cubic-bezier(0.95, 0.05, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// Glow halos (derived from --glow-*)
export const generatedGlow = {
  blue: 'rgba(0, 170, 255, 0.5)',
  cyan: 'rgba(0, 240, 255, 0.5)',
  green: 'rgba(57, 255, 20, 0.5)',
  magenta: 'rgba(255, 0, 170, 0.5)',
  purple: 'rgba(138, 43, 226, 0.5)',
  red: 'rgba(255, 51, 85, 0.5)',
  yellow: 'rgba(255, 170, 0, 0.5)',
} as const;

export const generatedGlowSm = {
  blue: 'rgba(0, 170, 255, 0.15)',
  cyan: 'rgba(0, 240, 255, 0.15)',
  green: 'rgba(57, 255, 20, 0.15)',
  magenta: 'rgba(255, 0, 170, 0.15)',
  purple: 'rgba(138, 43, 226, 0.15)',
  red: 'rgba(255, 51, 85, 0.15)',
  yellow: 'rgba(255, 170, 0, 0.15)',
} as const;

// Spring presets (derived from --spring-*)
export const generatedSprings = {
  bouncy: {"stiffness":120,"damping":6},
  soft: {"stiffness":100,"damping":10},
  stiff: {"stiffness":200,"damping":15},
} as const;
