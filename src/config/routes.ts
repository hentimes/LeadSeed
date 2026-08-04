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
  { page: 'agenda', label: 'Agenda', icon: Icon.History },
  { page: 'pipeline', label: 'Pipeline', icon: Icon.Pipeline, requiredFeature: 'module:pipeline' },
  { page: 'send', label: 'Enviar', icon: Icon.Send, shortcut: '2', requiredFeature: 'module:send' },
  { page: 'tasks', label: 'Tareas', icon: Icon.Tasks, shortcut: '3', badge: true, requiredFeature: 'module:tasks' },
];

export const secondaryRoutes: RouteDef[] = [
  { page: 'history', label: 'Historial', icon: Icon.History, shortcut: '4', requiredFeature: 'module:history' },
  { page: 'templates', label: 'Mensajes', icon: Icon.Messages, requiredFeature: 'module:templates' },
  { page: 'lists', label: 'Listas', icon: Icon.Lists, requiredFeature: 'module:lists' },
  { page: 'chat', label: 'Chat', icon: Icon.Messages, badge: true },
  { page: 'community', label: 'Comunidad', icon: Icon.Users, requiredFeature: 'module:community' },
  { page: 'settings', label: 'Ajustes', icon: Icon.Settings, shortcut: '5' },
];
