/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
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
    },
  },
  plugins: [],
}

