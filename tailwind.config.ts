/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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

        // 3. LEGACY MAPPING — 'violet' maps to new teal-gray palette
        violet: {
          50:  '#f2f5f5',
          100: '#d1ebf2',
          200: '#cddbe1',
          300: '#aec2c9',
          400: '#9aaeb5',
          500: '#758084',
          600: '#233137',
          700: '#1a2529',
          800: '#141c21',
          900: '#0e1519',
          950: '#080d10',
        },

        // 4. Keep standard slate, emerald, rose, amber for semantic states
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Inter', 'Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
