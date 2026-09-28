// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css

export type AccentColor = 'cyan' | 'violet' | 'coral' | 'amber' | 'lime' | 'ice';

export const accentConfig: Record<AccentColor, { color: string; glow: string; shadow: string }> = {
  cyan: {
    color: '#3df2ff',
    glow: 'rgba(61, 242, 255, 0.35)',
    shadow: '0 0 18px #3df2ff',
  },
  violet: {
    color: '#7c5cff',
    glow: 'rgba(124, 92, 255, 0.35)',
    shadow: '0 0 18px #7c5cff',
  },
  coral: {
    color: '#ff4d6d',
    glow: 'rgba(255, 77, 109, 0.35)',
    shadow: '0 0 18px #ff4d6d',
  },
  amber: {
    color: '#ffb020',
    glow: 'rgba(255, 176, 32, 0.35)',
    shadow: '0 0 18px #ffb020',
  },
  lime: {
    color: '#4dffa6',
    glow: 'rgba(77, 255, 166, 0.35)',
    shadow: '0 0 18px #4dffa6',
  },
  ice: {
    color: '#9be8ff',
    glow: 'rgba(155, 232, 255, 0.35)',
    shadow: '0 0 18px #9be8ff',
  },
} as const;

// Durations in seconds (derived from --dur-* ms values)
export const generatedDurations = {
  150: 0.15,
  200: 0.2,
  300: 0.3,
  500: 0.5,
  counter: 2.4,
  draw: 1.4,
  drift: 12,
  enter: 0.64,
  exit: 0.4,
  hover: 0.28,
  morph: 1.6,
  pulse: 1.5,
  sceneIntro: 1.8,
  scramble: 1.2,
  scroll: 0.8,
  shimmer: 2.4,
  splashAct: 0.7,
  splashFull: 5.2,
  spring: 0.9,
  stagger: 0.06,
  tap: 0.1,
  transition: 0.35,
  typing: 1.8,
} as const;

// Raw duration strings as authored in tokens.css
export const generatedDurationsRaw = {
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  counter: '2400ms',
  draw: '1400ms',
  drift: '12000ms',
  enter: '640ms',
  exit: '400ms',
  hover: '280ms',
  morph: '1600ms',
  pulse: '1500ms',
  sceneIntro: '1800ms',
  scramble: '1200ms',
  scroll: '800ms',
  shimmer: '2400ms',
  splashAct: '700ms',
  splashFull: '5200ms',
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
  expoInOut: 'cubic-bezier(0.87, 0, 0.13, 1)',
  expoOut: 'cubic-bezier(0.19, 1, 0.22, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  inCubic: 'cubic-bezier(0.32, 0, 0.67, 0)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  inOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  inQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  linear: 'linear',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  outCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
  outExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  outQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  quadIn: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  quadOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  scene: 'cubic-bezier(0.16, 1, 0.3, 1)',
  sineInOut: 'cubic-bezier(0.37, 0, 0.63, 1)',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// Glow halos (derived from --glow-*)
export const generatedGlow = {
  amber: 'rgba(255, 176, 32, 0.35)',
  coral: 'rgba(255, 77, 109, 0.35)',
  coralZone: 'rgba(255, 77, 109, 0.05)',
  cyan: 'rgba(61, 242, 255, 0.35)',
  cyan30: 'rgba(61, 242, 255, 0.3)',
  cyan60: 'rgba(61, 242, 255, 0.6)',
  cyanFaint: 'rgba(61, 242, 255, 0.1)',
  cyanZone: 'rgba(61, 242, 255, 0.06)',
  focus: 'rgba(61, 242, 255, 0.3)',
  focusStrong: 'rgba(61, 242, 255, 0.5)',
  ice: 'rgba(155, 232, 255, 0.35)',
  lime: 'rgba(77, 255, 166, 0.35)',
  violet: 'rgba(124, 92, 255, 0.35)',
  violetZone: 'rgba(124, 92, 255, 0.05)',
} as const;

export const generatedGlowSm = {
  amber: 'rgba(255, 176, 32, 0.15)',
  coral: 'rgba(255, 77, 109, 0.15)',
  cyan: 'rgba(61, 242, 255, 0.15)',
  ice: 'rgba(155, 232, 255, 0.15)',
  lime: 'rgba(77, 255, 166, 0.15)',
  violet: 'rgba(124, 92, 255, 0.15)',
} as const;

// Spring presets (derived from --spring-*)
export const generatedSprings = {
  bouncy: {"stiffness":150,"damping":8},
  card: {"stiffness":150,"damping":14},
  gentle: {"stiffness":120,"damping":14},
  hard: {"stiffness":300,"damping":20},
  scene: {"stiffness":90,"damping":18,"mass":1.2},
  snap: {"stiffness":260,"damping":26},
  snappy: {"stiffness":240,"damping":18},
  soft: {"stiffness":100,"damping":10},
  stiff: {"stiffness":200,"damping":15},
} as const;

// Wash surfaces (derived from --wash-*)
export const generatedWash: Record<string, string> = {
  amber: 'rgba(255, 176, 32, 0.08)',
  amberStrong: 'rgba(255, 176, 32, 0.15)',
  coral: 'rgba(255, 77, 109, 0.08)',
  coralStrong: 'rgba(255, 77, 109, 0.15)',
  cyan: 'rgba(61, 242, 255, 0.08)',
  cyanStrong: 'rgba(61, 242, 255, 0.15)',
  ice: 'rgba(155, 232, 255, 0.08)',
  iceStrong: 'rgba(155, 232, 255, 0.15)',
  lime: 'rgba(77, 255, 166, 0.08)',
  limeStrong: 'rgba(77, 255, 166, 0.15)',
  violet: 'rgba(124, 92, 255, 0.08)',
  violetStrong: 'rgba(124, 92, 255, 0.15)',
} as const;

// Grid lattice (derived from --grid-*)
export const generatedGrid: Record<string, string> = {
  1: 'rgba(146, 176, 224, 0.035)',
  2: 'rgba(146, 176, 224, 0.06)',
  3: 'rgba(146, 176, 224, 0.08)',
} as const;

// Surface elevation (derived from --surface-*)
export const generatedSurface: Record<string, string> = {
  0: 'var(--bg-void)',
  1: 'var(--bg-1)',
  2: 'var(--bg-2)',
  3: 'var(--bg-3)',
  overlay: 'rgba(4, 6, 12, 0.88)',
  raised: '#1e2740',
} as const;

// Ring/stroke aliases (derived from --ring-*)
export const generatedRing: Record<string, string> = {
  amber: 'var(--neon-amber)',
  coral: 'var(--neon-coral)',
  cyan: 'var(--neon-cyan)',
  ice: 'var(--neon-ice)',
  lime: 'var(--neon-lime)',
  violet: 'var(--neon-violet)',
} as const;
