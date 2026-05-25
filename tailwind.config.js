module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: { DEFAULT: '#0a0a0f', elevated: '#111118', card: '#1a1a2e' },
        accent: {
          purple: '#8B5CF6', cyan: '#06B6D4', pink: '#EC4899',
          lime: '#10B981', orange: '#F97316', yellow: '#EAB308',
        },
        surface: { muted: '#1E293B', border: '#334155', glass: 'rgba(15,23,42,0.6)' },
      },
      borderRadius: { xl: '16px', '2xl': '24px' },
      animation: {
        'mesh-shift': 'meshShift 25s ease-in-out infinite alternate',
        'orb-float': 'orbFloat 20s ease-in-out infinite',
        'particle-drift': 'particleDrift 18s linear infinite',
        'particle-drift-slow': 'particleDrift 25s linear infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-scale': 'fadeInScale 0.3s ease-out',
        'border-beam': 'borderBeamRotate 6s linear infinite',
        'card-shine': 'cardShine 4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: { '0%,100%': { opacity: '0.3' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
};
