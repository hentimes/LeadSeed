/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--ls-primary, #6C4CF6)',
          secondary: 'var(--ls-primary-2, #8B5CF6)',
          blue: 'var(--ls-blue, #3B82F6)',
        },
        surface: {
          DEFAULT: 'var(--color-bg-surface, #ffffff)',
          hover: 'var(--color-bg-surface-hover, #f1f5f9)',
          muted: 'var(--ls-bg, #F8F9FC)'
        }
      },
      borderRadius: {
        'std': 'var(--radius-md, 0.5rem)',
        'modal': 'var(--ls-radius-lg, 18px)',
        'card': 'var(--ls-radius-md, 14px)',
        'panel': 'var(--ls-radius-sm, 10px)',
        'btn': 'var(--radius-md, 0.5rem)',
        'input': '6px',
      },
      boxShadow: {
        'std': 'var(--shadow-premium)',
        'card': 'var(--ls-shadow-card)',
        'float': 'var(--ls-shadow-float)',
      }
    },
  },
  plugins: [],
};
