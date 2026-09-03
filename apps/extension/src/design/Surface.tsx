import { forwardRef, type ReactNode } from 'react';

type Padding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-2.5',
  md: 'p-3',
  lg: 'p-4',
};

interface CardProps {
  children: ReactNode;
  padding?: Padding;
  /** Sin sombra ni relieve; util dentro de otra tarjeta. */
  flat?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Contenedor base de contenido. Reemplaza el patron
 * `bg-white border border-[#E6EAF0] rounded-[8px] shadow-...` repetido
 * en decenas de archivos.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, padding = 'md', flat, className = '', onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`bg-surface border border-line rounded-lg ${flat ? '' : 'shadow-card'} ${PADDING[padding]} ${
        onClick ? 'cursor-pointer transition-colors hover:bg-surface-hover' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
});

/**
 * Bloque tenido, para destacar sin competir con una Card.
 */
export function Panel({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-muted border-line text-ink',
    primary: 'bg-primary-soft border-primary-soft-strong text-primary-deep',
    success: 'bg-state-success-soft border-state-success/25 text-state-success',
    warning: 'bg-state-warning-soft border-state-warning/25 text-state-warning',
    danger: 'bg-state-danger-soft border-state-danger/25 text-state-danger',
    info: 'bg-state-info-soft border-state-info/25 text-state-info',
  };

  return <div className={`rounded-md border p-2.5 ${tones[tone]} ${className}`}>{children}</div>;
}
