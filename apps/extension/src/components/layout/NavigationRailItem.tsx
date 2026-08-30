import { useRef, useState, type MouseEvent, type ReactNode } from 'react';

interface Props {
  label: string;
  icon: () => ReactNode;
  isActive: boolean;
  isExpanded: boolean;
  /** 0 lo oculta. Con el rail contraido solo se pinta como punto. */
  badge?: number;
  /** Cuenta suspendida: mismo punto rojo, otro mensaje. */
  banned?: boolean;
  /** Lo pintan los botones que abren un submenu. */
  trailing?: ReactNode;
  ariaExpanded?: boolean;
  ariaControls?: string;
  onClick: (evento: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Nombre accesible del boton. Con el rail contraido la etiqueta no se ve, y el
 * contador tampoco: el numero exacto vive aqui, que es lo unico que lee un
 * lector de pantalla.
 */
function nombreAccesible(label: string, badge: number, banned: boolean): string {
  if (banned) return `${label}, cuenta suspendida`;
  if (badge > 0) return `${label}, ${badge} sin leer`;
  return label;
}

export default function NavigationRailItem({
  label,
  icon,
  isActive,
  isExpanded,
  badge = 0,
  banned = false,
  trailing,
  ariaExpanded,
  ariaControls,
  onClick,
}: Props) {
  const botonRef = useRef<HTMLButtonElement>(null);
  const [pista, setPista] = useState<{ top: number; right: number } | null>(null);

  // El tooltip se posiciona con `fixed` y coordenadas del boton en vez de
  // `absolute`: la lista del rail tiene scroll vertical propio, y cualquier
  // hijo posicionado dentro de ella se recortaria contra su borde izquierdo.
  const mostrarPista = () => {
    if (isExpanded || !botonRef.current) return;
    const rect = botonRef.current.getBoundingClientRect();
    setPista({ top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + 8 });
  };

  const ocultarPista = () => setPista(null);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={(evento) => {
          ocultarPista();
          onClick(evento);
        }}
        onMouseEnter={mostrarPista}
        onMouseLeave={ocultarPista}
        onFocus={mostrarPista}
        onBlur={ocultarPista}
        aria-label={nombreAccesible(label, badge, banned)}
        aria-current={isActive && ariaExpanded === undefined ? 'page' : undefined}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        className={`relative flex h-10 w-full shrink-0 items-center rounded-sm text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          isExpanded ? 'gap-2.5 px-2' : 'justify-center px-0'
        } ${
          isActive
            ? 'bg-primary-soft text-primary'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
        }`}
      >
        <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center ${isActive ? 'text-primary' : ''}`}>
          {icon()}
          {!isExpanded && badge > 0 && !banned && (
            <span
              className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-surface bg-state-danger px-1 text-[9px] font-bold leading-none text-white"
              aria-hidden="true"
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          {!isExpanded && banned && (
            <span
              className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full border-2 border-surface bg-state-danger"
              aria-hidden="true"
            />
          )}
        </span>

        {isExpanded && <span className={`truncate ${isActive ? 'font-semibold' : ''}`}>{label}</span>}

        {isExpanded && banned && (
          <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-state-danger" aria-hidden="true" />
        )}
        {isExpanded && !banned && badge > 0 && (
          <span
            className="ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-state-danger px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {isExpanded && trailing}

        {/* El estado activo no puede comunicarse solo con color (WCAG 1.4.1):
            esta barra muerde el borde exterior del panel. */}
        {isActive && (
          <span
            className="absolute right-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-sm bg-primary"
            aria-hidden="true"
          />
        )}
      </button>

      {pista && (
        <span
          role="presentation"
          style={{ top: pista.top, right: pista.right }}
          className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-[11px] font-medium text-surface shadow-float"
        >
          {label}
        </span>
      )}
    </>
  );
}
