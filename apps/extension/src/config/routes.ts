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
  /* `module:leads` existia en el catalogo desde el principio y no la
     comprobaba nadie: era una clave muerta. Esta asignada a los tres planes,
     asi que declararla no cierra nada. */
  { page: 'leads', label: 'Leads', icon: Icon.Leads, shortcut: '1', requiredFeature: 'module:leads' },
  { page: 'agenda', label: 'Agenda', icon: Icon.Calendar, requiredFeature: 'seguimiento.agenda' },
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
   * LAS CUATRO PUERTAS QUE FALTABAN, Y POR QUE AHORA SI.
   *
   * Agenda, Chat, Flujos y Playbooks eran modulos completos abiertos a
   * cualquiera con sesion. No por descuido: la version anterior de este
   * comentario explicaba que declarar una clave inexistente NO empieza a
   * cobrar la seccion, sino que **se la quita a todo el que no la tenga**,
   * porque `hasFeature` falla cerrado. Y probandolo con una cuenta de
   * administrador no se nota, porque para el siempre devuelve true.
   *
   * Lo que cambia es que ahora las cuatro claves existen en el catalogo
   * (migracion 180) y estan asignadas a LOS TRES PLANES (migracion 181), que
   * es exactamente lo que pasa hoy. Poner la puerta no le quita nada a nadie.
   *
   * Lo que se gana es poder decidir. Hasta ahora Flujos no se podia cobrar de
   * ninguna manera: sin clave, y ponersela lo cerraba de golpe. Ahora quitarlo
   * del plan gratuito es un clic en el panel, reversible, y con el aviso de
   * "funcionalidad no disponible" que la aplicacion ya sabe pintar.
   */
  { page: 'flows', label: 'Flujos', icon: Icon.Share, requiredFeature: 'mensajes.flujos' },
  { page: 'playbooks', label: 'Playbooks', icon: Icon.Bullseye, requiredFeature: 'mensajes.playbooks' },
  { page: 'lists', label: 'Listas', icon: Icon.Lists, requiredFeature: 'module:lists' },
  { page: 'chat', label: 'Chat', icon: Icon.Messages, badge: true, requiredFeature: 'comunidad.chat' },
  { page: 'community', label: 'Comunidad', icon: Icon.Users, requiredFeature: 'module:community' },
  { page: 'settings', label: 'Ajustes', icon: Icon.Settings, shortcut: '5' },
  // Vivia suelta dentro del cajon de navegacion, con su propio `hasFeature`
  // escrito a mano. Aqui la ve tambien `AppPageRenderer`, que es quien corta
  // el paso a las paginas sin permiso.
  { page: 'admin', label: 'Admin SaaS', icon: Icon.Admin, requiredFeature: 'module:admin' },
];
