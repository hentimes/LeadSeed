import type { Page } from '../types';
import { primaryRoutes, secondaryRoutes, type RouteDef } from './routes';

export interface RailGroupDef {
  id: string;
  /** Rotulo del grupo. Solo se pinta con el rail expandido. */
  label: string;
  pages: Page[];
  /**
   * Grupos de paginas con barra horizontal (ver `pageTabGroups.ts`). El rail
   * pinta **una** entrada por grupo, que lleva a su pagina de entrada; las
   * hermanas se alcanzan desde la barra de arriba.
   */
  groups?: string[];
  /** El ultimo grupo se ancla abajo para que Ajustes nunca quede fuera. */
  pinnedBottom?: boolean;
}

/**
 * Las rutas viven en `routes.ts`; aqui solo se decide el orden y el reparto en
 * grupos del rail. Separarlo evita que `routes.ts` cargue con decisiones de
 * presentacion, que es lo que empezaba a pasar en `NavigationDrawer`.
 *
 * ## Los dos submenus que habia
 *
 * El rail tenia dos desplegables anclados a su borde: "Ajustes", con las seis
 * secciones de Configuracion, y "Mensajes", con Enviar, Plantillas y Flujos.
 * Los dos desaparecen, y por el mismo motivo: **las dos pantallas ya pintan
 * esos destinos como pestanas arriba**. Un panel flotante de 200px con velo y
 * gestion de foco para ahorrar un toque, repitiendo unos nombres que estan a
 * la vista dos centimetros mas alla, es trabajo que no compra nada.
 *
 * Ajustes pasa a ser una entrada normal -`settings` ya era una ruta con icono
 * y atajo- y Mensajes una entrada de grupo.
 */
export const railGroups: RailGroupDef[] = [
  {
    id: 'principal',
    label: 'Principal',
    pages: ['dashboard', 'leads', 'lists'],
    groups: ['messages'],
  },
  {
    id: 'analitica',
    label: 'Analítica',
    pages: ['pipeline', 'tasks', 'agenda', 'history'],
  },
  {
    id: 'colaboracion',
    label: 'Colaboración',
    pages: ['chat', 'community'],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    pages: ['settings', 'admin'],
    pinnedBottom: true,
  },
];

const porPagina = new Map<Page, RouteDef>(
  [...primaryRoutes, ...secondaryRoutes].map((route) => [route.page, route]),
);

/** El rail solo pinta rutas que existan en `routes.ts`. */
export function routesForPages(pages: Page[]): RouteDef[] {
  return pages.map((page) => porPagina.get(page)).filter((route): route is RouteDef => !!route);
}
