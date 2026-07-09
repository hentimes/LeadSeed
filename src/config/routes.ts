import type { ReactNode } from 'react';
import type { Page } from '../types';
import { Icon } from '../utils/icons';

export interface RouteDef {
  page: Page;
  label: string;
  icon: () => ReactNode;
  shortcut?: string;
  badge?: boolean;
}

export const primaryRoutes: RouteDef[] = [
  { page: 'dashboard', label: 'Dashboard', icon: Icon.Dashboard },
  { page: 'leads', label: 'Leads', icon: Icon.Leads, shortcut: '1' },
  { page: 'pipeline', label: 'Pipeline', icon: Icon.Pipeline },
  { page: 'send', label: 'Enviar', icon: Icon.Send, shortcut: '2' },
  { page: 'tasks', label: 'Tareas', icon: Icon.Tasks, shortcut: '3', badge: true },
];

export const secondaryRoutes: RouteDef[] = [
  { page: 'history', label: 'Historial', icon: Icon.History, shortcut: '4' },
  { page: 'templates', label: 'Mensajes', icon: Icon.Messages },
  { page: 'lists', label: 'Listas', icon: Icon.Lists },
  { page: 'settings', label: 'Ajustes', icon: Icon.Settings, shortcut: '5' },
];

export const allRoutes = [...primaryRoutes, ...secondaryRoutes];

export function getRouteByPage(page: Page): RouteDef | undefined {
  return allRoutes.find((r) => r.page === page);
}
