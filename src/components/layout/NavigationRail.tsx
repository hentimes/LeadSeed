import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { railGroups, routesForPages } from '../../config/navigationGroups';
import { grupoDePagina, pageTabGroups } from '../../config/pageTabGroups';
import { primaryRoutes, secondaryRoutes } from '../../config/routes';
import type { Page } from '../../types';
import { Icon } from '../../utils/icons';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';
import { useNavigationRailState } from './useNavigationRailState';
import NavigationRailItem from './NavigationRailItem';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  taskCount?: number;
  unreadChatCount?: number;
  isChatBanned?: boolean;
}

/**
 * Rail de navegacion fijo en el borde derecho.
 *
 * ## Sin submenus
 *
 * Tenia dos desplegables propios -Ajustes y Mensajes- anclados a su borde, con
 * velo, posicionamiento calculado a mano y gestion de foco. Los dos destinos
 * que abrian pintan hoy sus secciones como pestanas en la propia pagina, asi
 * que el desplegable solo repetia unos nombres que ya estaban a la vista. Al
 * quitarlos se van con ellos `NavigationRailFlyout`, el estado del panel
 * abierto y la escucha del hash que hacia falta para resaltar sus hijos.
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
  const navRef = useRef<HTMLElement>(null);

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

  const navegar = (page: Page) => {
    collapse();
    onNavigate(page);
  };

  const rutas = [...primaryRoutes, ...secondaryRoutes];

  /**
   * Un grupo se pinta si el usuario tiene **alguna** de sus paginas.
   *
   * Sin ninguna, la entrada llevaria a una pantalla de "no incluido en tu
   * plan" y nada mas: eso es una entrada de rail que no navega a ningun sitio.
   */
  const gruposVisibles = (ids: string[] = []) =>
    pageTabGroups
      .filter((grupo) => ids.includes(grupo.id))
      .filter((grupo) =>
        grupo.pages.some((page) => {
          const route = rutas.find((candidata) => candidata.page === page);
          return route && (!route.requiredFeature || hasFeature(route.requiredFeature));
        }),
      );

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
            const grupos = gruposVisibles(grupo.groups);
            if (grupo.routes.length === 0 && grupos.length === 0) return null;

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

                {/*
                  La entrada de un grupo no puede ser la ruta de su pagina de
                  entrada: estando en Flujos, una entrada "Enviar" o no
                  resaltaria nada, o resaltaria diciendo un nombre que no es el
                  de la pantalla que estas viendo. Resalta por grupo.
                */}
                {grupos.map((definicion) => (
                  <NavigationRailItem
                    key={definicion.id}
                    label={definicion.label}
                    icon={Icon.Messages}
                    isActive={grupoDePagina(currentPage)?.id === definicion.id}
                    isExpanded={isExpanded}
                    onClick={() => navegar(definicion.landing)}
                  />
                ))}
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

    </>
  );
}
