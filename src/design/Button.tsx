import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghost-danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-ink-secondary border border-line hover:bg-surface-hover hover:text-ink shadow-sm',
  ghost: 'bg-transparent text-ink-secondary hover:bg-primary-soft hover:text-primary',
  // `text-state-danger-ink` y no `-danger`: el segundo da 3.44:1 sobre este
  // mismo tinte, o sea que el rotulo del boton incumplia AA.
  danger: 'bg-state-danger-soft text-state-danger-ink border border-state-danger/25 hover:bg-state-danger hover:text-ink-inverse',
  // Accion destructiva sin peso visual: para tarjetas densas, donde un boton
  // relleno competiria con el contenido. Agregada el 2026-08-13 al unificar
  // Agenda, que resolvia esto con `btn-ghost text-red-500` suelto.
  // Idem: 3.76:1 sobre la superficie clara. Se creo para el "Cancelar" de
  // Agenda y nacio incumpliendo.
  'ghost-danger': 'bg-transparent text-state-danger-ink hover:bg-state-danger-soft',
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

/**
 * Boton de solo icono, para barras de acciones.
 *
 * `label` es obligatorio y alimenta a la vez el `title` y el `aria-label`: un
 * boton sin texto no tiene nombre accesible, y con el `title` solo no basta.
 *
 * `shape="circle"` existe para los que se emparejan con un campo redondeado,
 * como el de enviar del chat. Antes eso se hacia con un `rounded-full` suelto
 * encima del `rounded-md` de la primitiva, que solo funcionaba por el orden en
 * que Tailwind emite las utilidades: si ese orden cambiara, el boton volveria a
 * ser cuadrado sin que nadie tocara nada.
 */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  shape = 'square',
  className = '',
  ...rest
}: Omit<Props, 'children' | 'icon'> & {
  icon: ReactNode;
  label: string;
  shape?: 'square' | 'circle';
}) {
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        shape === 'circle' ? 'rounded-full' : 'rounded-md'
      } ${VARIANTS[variant]} ${
        size === 'sm' ? 'h-control-sm w-control-sm' : 'h-control w-control'
      } ${className}`}
    >
      {icon}
    </button>
  );
}
