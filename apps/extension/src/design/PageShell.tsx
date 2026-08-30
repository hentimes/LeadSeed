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
  /**
   * Ancho maximo del contenido. Antes cada pagina elegia el suyo
   * (max-w-4xl, max-w-6xl, sin limite), y por eso no coincidian entre si.
   */
  maxWidth = 'full',
  /**
   * Por defecto el shell mide lo que ocupa su contenido (altura "auto"),
   * que es lo que quiere la mayoria de paginas (listas largas, formularios).
   * El chat y la comunidad necesitan lo opuesto: una altura fija igual a la
   * disponible, para que solo el panel de mensajes haga scroll interno en
   * vez de que crezca la pagina entera. `fillHeight` activa ese modo sin
   * afectar a las demas paginas.
   */
  fillHeight = false,
}: {
  /** Opcional: la barra superior ya muestra el nombre de la seccion. */
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  maxWidth?: 'full' | 'md' | 'lg';
  fillHeight?: boolean;
}) {
  const widths = {
    full: 'w-full',
    md: 'w-full max-w-2xl mx-auto',
    lg: 'w-full max-w-4xl mx-auto',
  };

  const hasHeader = !!title || !!actions || !!description;

  return (
    <div
      className={`flex min-w-0 flex-col gap-3 animate-fade-in ${widths[maxWidth]} ${
        fillHeight ? 'h-full min-h-0' : ''
      }`}
    >
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

      {fillHeight ? <div className="flex-1 min-h-0">{children}</div> : children}
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
 * NO SE PUDO CARGAR
 *
 * Distinto del estado vacio, y esa distincion es el motivo de que exista.
 *
 * Las paginas de Mensajes cargaban con `useState([])` y sin `catch`: mientras
 * la red respondia -o cuando fallaba- la lista estaba vacia y la pantalla
 * afirmaba "Todavia no tenes plantillas", con su boton de crear. Es la peor
 * variante del parpadeo: no dice "esperá", dice "no tenés nada", y quien lo lee
 * cree que perdio su trabajo.
 *
 * Un fallo de red y una cuenta nueva no se pueden ver igual.
 */
export function LoadError({
  title = 'No pudimos cargar esto',
  description = 'Puede ser un problema de conexión momentáneo.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-md border border-state-danger/25 bg-state-danger-soft px-4 py-8 text-center"
    >
      <p className="text-body font-semibold text-ink">{title}</p>
      <p className="mt-1 text-micro text-ink-secondary">{description}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-3 h-control-sm rounded-md bg-surface px-3 text-meta font-semibold text-ink shadow-sm transition-colors hover:bg-surface-hover"
      >
        Reintentar
      </button>
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
