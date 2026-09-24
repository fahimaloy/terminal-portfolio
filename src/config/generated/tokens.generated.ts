// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css

export type AccentColor = 'cyan' | 'magenta' | 'amber' | 'violet' | 'rose' | 'yellow' | 'green' | 'red' | 'purple' | 'blue' | 'lime' | 'ice' | 'cyanAlt' | 'cyanTeal';

export const accentConfig: Record<AccentColor, { color: string; glow: string; shadow: string }> = {
  cyan: {
    color: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.35)',
    shadow: '0 0 18px #00f0ff',
  },
  magenta: {
    color: '#ff0088',
    glow: 'rgba(255, 0, 136, 0.35)',
    shadow: '0 0 18px #ff0088',
  },
  amber: {
    color: '#f0a020',
    glow: 'rgba(240, 160, 32, 0.35)',
    shadow: '0 0 18px #f0a020',
  },
  violet: {
    color: '#a020f0',
    glow: 'rgba(160, 32, 240, 0.35)',
    shadow: '0 0 18px #a020f0',
  },
  rose: {
    color: '#ff2a7a',
    glow: 'rgba(255, 42, 122, 0.35)',
    shadow: '0 0 18px #ff2a7a',
  },
  yellow: {
    color: '#f7d038',
    glow: 'rgba(247, 208, 56, 0.35)',
    shadow: '0 0 18px #f7d038',
  },
  green: {
    color: '#3dff88',
    glow: 'rgba(61, 255, 136, 0.35)',
    shadow: '0 0 18px #3dff88',
  },
  red: {
    color: '#ff3355',
    glow: 'rgba(255, 51, 85, 0.35)',
    shadow: '0 0 18px #ff3355',
  },
  purple: {
    color: '#c05cff',
    glow: 'rgba(192, 92, 255, 0.35)',
    shadow: '0 0 18px #c05cff',
  },
  blue: {
    color: '#3f9dff',
    glow: 'rgba(63, 157, 255, 0.35)',
    shadow: '0 0 18px #3f9dff',
  },
  lime: {
    color: '#c0ff30',
    glow: 'rgba(192, 255, 48, 0.35)',
    shadow: '0 0 18px #c0ff30',
  },
  ice: {
    color: '#7ee0ff',
    glow: 'rgba(126, 224, 255, 0.35)',
    shadow: '0 0 18px #7ee0ff',
  },
  cyanAlt: {
    color: '#22d3e3',
    glow: 'rgba(0, 0, 0, 0.5)',
    shadow: '0 0 18px #22d3e3',
  },
  cyanTeal: {
    color: '#26f2d5',
    glow: 'rgba(0, 0, 0, 0.5)',
    shadow: '0 0 18px #26f2d5',
  },
} as const;

// Durations in seconds (derived from --dur-* ms values)
export const generatedDurations = {
  1000: 1,
  150: 0.15,
  200: 0.2,
  300: 0.3,
  500: 0.5,
  700: 0.7,
  counter: 2.4,
  draw: 1.4,
  drift: 12,
  enter: 0.64,
  exit: 0.4,
  hover: 0.28,
  morph: 1.6,
  pulse: 1.5,
  scramble: 1.2,
  scroll: 0.8,
  slide: 0.4,
  spring: 0.9,
  stagger: 0.06,
  tap: 0.1,
  transition: 0.35,
  typing: 1.8,
} as const;

// Raw duration strings as authored in tokens.css
export const generatedDurationsRaw = {
  1000: '1000ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  counter: '2400ms',
  draw: '1400ms',
  drift: '12000ms',
  enter: '640ms',
  exit: '400ms',
  hover: '280ms',
  morph: '1600ms',
  pulse: '1500ms',
  scramble: '1200ms',
  scroll: '800ms',
  slide: '400ms',
  spring: '900ms',
  stagger: '60ms',
  tap: '100ms',
  transition: '350ms',
  typing: '1800ms',
} as const;

// Easing strings (derived from --ease-*)
export const generatedEasings = {
  backInOut: 'cubic-bezier(0.76, 0, 0.25, 1)',
  backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  elasticOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  expoIn: 'cubic-bezier(0.95, 0.05, 0.2, 1)',
  expoOut: 'cubic-bezier(0.19, 1, 0.22, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  inCubic: 'cubic-bezier(0.32, 0, 0.67, 0)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  inOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  inQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  linear: 'linear',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  outCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
  outQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// Glow halos (derived from --glow-*)
export const generatedGlow = {
  amber: 'rgba(240, 160, 32, 0.35)',
  blue: 'rgba(63, 157, 255, 0.35)',
  cyan: 'rgba(0, 240, 255, 0.35)',
  cyan30: 'rgba(0, 240, 255, 0.3)',
  cyan60: 'rgba(0, 240, 255, 0.6)',
  cyanFaint: 'rgba(0, 240, 255, 0.1)',
  cyanSoft: 'rgba(0, 240, 255, 0.12)',
  cyanZone: 'rgba(0, 240, 255, 0.06)',
  focus: 'rgba(0, 240, 255, 0.3)',
  focusStrong: 'rgba(0, 240, 255, 0.5)',
  green: 'rgba(61, 255, 136, 0.35)',
  ice: 'rgba(126, 224, 255, 0.35)',
  lime: 'rgba(192, 255, 48, 0.35)',
  magenta: 'rgba(255, 0, 136, 0.35)',
  magenta30: 'rgba(255, 0, 136, 0.3)',
  magentaSoft: 'rgba(255, 0, 136, 0.12)',
  magentaZone: 'rgba(255, 0, 136, 0.06)',
  purple: 'rgba(192, 92, 255, 0.35)',
  red: 'rgba(255, 51, 85, 0.35)',
  rose: 'rgba(255, 42, 122, 0.35)',
  textCyan: 'rgba(0, 240, 255, 0.45)',
  textMagenta: 'rgba(255, 0, 136, 0.2)',
  textViolet: 'rgba(160, 32, 240, 0.3)',
  violet: 'rgba(160, 32, 240, 0.35)',
  violetZone: 'rgba(160, 32, 240, 0.05)',
  yellow: 'rgba(247, 208, 56, 0.35)',
  yellowSoft: 'rgba(247, 208, 56, 0.25)',
} as const;

export const generatedGlowSm = {
  amber: 'rgba(240, 160, 32, 0.15)',
  blue: 'rgba(63, 157, 255, 0.15)',
  cyan: 'rgba(0, 240, 255, 0.15)',
  green: 'rgba(61, 255, 136, 0.15)',
  ice: 'rgba(126, 224, 255, 0.15)',
  lime: 'rgba(192, 255, 48, 0.15)',
  magenta: 'rgba(255, 0, 136, 0.15)',
  purple: 'rgba(192, 92, 255, 0.15)',
  red: 'rgba(255, 51, 85, 0.15)',
  rose: 'rgba(255, 42, 122, 0.15)',
  violet: 'rgba(160, 32, 240, 0.15)',
  yellow: 'rgba(247, 208, 56, 0.15)',
} as const;

// Spring presets (derived from --spring-*)
export const generatedSprings = {
  bouncy: {"stiffness":150,"damping":8},
  card: {"stiffness":150,"damping":14},
  elastic: {"stiffness":180,"damping":6},
  gentle: {"stiffness":120,"damping":14},
  hard: {"stiffness":300,"damping":20},
  quads: {"stiffness":240,"damping":12},
  snappy: {"stiffness":240,"damping":18},
  soft: {"stiffness":100,"damping":10},
  stiff: {"stiffness":200,"damping":15},
} as const;

// Wash surfaces (derived from --wash-*)
export const generatedWash: Record<string, string> = {
  amber: 'rgba(240, 160, 32, 0.08)',
  amberSoft: 'rgba(255, 140, 42, 0.14)',
  amberStrong: 'rgba(240, 160, 32, 0.15)',
  amberStrongBlog: 'rgba(255, 140, 42, 0.22)',
  cyan: 'rgba(0, 240, 255, 0.08)',
  cyanStrong: 'rgba(0, 240, 255, 0.15)',
  magenta: 'rgba(255, 0, 136, 0.08)',
  magentaStrong: 'rgba(255, 0, 136, 0.15)',
  rose: 'rgba(255, 42, 122, 0.08)',
  roseStrong: 'rgba(255, 42, 122, 0.15)',
  violet: 'rgba(160, 32, 240, 0.08)',
  violetStrong: 'rgba(160, 32, 240, 0.15)',
} as const;

// Grid lattice (derived from --grid-*)
export const generatedGrid: Record<string, string> = {
  1: 'rgba(232, 232, 240, 0.035)',
  2: 'rgba(232, 232, 240, 0.06)',
  3: 'rgba(232, 232, 240, 0.08)',
} as const;

// Surface elevation (derived from --surface-*)
export const generatedSurface: Record<string, string> = {
  0: 'var(--bg-void)',
  1: 'var(--bg-1)',
  2: 'var(--bg-2)',
  3: 'var(--bg-3)',
  dark1: '#353432',
  dark2: '#3f3e3d',
  dark3: '#252423',
  light1: '#f6f4f2',
  light2: '#f6f4f2',
  overlay: 'rgba(11, 12, 18, 0.88)',
  raised: '#1e2035',
} as const;

// Retro blog theme (derived from --retro-*)
export const generatedRetro: Record<string, string> = {
  amber: '#ff8c2a',
  amberSoft: 'rgba(255, 140, 42, 0.14)',
  amberStrong: 'rgba(255, 140, 42, 0.22)',
  ink: '#1e1e20',
  inkSoft: '#3a3936',
  paper: '#f5f2e8',
  paperSoft: '#ede8d8',
} as const;

// Ring/stroke aliases (derived from --ring-*)
export const generatedRing: Record<string, string> = {
  amber: 'var(--neon-amber)',
  blue: 'var(--neon-ice)',
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-lime)',
  magenta: 'var(--neon-magenta)',
  offset1: '2px',
  offset2: '4px',
  offset3: '6px',
  red: 'var(--neon-red)',
  rose: 'var(--neon-rose)',
  violet: 'var(--neon-violet)',
  width1: '1px',
  width2: '2px',
  width3: '3px',
} as const;
