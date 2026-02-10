/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 1. RAW BRAND PALETTE
        bombay: {
          light: '#B5F4FD',
          mid: '#00C3F2',
          navy: '#000B46',
        },

        // 2. SEMANTIC TOKENS
        primary: {
          DEFAULT: '#00C3F2',
          foreground: '#000B46',
          50:  '#F2FCFE',
          100: '#E6FAFE',
          200: '#B5F4FD',
          300: '#7CDFF9',
          400: '#3ED0F5',
          500: '#00C3F2',
          600: '#00A0C6',
          700: '#0076A3',
          800: '#00567A',
          900: '#000B46',
        },
        secondary: {
          DEFAULT: '#000B46',
          foreground: '#FFFFFF',
        },

        // 3. LEGACY MAPPING — 'violet' maps to brand scale
        violet: {
          50:  '#F2FCFE',
          100: '#E6FAFE',
          200: '#B5F4FD',
          300: '#7CDFF9',
          400: '#3ED0F5',
          500: '#00C3F2',
          600: '#00A0C6',
          700: '#0076A3',
          800: '#00567A',
          900: '#000B46',
          950: '#000522',
        },

        // 4. Keep standard slate, emerald, rose, amber for semantic states
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Unbounded', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
