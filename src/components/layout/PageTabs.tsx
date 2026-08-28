import type { Page } from '../../types';
import type { PageTabGroupDef } from '../../config/pageTabGroups';
import { primaryRoutes, secondaryRoutes } from '../../config/routes';

const candado = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const rutas = [...primaryRoutes, ...secondaryRoutes];

/**
 * Barra de pestanas de un grupo de paginas.
 *
 * Se parece a `SettingsTabs` pixel a pixel y **no es lo mismo por dentro**:
 * estas cambian la ruta, no una sub-vista. Por eso el marcado es un `<nav>`
 * con `aria-current="page"` y no un `role="tablist"` con `aria-selected`: para
 * un lector de pantalla, esto es navegacion, y anunciarlo como pestanas
 * prometeria que el contenido cambia sin moverse de sitio.
 *
 * ## Reparto del ancho
 *
 * Tres pestanas en los 288px del suelo son 96 cada una. "Plantillas" a
 * `text-body` pide ~72, mas icono 18 y hueco 6: 96 justos, sin holgura. Asi
 * que **el texto va siempre y el icono aparece desde `panel-sm`**, que es la
 * regla inversa a la de Configuracion. No es incoherencia: en las dos se
 * conserva lo que informa. Con seis destinos de una palabra informa el icono;
 * con tres, "Enviar" contra "Flujos" solo lo desambigua el texto.
 *
 * ## Lo que no se tiene contratado se pinta igual
 *
 * En gris, sin subrayado y con un candado en lugar del icono, y **al pulsarlo
 * se navega**: `AppPageRenderer` ya tiene la pantalla que explica que el plan
 * no lo incluye y como conseguirlo.
 *
 * Es deliberadamente distinto del rail, que si oculta lo que no tienes. El
 * rail es un directorio -lo que no tienes no debe ocupar sitio-; la barra es
 * el contexto de donde ya estas, y que tenga dos pestanas en unas cuentas y
 * tres en otras hace que la pantalla cambie de forma segun el plan.
 */
export default function PageTabs({
  group,
  currentPage,
  onNavigate,
  hasFeature,
}: {
  group: PageTabGroupDef;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  hasFeature: (feature: string) => boolean;
}) {
  return (
    <nav
      aria-label={group.label}
      className="flex w-full min-w-0 items-end border-b border-line pb-1"
    >
      {group.pages.map((page) => {
        const route = rutas.find((candidata) => candidata.page === page);
        if (!route) return null;

        const bloqueada = !!route.requiredFeature && !hasFeature(route.requiredFeature);
        const activa = currentPage === page;

        return (
          <button
            key={page}
            type="button"
            aria-current={activa ? 'page' : undefined}
            onClick={() => onNavigate(page)}
            title={bloqueada ? `${route.label} no está incluido en tu plan` : undefined}
            className={`-mb-[5px] flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 border-b-[2px] pb-3 text-body font-medium transition-colors ${
              activa
                ? 'border-primary text-ink'
                : bloqueada
                  ? 'border-transparent text-ink-muted'
                  : 'border-transparent text-ink-secondary hover:text-ink'
            }`}
          >
            <span className="hidden panel-sm:inline">{bloqueada ? candado : route.icon()}</span>
            <span className="truncate">{route.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
