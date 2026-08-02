import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-ink-secondary border border-line hover:bg-surface-hover hover:text-ink shadow-sm',
  ghost: 'bg-transparent text-ink-secondary hover:bg-primary-soft hover:text-primary',
  danger: 'bg-state-danger-soft text-state-danger border border-state-danger/25 hover:bg-state-danger hover:text-ink-inverse',
};

const SIZES: Record<Size, string> = {
  sm: 'h-control-sm px-2.5 text-micro gap-1',
  md: 'h-control px-3 text-body gap-1.5',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

/**
 * Boton del producto. Unifica los distintos estilos que convivian:
 * .btn de index.css, clases sueltas de Tailwind y colores literales.
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Boton cuadrado de solo icono, para barras de acciones. */
export function IconButton({
  icon,
  label,
  size = 'md',
  className = '',
  ...rest
}: Omit<Props, 'children' | 'icon'> & { icon: ReactNode; label: string }) {
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 ${
        size === 'sm' ? 'h-control-sm w-control-sm' : 'h-control w-control'
      } ${className}`}
    >
      {icon}
    </button>
  );
}
