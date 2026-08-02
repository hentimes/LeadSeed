/**
 * Las utilidades de Tailwind se derivan de los tokens de
 * src/design/tokens.css. No se declaran colores literales aca: este
 * archivo solo los expone para poder escribir bg-primary, text-ink,
 * border-line, etc.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--ls-primary)',
          hover: 'var(--ls-primary-hover)',
          deep: 'var(--ls-primary-deep)',
          light: 'var(--ls-primary-light)',
          soft: 'var(--ls-primary-soft)',
          'soft-strong': 'var(--ls-primary-soft-strong)',
        },
        ink: {
          DEFAULT: 'var(--ls-text)',
          secondary: 'var(--ls-text-secondary)',
          muted: 'var(--ls-text-muted)',
          inverse: 'var(--ls-text-inverse)',
        },
        surface: {
          DEFAULT: 'var(--ls-surface)',
          hover: 'var(--ls-surface-hover)',
          muted: 'var(--ls-bg)',
        },
        line: {
          DEFAULT: 'var(--ls-border)',
          strong: 'var(--ls-border-strong)',
        },
        state: {
          success: 'var(--ls-success)',
          'success-soft': 'var(--ls-success-soft)',
          warning: 'var(--ls-warning)',
          'warning-soft': 'var(--ls-warning-soft)',
          danger: 'var(--ls-danger)',
          'danger-soft': 'var(--ls-danger-soft)',
          info: 'var(--ls-info)',
          'info-soft': 'var(--ls-info-soft)',
        },
        // Alias heredado: el codigo previo usa brand-*.
        brand: {
          primary: 'var(--ls-primary)',
          secondary: 'var(--ls-primary-light)',
          blue: 'var(--ls-info)',
        },
      },
      borderRadius: {
        sm: 'var(--ls-radius-sm)',
        md: 'var(--ls-radius-md)',
        lg: 'var(--ls-radius-lg)',
        xl: 'var(--ls-radius-xl)',
        // Alias heredados.
        std: 'var(--ls-radius-md)',
        card: 'var(--ls-radius-md)',
        panel: 'var(--ls-radius-md)',
        btn: 'var(--ls-radius-md)',
        input: 'var(--ls-radius-md)',
        modal: 'var(--ls-radius-lg)',
      },
      boxShadow: {
        card: 'var(--ls-shadow-card)',
        float: 'var(--ls-shadow-float)',
        sticky: 'var(--ls-shadow-sticky)',
        std: 'var(--ls-shadow-card)',
      },
      fontSize: {
        'page-title': ['var(--ls-text-page-title)', { lineHeight: '1.25' }],
        'section-title': ['var(--ls-text-section-title)', { lineHeight: '1.3' }],
        'card-title': ['var(--ls-text-card-title)', { lineHeight: '1.35' }],
        body: ['var(--ls-text-body)', { lineHeight: '1.45' }],
        micro: ['var(--ls-text-micro)', { lineHeight: '1.3' }],
      },
      fontFamily: {
        sans: ['var(--ls-font-sans)'],
      },
      height: {
        control: 'var(--ls-control-height)',
        'control-sm': 'var(--ls-control-height-sm)',
      },
      width: {
        control: 'var(--ls-control-height)',
        'control-sm': 'var(--ls-control-height-sm)',
      },
      transitionTimingFunction: {
        spring: 'var(--ls-easing)',
      },
    },
  },
  plugins: [],
};
