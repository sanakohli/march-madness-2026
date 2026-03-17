/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sport: ['Barlow Condensed', 'sans-serif'],
        sans: ['Nunito Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        court: {
          950: '#0a0c10',
          900: '#111318',
          800: '#1a1d24',
          700: '#22262f',
          600: '#2e333d',
        },
        hoop: {
          500: '#f97316',
          400: '#fb923c',
          300: '#fdba74',
        },
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'slide-up': 'fadeSlideUp 0.45s ease both',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

