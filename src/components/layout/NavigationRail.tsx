import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  railGroups,
  routesForPages,
  type RailSubmenuDef,
  type RailSubmenuItem,
} from '../../config/navigationGroups';
import type { Page } from '../../types';
import { Icon } from '../../utils/icons';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';
import { useLocationHash, setLocationHash } from './useLocationHash';
import { useNavigationRailState } from './useNavigationRailState';
import NavigationRailItem from './NavigationRailItem';
import NavigationRailFlyout from './NavigationRailFlyout';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
  unreadChatCount?: number;
  isChatBanned?: boolean;
}

interface FlyoutAbierto {
  def: RailSubmenuDef;
  anchorTop: number;
  /** Distancia del borde derecho de la ventana al borde izquierdo del rail. */
  offsetRight: number;
  autoFocus: boolean;
}

/**
 * Rail de navegacion fijo en el borde derecho.
 *
 * ## Por que el estado expandido flota
 *
 * El contenido reserva siempre el ancho contraido y nunca el expandido. Si el
 * rail empujara la pagina, cada apertura cambiaria el ancho de `main`, y con
 * ese ancho cambian dos cosas que no deberian moverse por abrir un menu: los
 * umbrales `panel-*`, que miden la ventana, y la medida que toman de su padre
 * los graficos del panel analitico. Flotando no se mueve ninguna seccion; lo
 * unico que aparece es el menu.
 */
export default function NavigationRail({
  currentPage,
  onNavigate,
  taskCount,
  unreadChatCount,
  isChatBanned,
}: Props) {
  const { hasFeature } = useAuth();
  const { isExpanded, toggle, collapse } = useNavigationRailState();
  const hash = useLocationHash();
  const [flyout, setFlyout] = useState<FlyoutAbierto | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const cerrarFlyout = useCallback(() => setFlyout(null), []);

  // Escape contrae el rail. La pila de `useCloseOnEscape` se encarga de que,
  // con un submenu abierto, el primer Escape lo cierre a el y no al rail.
  useCloseOnEscape(collapse, isExpanded);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      // Ctrl+1..5 y Ctrl+K ya estan tomados por los atajos de navegacion.
      if ((evento.ctrlKey || evento.metaKey) && evento.key === '\\') {
        evento.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [toggle]);

  const esItemActivo = useCallback(
    (item: RailSubmenuItem) => currentPage === item.page && (!item.hash || hash === item.hash),
    [currentPage, hash],
  );

  const navegar = (page: Page, destino?: string) => {
    if (destino) setLocationHash(destino);
    cerrarFlyout();
    collapse();
    onNavigate(page);
  };

  const alternarFlyout = (def: RailSubmenuDef, evento: MouseEvent<HTMLButtonElement>) => {
    if (flyout?.def.id === def.id) {
      cerrarFlyout();
      return;
    }
    const rect = evento.currentTarget.getBoundingClientRect();
    // El ancho del rail lo fija `--ls-rail-width` en CSS, asi que el submenu
    // se ancla midiendo el rail y no repitiendo el numero aqui.
    const anchoRail = navRef.current?.getBoundingClientRect().width ?? 0;
    // `detail === 0` es un click disparado por Enter o Espacio: solo entonces
    // se lleva el foco dentro del submenu, para no robarselo a quien usa raton.
    setFlyout({ def, anchorTop: rect.top, offsetRight: anchoRail, autoFocus: evento.detail === 0 });
  };

  const contadorDe = (page: Page): number => {
    if (page === 'tasks') return taskCount ?? 0;
    if (page === 'chat') return unreadChatCount ?? 0;
    return 0;
  };

  const grupos = railGroups.map((grupo) => ({
    ...grupo,
    routes: routesForPages(grupo.pages).filter(
      (route) => !route.requiredFeature || hasFeature(route.requiredFeature),
    ),
  }));

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-x-0 bottom-0 top-[64px] z-30 bg-black/40 animate-fade-in motion-reduce:animate-none"
          onClick={collapse}
          aria-hidden="true"
        />
      )}

      <nav
        ref={navRef}
        id="app-rail"
        aria-label="Navegación principal"
        style={{ width: isExpanded ? 'var(--ls-rail-width-expanded)' : 'var(--ls-rail-width)' }}
        className={`fixed bottom-0 right-0 top-[64px] z-40 flex flex-col border-l border-line bg-surface transition-[width] duration-150 ease-out motion-reduce:transition-none dark:border-slate-800 ${
          isExpanded ? 'shadow-float' : ''
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1">
          {grupos.map((grupo) => {
            if (grupo.routes.length === 0 && !grupo.submenu) return null;

            return (
              <div
                key={grupo.id}
                className={`flex flex-col gap-1 ${
                  grupo.pinnedBottom ? 'mt-auto border-t border-line pt-2 dark:border-slate-800' : ''
                }`}
              >
                {isExpanded && (
                  <h2 className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted opacity-70">
                    {grupo.label}
                  </h2>
                )}

                {grupo.routes.map((route) => (
                  <NavigationRailItem
                    key={route.page}
                    label={route.label}
                    icon={route.icon}
                    isActive={currentPage === route.page}
                    isExpanded={isExpanded}
                    badge={route.badge ? contadorDe(route.page) : 0}
                    banned={route.page === 'chat' && !!isChatBanned}
                    onClick={() => navegar(route.page)}
                  />
                ))}

                {grupo.submenu && (
                  <NavigationRailItem
                    label={grupo.submenu.label}
                    icon={grupo.submenu.icon}
                    isActive={grupo.submenu.items.some(esItemActivo)}
                    isExpanded={isExpanded}
                    ariaExpanded={flyout?.def.id === grupo.submenu.id}
                    ariaControls={`rail-submenu-${grupo.submenu.id}`}
                    trailing={<span className="ml-auto text-ink-muted">{Icon.ArrowLeft()}</span>}
                    onClick={(evento) => alternarFlyout(grupo.submenu as RailSubmenuDef, evento)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={isExpanded}
          aria-controls="app-rail"
          aria-label={isExpanded ? 'Contraer el menú' : 'Expandir el menú'}
          className="flex h-11 w-full shrink-0 items-center justify-center gap-2 border-t border-line text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus dark:border-slate-800"
        >
          <span
            className={`transition-transform motion-reduce:transition-none ${isExpanded ? '' : 'rotate-180'}`}
          >
            {Icon.ArrowRight()}
          </span>
          {isExpanded && <span className="text-[13px] font-medium">Contraer</span>}
        </button>
      </nav>

      {flyout && (
        <NavigationRailFlyout
          id={`rail-submenu-${flyout.def.id}`}
          label={flyout.def.label}
          items={flyout.def.items}
          anchorTop={flyout.anchorTop}
          offsetRight={flyout.offsetRight}
          autoFocus={flyout.autoFocus}
          isItemActive={esItemActivo}
          onSelect={navegar}
          onClose={cerrarFlyout}
        />
      )}
    </>
  );
}
