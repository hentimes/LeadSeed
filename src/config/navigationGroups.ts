import type { Page } from '../types';
import { Icon } from '../utils/icons';
import { primaryRoutes, secondaryRoutes, type RouteDef } from './routes';
import type { ReactNode } from 'react';

export interface RailSubmenuItem {
  page: Page;
  label: string;
  hash?: string;
}

export interface RailSubmenuDef {
  id: string;
  label: string;
  icon: () => ReactNode;
  items: RailSubmenuItem[];
}

export interface RailGroupDef {
  id: string;
  /** Rotulo del grupo. Solo se pinta con el rail expandido. */
  label: string;
  pages: Page[];
  submenu?: RailSubmenuDef;
  /** El ultimo grupo se ancla abajo para que Ajustes nunca quede fuera. */
  pinnedBottom?: boolean;
}

/**
 * Las rutas viven en `routes.ts`; aqui solo se decide el orden y el reparto en
 * grupos del rail. Separarlo evita que `routes.ts` cargue con decisiones de
 * presentacion, que es lo que empezaba a pasar en `NavigationDrawer`.
 *
 * `send`, `templates` y `flows` no aparecen sueltos: viven dentro del submenu
 * Mensajes. Igual `settings`, que se abre por sus siete secciones.
 */
export const railGroups: RailGroupDef[] = [
  {
    id: 'principal',
    label: 'Principal',
    pages: ['dashboard', 'leads', 'lists'],
    submenu: {
      id: 'messages',
      label: 'Mensajes',
      icon: Icon.Messages,
      items: [
        { page: 'send', label: 'Enviar' },
        { page: 'templates', label: 'Plantillas' },
        { page: 'flows', label: 'Flujos' },
      ],
    },
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
    pages: ['admin'],
    pinnedBottom: true,
    submenu: {
      id: 'settings',
      label: 'Ajustes',
      icon: Icon.Settings,
      items: [
        { page: 'settings', label: 'Apariencia', hash: '#display' },
        { page: 'settings', label: 'Datos', hash: '#data' },
        { page: 'settings', label: 'Email', hash: '#email' },
        { page: 'settings', label: 'Links', hash: '#links' },
        { page: 'settings', label: 'Config agenda', hash: '#agenda' },
        { page: 'settings', label: 'Metas', hash: '#goals' },
        { page: 'settings', label: 'Cuenta', hash: '#cuenta' },
        { page: 'settings', label: 'Ayuda VIP', hash: '#support' },
      ],
    },
  },
];

const porPagina = new Map<Page, RouteDef>(
  [...primaryRoutes, ...secondaryRoutes].map((route) => [route.page, route]),
);

/** El rail solo pinta rutas que existan en `routes.ts`. */
export function routesForPages(pages: Page[]): RouteDef[] {
  return pages.map((page) => porPagina.get(page)).filter((route): route is RouteDef => !!route);
}
