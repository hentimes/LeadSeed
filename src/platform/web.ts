/**
 * Implementacion de los puertos para la extension de Chrome.
 *
 * Este archivo ES la frontera con el entorno: es el sitio donde `chrome.*`,
 * `window` y `document` estan permitidos por diseño, y existe precisamente para
 * que no aparezcan en la capa de dominio.
 *
 * No lleva `eslint-disable`: `src/platform/` no esta en DOMAIN_LAYERS, asi que
 * la regla no le aplica. Tuvo uno durante varios commits y era inerte, no
 * suprimia nada. Lo detecto `reportUnusedDisableDirectives` en cuanto se activo.
 */
import { launchOAuthInTab } from './oauthTab';
import type {
  AppMessage,
  AppRoute,
  DeeplinkPort,
  DialogsPort,
  KeyValueStorePort,
  MessageBusPort,
  NavigationPort,
  OAuthLauncherPort,
  Platform,
  StoragePort,
} from './types';

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

/**
 * Almacenamiento sobre `chrome.storage`.
 *
 * Absorbe aqui el `try/catch` que antes estaba repetido en cada llamador: en
 * desarrollo web puro `chrome` no existe, y hasta ahora cada servicio se
 * defendia por su cuenta con un catch vacio. Centralizarlo elimina esa
 * repeticion y deja un unico sitio donde entender el fallback.
 */
function chromeArea(area: 'sync' | 'local'): KeyValueStorePort {
  return {
    async get(keys: string[]) {
      try {
        return await chrome.storage[area].get(keys);
      } catch {
        // Sin `chrome` disponible se responde vacio: la capa de dominio ya
        // trata la ausencia de valor como "sin preferencia guardada".
        return {};
      }
    },
    async set(values: Record<string, unknown>) {
      try {
        await chrome.storage[area].set(values);
      } catch {
        // Perder una preferencia no debe romper la operacion que la disparo.
      }
    },
  };
}

export const webStorage: StoragePort = {
  sync: chromeArea('sync'),
  local: chromeArea('local'),
};

export const webDeeplink: DeeplinkPort = {
  openExternal(url: string) {
    window.open(url, '_blank');
  },
};

/**
 * Canal de mensajes sobre `chrome.runtime`.
 *
 * `isAvailable` comprueba `chrome.runtime.id` y no solo la existencia de
 * `chrome`: en una pagina web servida fuera de la extension el objeto puede
 * existir parcialmente sin que haya un service worker detras.
 */
// Funciones de modulo y no metodos con `this`: un puerto existe para ser
// inyectado, y en el momento en que alguien haga `const { send } = messageBus`
// o pase `messageBus.send` como callback, `this` se pierde y revienta en
// runtime. Con `this` el contrato diria "inyectable" y la implementacion
// "solo invocable como metodo sobre el objeto original".
function messageBusAvailable(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
}

export const webMessageBus: MessageBusPort = {
  isAvailable: messageBusAvailable,

  async send(message: AppMessage) {
    if (!messageBusAvailable()) return;
    try {
      await chrome.runtime.sendMessage(message);
    } catch {
      // En MV3 el service worker puede estar dormido. Es un estado normal:
      // el receptor reconcilia su estado al despertar.
    }
  },

  subscribe(listener: (message: AppMessage) => void) {
    if (!messageBusAvailable()) return () => {};

    const handler = (message: unknown) => {
      if (message && typeof message === 'object' && 'type' in message) {
        listener(message as AppMessage);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  },
};

/**
 * OAuth en la extension de Chrome.
 *
 * Concentra la deteccion de entorno que antes estaba duplicada, identica, en
 * `LoginPage` y en `useEmailChannels`: ambos calculaban por su cuenta si
 * corrian dentro de la extension y de ahi derivaban la URL de retorno.
 */
function oauthCanCompleteInApp(): boolean {
  return window.location.protocol === 'chrome-extension:' && Boolean(chrome?.identity);
}

function oauthRedirectUrl(): string {
  // `chrome.identity.getRedirectURL()` devuelve un dominio reservado
  // (<id>.chromiumapp.org) que no resuelve a ningun sitio real; solo sirve
  // como marca de fin de flujo. Ver el comentario de oauthTab.ts.
  return oauthCanCompleteInApp()
    ? chrome.identity.getRedirectURL()
    : `${window.location.origin}${window.location.pathname}`;
}

export const webOAuth: OAuthLauncherPort = {
  canCompleteInApp: oauthCanCompleteInApp,
  redirectUrl: oauthRedirectUrl,

  async launch(oauthUrl: string) {
    if (oauthCanCompleteInApp()) {
      return launchOAuthInTab(oauthUrl, oauthRedirectUrl());
    }

    // Web plano: se abandona la pagina y el proveedor traera de vuelta al
    // usuario. No hay callback que devolver.
    window.location.assign(oauthUrl);
    return null;
  },
};


export const webPlatform: Platform = {
  dialogs: webDialogs,
  navigation: webNavigation,
  storage: webStorage,
  deeplink: webDeeplink,
  messageBus: webMessageBus,
  oauth: webOAuth,
};

/** Exportadas para test: son funciones puras y concentran el parseo fragil. */
export const __testing = { parseHash, buildHash };
