/**
 * Las utilidades de Tailwind se derivan de los tokens de
 * src/design/tokens.css. No se declaran colores literales aca: este
 * archivo solo los expone para poder escribir bg-primary, text-ink,
 * border-line, etc.
 *
 * @type {import('tailwindcss').Config}
 */
/**
 * Expone un token de color de forma que Tailwind pueda aplicarle opacidad.
 *
 * El problema que resuelve: los tokens guardan un hexadecimal
 * (`--ls-primary: #6c4cf6`). El modificador de opacidad de Tailwind (`/25`)
 * necesita inyectar un canal alfa, y sobre un `var()` opaco no puede, asi que
 * **descartaba la clase entera sin avisar**. El 2026-08-13 se midio el efecto:
 * once clases muertas, incluidos los bordes `border-state-*\/25` de las
 * primitivas Badge, Surface y Button, que llevaban quien sabe cuanto sin
 * pintarse.
 *
 * La alternativa habitual es guardar los tokens como tripletes
 * (`--ls-primary: 108 76 246`) y componer `rgb(var(--x) / <alpha-value>)`. Aca
 * no sirve: hay 30 sitios que usan `var(--ls-*)` directamente en CSS y en
 * estilos en linea, mas `palette.ts`, que lee la variable y se la pasa a
 * Recharts como color. Un triplete rompe las tres cosas.
 *
 * `color-mix` mantiene el hexadecimal intacto y funciona en Chrome 111+, que
 * para una extension de Chrome es un piso seguro.
 *
 * Cuando no hay modificador, Tailwind pasa su propia variable de opacidad con
 * 1 por defecto, asi que la mezcla queda al 100% y el color no cambia.
 */
function conAlfa(variable) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) return `var(${variable})`;
    return `color-mix(in srgb, var(${variable}) calc(${opacityValue} * 100%), transparent)`;
  };
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /**
       * Puntos de corte a escala de panel lateral.
       *
       * Los `sm`/`md`/`lg` que trae Tailwind arrancan en 640px. Esto es una
       * extension que vive en el panel lateral de Chrome, que el usuario
       * redimensiona entre ~320px y unos pocos cientos: 640px no se alcanza
       * casi nunca. El resultado medible es que las ~40 clases `sm:`/`md:`/
       * `lg:` repartidas por `src/` no se han activado jamas, y las filas que
       * dependian de ellas para caber se recortaban en silencio (los
       * scrollbars estan ocultos globalmente, asi que el desborde no avisa).
       *
       * Se anaden nombres nuevos en vez de redefinir `sm`/`md`/`lg` a
       * proposito: bajarles el umbral encenderia de golpe esas 40 clases
       * dormidas y cambiaria pantallas que hoy estan aprobadas. Cuando alguna
       * de ellas se revise una por una, se migra a estos nombres.
       *
       * Los umbrales salen de medir el ancho minimo real del contenido, no de
       * una escala redonda. Ver `src/pages/dashboard/OverviewTab.tsx`.
       */
      screens: {
        'panel-sm': '360px',
        'panel-md': '440px',
        'panel-lg': '500px',
        'panel-xl': '580px',
      },
      colors: {
        primary: {
          DEFAULT: conAlfa('--ls-primary'),
          hover: conAlfa('--ls-primary-hover'),
          deep: conAlfa('--ls-primary-deep'),
          light: conAlfa('--ls-primary-light'),
          soft: conAlfa('--ls-primary-soft'),
          'soft-strong': conAlfa('--ls-primary-soft-strong'),
        },
        ink: {
          DEFAULT: conAlfa('--ls-text'),
          secondary: conAlfa('--ls-text-secondary'),
          muted: conAlfa('--ls-text-muted'),
          inverse: conAlfa('--ls-text-inverse'),
        },
        surface: {
          DEFAULT: conAlfa('--ls-surface'),
          hover: conAlfa('--ls-surface-hover'),
          sunken: conAlfa('--ls-surface-sunken'),
          muted: conAlfa('--ls-bg'),
          unread: conAlfa('--ls-surface-unread'),
          'unread-hover': conAlfa('--ls-surface-unread-hover'),
        },
        line: {
          DEFAULT: conAlfa('--ls-border'),
          strong: conAlfa('--ls-border-strong'),
          soft: conAlfa('--ls-line-soft'),
        },
        state: {
          success: conAlfa('--ls-success'),
          'success-soft': conAlfa('--ls-success-soft'),
          warning: conAlfa('--ls-warning'),
          'warning-soft': conAlfa('--ls-warning-soft'),
          danger: conAlfa('--ls-danger'),
          'danger-soft': conAlfa('--ls-danger-soft'),
          info: conAlfa('--ls-info'),
          'info-soft': conAlfa('--ls-info-soft'),
        },
        // Alias heredado: el codigo previo usa brand-*.
        brand: {
          primary: conAlfa('--ls-primary'),
          secondary: conAlfa('--ls-primary-light'),
          blue: conAlfa('--ls-info'),
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
