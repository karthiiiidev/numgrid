/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Space Grotesk"', 'monospace'],
      },

      colors: {
        // Base background layers
        bg: {
          base:  '#0b1020',
          card:  '#111827',
          muted: '#1a2236',
          hover: '#1f2a40',
        },
        // Accent palette
        violet: {
          DEFAULT: '#7c3aed',
          light:   '#9d6ef8',
          dim:     'rgba(124,58,237,0.18)',
          glow:    'rgba(124,58,237,0.35)',
        },
        cyan: {
          DEFAULT: '#22d3ee',
          dim:     'rgba(34,211,238,0.15)',
          glow:    'rgba(34,211,238,0.3)',
        },
        emerald: {
          DEFAULT: '#10b981',
          dim:     'rgba(16,185,129,0.15)',
          glow:    'rgba(16,185,129,0.35)',
        },
        rose: {
          DEFAULT: '#f43f5e',
          dim:     'rgba(244,63,94,0.15)',
          glow:    'rgba(244,63,94,0.3)',
        },
        amber: {
          DEFAULT: '#f59e0b',
          dim:     'rgba(245,158,11,0.15)',
        },
        // Surfaces
        surface: {
          900: '#0b1020',
          800: '#111827',
          700: '#1a2236',
          600: '#1f2a40',
          500: '#2a3550',
          400: '#374161',
        },
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },

      boxShadow: {
        glass:          '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-violet': '0 0 0 1px rgba(124,58,237,0.4), 0 4px 32px rgba(124,58,237,0.2)',
        'tile-idle':    '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'tile-hover':   '0 0 0 1px rgba(124,58,237,0.5), 0 4px 20px rgba(124,58,237,0.25)',
        'tile-correct': '0 0 0 2px #10b981, 0 0 24px rgba(16,185,129,0.5)',
        'tile-wrong':   '0 0 0 2px #f43f5e, 0 0 24px rgba(244,63,94,0.4)',
        'score-glow':   '0 0 16px rgba(124,58,237,0.6)',
      },

      animation: {
        // Tiles
        'pop-in':        'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'tile-press':    'tilePress 0.12s ease',
        'tile-shake':    'tileShake 0.45s ease',
        'tile-correct':  'tileCorrect 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        // UI
        'fade-up':       'fadeUp 0.4s ease both',
        'fade-in':       'fadeIn 0.3s ease both',
        'slide-down':    'slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'score-bump':    'scoreBump 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        'streak-pulse':  'streakPulse 0.6s ease',
        'screen-shake':  'screenShake 0.4s ease',
        'confetti-pop':  'confettiPop 0.6s ease',
        // Timer
        'timer-tick':    'timerTick 1s ease infinite',
        // Misc
        'spin-slow':     'spin 3s linear infinite',
        'heartbeat':     'heartbeat 1s ease infinite',
      },

      keyframes: {
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.6) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        tilePress: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        tileShake: {
          '0%,100%': { transform: 'translateX(0)' },
          '15%':     { transform: 'translateX(-7px)' },
          '30%':     { transform: 'translateX(7px)' },
          '45%':     { transform: 'translateX(-5px)' },
          '60%':     { transform: 'translateX(5px)' },
          '75%':     { transform: 'translateX(-3px)' },
          '90%':     { transform: 'translateX(3px)' },
        },
        tileCorrect: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        scoreBump: {
          '0%':   { transform: 'scale(1)',    color: 'inherit' },
          '35%':  { transform: 'scale(1.35)', color: '#10b981' },
          '100%': { transform: 'scale(1)',    color: 'inherit' },
        },
        streakPulse: {
          '0%':   { boxShadow: '0 0 0 0 rgba(124,58,237,0.6)' },
          '70%':  { boxShadow: '0 0 0 10px rgba(124,58,237,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(124,58,237,0)' },
        },
        screenShake: {
          '0%,100%': { transform: 'translate(0,0)' },
          '20%':     { transform: 'translate(-4px, 2px)' },
          '40%':     { transform: 'translate(4px, -2px)' },
          '60%':     { transform: 'translate(-3px, 1px)' },
          '80%':     { transform: 'translate(3px, -1px)' },
        },
        confettiPop: {
          '0%':   { transform: 'scale(0.5)', opacity: '0' },
          '50%':  { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        timerTick: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.6' },
        },
        heartbeat: {
          '0%,100%': { transform: 'scale(1)' },
          '14%':     { transform: 'scale(1.15)' },
          '28%':     { transform: 'scale(1)' },
          '42%':     { transform: 'scale(1.1)' },
          '70%':     { transform: 'scale(1)' },
        },
      },

      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [],
}
