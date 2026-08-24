import { useEffect, useRef } from 'react';
import type { Page } from '../../types';
import type { RailSubmenuItem } from '../../config/navigationGroups';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';

interface Props {
  id: string;
  label: string;
  items: RailSubmenuItem[];
  /** Borde superior del boton que lo abrio, en coordenadas de ventana. */
  anchorTop: number;
  /** Distancia desde el borde derecho de la ventana hasta el rail. */
  offsetRight: number;
  /** Solo se mueve el foco si el submenu se abrio con el teclado. */
  autoFocus: boolean;
  isItemActive: (item: RailSubmenuItem) => boolean;
  onSelect: (page: Page, hash?: string) => void;
  onClose: () => void;
}

const ALTO_ITEM = 36;
const ALTO_CABECERA = 28;
const MARGEN = 8;

/**
 * Submenu del rail, desplegado hacia la izquierda.
 *
 * En lugar de un acordeon dentro del rail, que es lo que hacia el cajon: con
 * el rail contraido no hay 48px para "Config agenda", y con el rail abierto
 * los siete hijos de Ajustes empujaban Admin fuera de la vista y movian bajo
 * el cursor el propio boton que se acababa de pulsar.
 */
export default function NavigationRailFlyout({
  id,
  label,
  items,
  anchorTop,
  offsetRight,
  autoFocus,
  isItemActive,
  onSelect,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const primeroRef = useRef<HTMLButtonElement>(null);

  useCloseOnEscape(onClose);

  useEffect(() => {
    if (autoFocus) primeroRef.current?.focus();
  }, [autoFocus]);

  // Si el submenu no cabe hacia abajo se ancla por el borde inferior. Ajustes
  // son siete filas: abierto desde la zona baja del rail se saldria del panel.
  const alto = ALTO_CABECERA + items.length * ALTO_ITEM + MARGEN * 2;
  const top = Math.max(MARGEN, Math.min(anchorTop, window.innerHeight - alto - MARGEN));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        id={id}
        style={{ top, right: offsetRight }}
        className="fixed z-50 w-[200px] overflow-hidden rounded-md rounded-tr-none border border-line bg-surface py-2 shadow-float animate-fade-in dark:border-slate-800"
      >
        <h2 className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted opacity-70">
          {label}
        </h2>
        <nav aria-label={label}>
          <ul className="flex flex-col">
            {items.map((item, indice) => {
              const activo = isItemActive(item);
              return (
                <li key={`${item.page}-${item.label}`}>
                  <button
                    ref={indice === 0 ? primeroRef : undefined}
                    type="button"
                    aria-current={activo ? 'page' : undefined}
                    onClick={() => onSelect(item.page, item.hash)}
                    className={`flex h-9 w-full items-center px-3 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                      activo
                        ? 'bg-primary-soft font-semibold text-primary'
                        : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
