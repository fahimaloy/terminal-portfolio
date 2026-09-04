// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-void': '#0a0a0a',
        'bg-smoke': '#1a1a1a',
        'bg-ash': '#2a2a2a',
        'neon-yellow': '#ffaa00',
        'neon-magenta': '#ff00aa',
        'neon-cyan': '#00f0ff',
        'neon-green': '#39ff14',
        'neon-red': '#ff3355',
        'neon-purple': '#8a2be2',
        'neon-blue': '#00aaff',
        'text-primary': '#ffffff',
        'text-secondary': '#b8b8c0',
        'text-muted': '#8a8a92',
      },
      fontFamily: {
        display: ['Audiowide', 'Orbitron', 'sans-serif'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'scanline-drift': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(4px)' },
        },
        'glitch-shift': {
          '0%, 90%, 100%': { transform: 'translate(0,0)' },
          '92%': { transform: 'translate(-1px, 0)' },
          '94%': { transform: 'translate(1px, 0)' },
          '96%': { transform: 'translate(-1px, 1px)' },
        },
        'ripple-out': {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'send-flash': {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '40%': { transform: 'scaleX(1)', transformOrigin: 'left' },
          '60%': { transform: 'scaleX(1)', transformOrigin: 'right' },
          '100%': { transform: 'scaleX(0)', transformOrigin: 'right' },
        },
        'reticle-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.2s ease-in-out infinite',
        'scanline-drift': 'scanline-drift 0.5s linear infinite',
        'glitch-shift': 'glitch-shift 4s steps(1,end) infinite',
        'send-flash': 'send-flash 0.4s var(--ease-smooth) forwards',
        'reticle-spin': 'reticle-spin 4s linear infinite',
      },
    },
  },
  plugins: [],
};
