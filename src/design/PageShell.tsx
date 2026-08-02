import type { ReactNode } from 'react';
import { PageTitle, Body } from './Text';

/**
 * ARMAZON DE PAGINA
 *
 * Toda seccion de la extension se monta dentro de este componente, para
 * que el encabezado, los margenes y el ritmo vertical sean identicos en
 * todas. Antes cada pagina definia su propio contenedor y por eso los
 * titulos y espaciados no coincidian entre secciones.
 *
 * Cambiar aca el espaciado o la estructura del encabezado lo cambia en
 * toda la extension.
 */
export function PageShell({
  title,
  description,
  actions,
  toolbar,
  children,
  /** Ancho maximo; el panel lateral es angosto, por eso se limita. */
  maxWidth = 'full',
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  maxWidth?: 'full' | 'md' | 'lg';
}) {
  const widths = {
    full: 'w-full',
    md: 'w-full max-w-2xl mx-auto',
    lg: 'w-full max-w-4xl mx-auto',
  };

  const hasHeader = !!title || !!actions || !!description;

  return (
    <div className={`flex min-w-0 flex-col gap-3 animate-fade-in ${widths[maxWidth]}`}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            {title && <PageTitle>{title}</PageTitle>}
            {description && <Body className="mt-0.5">{description}</Body>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}

      {toolbar && <div className="flex flex-wrap items-center gap-2 min-w-0">{toolbar}</div>}

      {children}
    </div>
  );
}

/**
 * Encabezado de bloque dentro de una pagina, con el chip de icono que ya
 * usaba el Dashboard.
 */
export function SectionHeader({
  icon,
  title,
  actions,
  className = '',
}: {
  icon?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 min-w-0 ${className}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary [&_svg]:!h-[18px] [&_svg]:!w-[18px]">
            {icon}
          </span>
        )}
        <span className="truncate text-section-title font-semibold text-ink">{title}</span>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/**
 * Estado vacio unificado. Cada seccion tenia el suyo con distinto
 * tamano de icono, color y jerarquia.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {icon && <div className="mb-2 text-ink-muted opacity-40 [&_svg]:!h-7 [&_svg]:!w-7">{icon}</div>}
      <p className="text-body font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-micro text-ink-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
