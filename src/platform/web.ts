/* eslint-disable no-restricted-globals -- Este archivo ES la frontera con el
   entorno web. Es el unico sitio del repositorio donde `confirm` y `alert`
   estan permitidos, y existe precisamente para que no aparezcan en ningun otro
   lado. Ver src/platform/types.ts. */

import type { AppRoute, DialogsPort, NavigationPort, Platform } from './types';

/**
 * Implementacion de los puertos para la extension de Chrome.
 *
 * Deliberadamente delega en los mismos `confirm`, `alert` y `window.location.hash`
 * que la capa de dominio usaba antes. El objetivo de este bloque es invertir la
 * dependencia, no cambiar el comportamiento: el usuario debe ver exactamente los
 * mismos dialogos y la misma navegacion que antes.
 */

export const webDialogs: DialogsPort = {
  async confirm(message: string) {
    return window.confirm(message);
  },
  async alert(message: string) {
    window.alert(message);
  },
};

/**
 * Navegacion sobre el hash de la URL.
 *
 * El formato del hash (`#leads?lead=<id>`, `#agenda?appointment=<id>`) se
 * mantiene igual al que ya usaba la aplicacion, porque `App.tsx` y el resto de
 * la shell siguen leyendolo. Este modulo lo encapsula para que la capa de
 * dominio hable de rutas y no de cadenas.
 */
function parseHash(hash: string): AppRoute | null {
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!clean) return null;

  const [name, query = ''] = clean.split('?');
  const params = new URLSearchParams(query);

  if (name === 'leads') {
    const route: AppRoute = { name: 'leads' };
    const leadId = params.get('lead');
    if (leadId) route.leadId = leadId;
    if (params.get('filter') === 'olvidados') route.filter = 'olvidados';
    if (params.get('action') === 'new') route.action = 'new';
    return route;
  }

  if (name === 'agenda') {
    const appointmentId = params.get('appointment');
    return appointmentId ? { name: 'agenda', appointmentId } : { name: 'agenda' };
  }

  return null;
}

function buildHash(route: AppRoute): string {
  if (route.name === 'leads') {
    const params = new URLSearchParams();
    if (route.leadId) params.set('lead', route.leadId);
    if (route.filter) params.set('filter', route.filter);
    if (route.action) params.set('action', route.action);
    const query = params.toString();
    return query ? `#leads?${query}` : '#leads';
  }

  return route.appointmentId
    ? `#agenda?appointment=${route.appointmentId}`
    : '#agenda';
}

export const webNavigation: NavigationPort = {
  current() {
    return parseHash(window.location.hash || '');
  },
  replace(route: AppRoute) {
    window.location.hash = buildHash(route);
  },
  subscribe(onChange: () => void) {
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  },
};

export const webPlatform: Platform = {
  dialogs: webDialogs,
  navigation: webNavigation,
};

/** Exportadas para test: son funciones puras y concentran el parseo fragil. */
export const __testing = { parseHash, buildHash };
