// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css

export type AccentColor = 'yellow' | 'magenta' | 'cyan' | 'green' | 'red' | 'purple' | 'blue';

export const accentConfig: Record<AccentColor, { color: string; glow: string; shadow: string }> = {
  yellow: {
    color: '#ffcc2a',
    glow: 'rgba(255, 204, 42, 0.22)',
    shadow: '0 0 18px #ffcc2a',
  },
  magenta: {
    color: '#e962bf',
    glow: 'rgba(233, 98, 191, 0.22)',
    shadow: '0 0 18px #e962bf',
  },
  cyan: {
    color: '#26f2d5',
    glow: 'rgba(38, 242, 213, 0.22)',
    shadow: '0 0 18px #26f2d5',
  },
  green: {
    color: '#8dff55',
    glow: 'rgba(141, 255, 85, 0.22)',
    shadow: '0 0 18px #8dff55',
  },
  red: {
    color: '#ff4b4b',
    glow: 'rgba(255, 75, 75, 0.22)',
    shadow: '0 0 18px #ff4b4b',
  },
  purple: {
    color: '#a369ff',
    glow: 'rgba(163, 105, 255, 0.22)',
    shadow: '0 0 18px #a369ff',
  },
  blue: {
    color: '#4d9cff',
    glow: 'rgba(77, 156, 255, 0.22)',
    shadow: '0 0 18px #4d9cff',
  },
} as const;

// Durations in seconds (derived from --dur-* ms values)
export const generatedDurations = {
  150: 0.15,
  200: 0.2,
  300: 0.3,
  500: 0.5,
  700: 0.7,
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
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
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
  inOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  inQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  linear: 'linear',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  outQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// Glow halos (derived from --glow-*)
export const generatedGlow = {
  blue: 'rgba(77, 156, 255, 0.22)',
  cyan: 'rgba(38, 242, 213, 0.22)',
  cyan30: 'rgba(38, 242, 213, 0.14)',
  cyan60: 'rgba(38, 242, 213, 0.22)',
  cyanFaint: 'rgba(38, 242, 213, 0.08)',
  cyanGrid: 'rgba(38, 242, 213, 0.04)',
  cyanMid: 'rgba(38, 242, 213, 0.1)',
  cyanSoft: 'rgba(38, 242, 213, 0.16)',
  cyanZone: 'rgba(38, 242, 213, 0.06)',
  green: 'rgba(141, 255, 85, 0.22)',
  greenSoft: 'rgba(141, 255, 85, 0.16)',
  greenZone: 'rgba(141, 255, 85, 0.06)',
  magenta: 'rgba(233, 98, 191, 0.22)',
  magentaMid: 'rgba(233, 98, 191, 0.1)',
  magentaSoft: 'rgba(233, 98, 191, 0.16)',
  magentaZone: 'rgba(233, 98, 191, 0.06)',
  purple: 'rgba(163, 105, 255, 0.22)',
  red: 'rgba(255, 75, 75, 0.22)',
  yellow: 'rgba(255, 204, 42, 0.22)',
  yellowSoft: 'rgba(255, 204, 42, 0.16)',
  yellowZone: 'rgba(255, 204, 42, 0.06)',
} as const;

export const generatedGlowSm = {
  blue: 'rgba(77, 156, 255, 0.12)',
  cyan: 'rgba(38, 242, 213, 0.12)',
  green: 'rgba(141, 255, 85, 0.12)',
  magenta: 'rgba(233, 98, 191, 0.12)',
  purple: 'rgba(163, 105, 255, 0.12)',
  red: 'rgba(255, 75, 75, 0.12)',
  yellow: 'rgba(255, 204, 42, 0.12)',
} as const;

// Spring presets (derived from --spring-*)
export const generatedSprings = {
  bouncy: {"stiffness":120,"damping":6},
  card: {"stiffness":150,"damping":14},
  gentle: {"stiffness":90,"damping":14},
  snappy: {"stiffness":240,"damping":18},
  soft: {"stiffness":100,"damping":10},
  stiff: {"stiffness":200,"damping":15},
  wobbly: {"stiffness":180,"damping":12},
} as const;

// Wash surfaces (derived from --wash-*)
export const generatedWash: Record<string, string> = {
  blue: 'rgba(77, 156, 255, 0.1)',
  cyan: 'rgba(38, 242, 213, 0.12)',
  cyanStrong: 'rgba(38, 242, 213, 0.18)',
  green: 'rgba(141, 255, 85, 0.12)',
  greenStrong: 'rgba(141, 255, 85, 0.18)',
  magenta: 'rgba(233, 98, 191, 0.12)',
  magentaStrong: 'rgba(233, 98, 191, 0.18)',
  purple: 'rgba(163, 105, 255, 0.1)',
  red: 'rgba(255, 75, 75, 0.1)',
  yellow: 'rgba(255, 204, 42, 0.12)',
  yellowStrong: 'rgba(255, 204, 42, 0.18)',
} as const;

// Grid lattice (derived from --grid-*)
export const generatedGrid: Record<string, string> = {
  1: 'rgba(246, 244, 242, 0.04)',
  2: 'rgba(246, 244, 242, 0.06)',
  3: 'rgba(246, 244, 242, 0.08)',
} as const;

// Surface elevation (derived from --surface-*)
export const generatedSurface: Record<string, string> = {
  0: 'var(--bg-1)',
  1: 'var(--bg-2)',
  2: 'var(--bg-3)',
  3: 'var(--bg-4)',
  overlay: 'rgba(42, 41, 40, 0.86)',
  raised: '#31302f',
} as const;

// Retro blog theme (derived from --retro-*)
export const generatedRetro: Record<string, string> = {
  amber: '#ff8c2a',
  amberSoft: 'rgba(255, 140, 42, 0.14)',
  amberStrong: 'rgba(255, 140, 42, 0.22)',
  ink: '#1a1a18',
  inkSoft: '#3a3936',
  paper: '#faf8f5',
  paperSoft: '#f3efe8',
} as const;

// Ring/stroke aliases (derived from --ring-*)
export const generatedRing: Record<string, string> = {
  blue: 'var(--neon-blue)',
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-green)',
  magenta: 'var(--neon-magenta)',
  purple: 'var(--neon-purple)',
  red: 'var(--neon-red)',
  yellow: 'var(--neon-yellow)',
} as const;
