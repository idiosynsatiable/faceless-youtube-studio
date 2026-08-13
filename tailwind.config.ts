import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#173321',
          100: '#263d2b',
          200: '#405444',
          300: '#657162',
          400: '#87907d',
          500: '#9f9b83',
          600: '#b9ad91',
          700: '#d6c7a8',
          800: '#e8ddc7',
          900: '#f5eedf',
          950: '#fffdf7'
        },
        signal: {
          400: '#62d653',
          500: '#278b3e',
          600: '#176b32'
        },
        accent: {
          400: '#e6c879',
          500: '#bd8732',
          600: '#80531c'
        },
        porcelain: {
          50: '#fffdf7',
          100: '#f9f2e4',
          200: '#efe2ca'
        }
      },
      boxShadow: {
        vellum: '0 18px 45px rgba(67, 50, 22, 0.10)',
        gilt: '0 14px 34px rgba(128, 83, 28, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.72)',
        uranium: '0 12px 30px rgba(39, 139, 62, 0.18)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Georgia', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
