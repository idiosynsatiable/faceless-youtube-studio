import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f6fb',
          100: '#e6e8f1',
          200: '#c8cce0',
          300: '#a3a9c9',
          400: '#7c83ae',
          500: '#5a6190',
          600: '#444a72',
          700: '#333958',
          800: '#22273e',
          900: '#0f1226',
          950: '#080a18'
        },
        signal: {
          400: '#5eead4',
          500: '#14b8a6',
          600: '#0d9488'
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
