export type SettingsTab = 'general' | 'data' | 'alerts' | 'channels' | 'agenda' | 'account';

/**
 * Donde aterriza cada `#hash` de Configuracion.
 *
 * Las ocho subsecciones pasan a seis pestanas, pero **ningun enlace de hoy
 * deja de funcionar**: los tres hashes que se quedaron sin pestana propia
 * -`#goals`, `#links`, `#support`- resuelven ahora a la pestana que los acogio
 * y ademas dicen que bloque hay que abrir dentro. Eso importa porque el rail,
 * el menu de usuario (`#cuenta`) y la propia app enlazan por hash.
 *
 * `#alerts` es nuevo: las alertas vivian enterradas dentro de "Apariencia" y
 * no habia forma de enlazarlas.
 */
export interface SettingsRoute {
  tab: SettingsTab;
  /** Seccion desplegable que se abre al entrar, si el hash apunta a una. */
  block?: string;
}

const RUTAS: Record<string, SettingsRoute> = {
  display: { tab: 'general' },
  goals: { tab: 'general', block: 'metas' },
  data: { tab: 'data' },
  alerts: { tab: 'alerts' },
  email: { tab: 'channels', block: 'correo' },
  links: { tab: 'channels', block: 'enlaces' },
  agenda: { tab: 'agenda' },
  cuenta: { tab: 'account' },
  support: { tab: 'account', block: 'ayuda-vip' },
};

export function rutaDesdeHash(hash: string): SettingsRoute | null {
  // El hash puede traer parametros (`#agenda?appointment=x`), que aqui no
  // interesan pero no deben impedir que la pestana se resuelva.
  const limpio = hash.replace('#', '').split('?')[0] ?? '';
  return RUTAS[limpio] ?? null;
}

/**
 * El hash canonico de cada pestana: el camino de vuelta.
 *
 * Hace falta desde que el rail dejo de tener submenu. Antes el rail siempre
 * mandaba un hash, asi que el hash de la URL y la pestana visible coincidian
 * por construccion. Con una entrada que navega sin hash, el hash se quedaba
 * congelado en el ultimo que se escribio: salias de Ajustes estando en Cuenta,
 * volvias desde el rail, y `useState(rutaDesdeHash(...))` te devolvia a Cuenta
 * sin haberlo pedido.
 *
 * Escribiendolo al cambiar de pestana, la URL siempre dice donde estas, volver
 * te deja donde lo dejaste y las pestanas quedan enlazables.
 *
 * Ojo con dos que no son la identidad: `general` es `#display` y `channels` es
 * `#email`. Se conservan esos nombres porque son los que ya circulan.
 */
const HASH_DE_TAB: Record<SettingsTab, string> = {
  general: '#display',
  data: '#data',
  alerts: '#alerts',
  channels: '#email',
  agenda: '#agenda',
  account: '#cuenta',
};

export function hashDeTab(tab: SettingsTab): string {
  return HASH_DE_TAB[tab];
}
