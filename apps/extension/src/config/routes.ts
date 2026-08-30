import type { ReactNode } from 'react';
import type { Page } from '../types';
import { Icon } from '../utils/icons';

export interface RouteDef {
  page: Page;
  label: string;
  icon: () => ReactNode;
  shortcut?: string;
  badge?: boolean;
  requiredFeature?: string;
}

export const primaryRoutes: RouteDef[] = [
  { page: 'dashboard', label: 'Dashboard', icon: Icon.Dashboard, requiredFeature: 'module:dashboard' },
  { page: 'leads', label: 'Leads', icon: Icon.Leads, shortcut: '1' },
  { page: 'agenda', label: 'Agenda', icon: Icon.Calendar },
  { page: 'pipeline', label: 'Pipeline', icon: Icon.Pipeline, requiredFeature: 'module:pipeline' },
  { page: 'send', label: 'Enviar', icon: Icon.Send, shortcut: '2', requiredFeature: 'module:send' },
  { page: 'tasks', label: 'Tareas', icon: Icon.Tasks, shortcut: '3', badge: true, requiredFeature: 'module:tasks' },
];

export const secondaryRoutes: RouteDef[] = [
  { page: 'history', label: 'Historial', icon: Icon.History, shortcut: '4', requiredFeature: 'module:history' },
  /*
   * Se llamaba "Mensajes", que ahora es el nombre del grupo que la contiene:
   * una pestana llamada igual que su grupo no dice en cual de las tres estas.
   * El rotulo se usa tambien en la pantalla de "funcionalidad no disponible".
   */
  { page: 'templates', label: 'Plantillas', icon: Icon.Templates, requiredFeature: 'module:templates' },
  /*
   * `flows` no estaba declarada, asi que `AppPageRenderer` no encontraba su
   * ruta y Flujos quedaba fuera de cualquier comprobacion de plan. Se declara
   * para que la barra de Mensajes pueda leer su rotulo y su icono.
   *
   * **Sin `requiredFeature`, y no por descuido.** La primera version puso
   * `module:flows`, que suena a lo correcto y es exactamente el error: esa
   * clave no existe en el catalogo (`sql/seeds/001_saas_catalog_seed.sql`) ni
   * esta asignada a ningun plan. Como `hasFeature` falla cerrado, declararla
   * no habria "empezado a cobrar Flujos": habria **quitado Flujos a todos los
   * usuarios no-admin que lo usan hoy**, sin que se notara probando con una
   * cuenta de admin, porque para el admin `hasFeature` devuelve true siempre.
   *
   * Cobrar Flujos es una decision de producto con su migracion de datos
   * -alta en el catalogo y reparto por planes-, no un renglon en este archivo.
   * Hasta que eso exista, la ruta se comporta como hasta ahora: abierta.
   */
  { page: 'flows', label: 'Flujos', icon: Icon.Share },
  { page: 'lists', label: 'Listas', icon: Icon.Lists, requiredFeature: 'module:lists' },
  { page: 'chat', label: 'Chat', icon: Icon.Messages, badge: true },
  { page: 'community', label: 'Comunidad', icon: Icon.Users, requiredFeature: 'module:community' },
  { page: 'settings', label: 'Ajustes', icon: Icon.Settings, shortcut: '5' },
  // Vivia suelta dentro del cajon de navegacion, con su propio `hasFeature`
  // escrito a mano. Aqui la ve tambien `AppPageRenderer`, que es quien corta
  // el paso a las paginas sin permiso.
  { page: 'admin', label: 'Admin SaaS', icon: Icon.Admin, requiredFeature: 'module:admin' },
];
