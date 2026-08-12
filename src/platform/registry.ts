import type { Platform } from './types';

/**
 * Registro de la plataforma activa.
 *
 * Es la pieza que faltaba para que los puertos sirvieran de algo. Hasta el
 * `2026-08-12` los consumidores hacian `import { webDialogs } from
 * '../platform/web'`, lo que **arrastra `chrome.*` al grafo de modulos igual
 * que llamar a `chrome` directamente**. La segunda auditoria lo resumio bien:
 * se habia cambiado acoplamiento textual por acoplamiento de import, y ESLint
 * solo sabia ver el primero. El indicador estaba optimizado, no la propiedad.
 *
 * Con el registro, la capa de dominio solo conoce `platform/types` (que son
 * tipos, se borran al compilar) y pide la implementacion en tiempo de
 * ejecucion. El unico modulo que menciona `platform/web` es el punto de
 * entrada.
 *
 * ## Por que un registro y no un contexto de React
 *
 * Tres de los diez consumidores (`appSettings`, `appMaintenance`, `waHelper`)
 * no son componentes ni hooks, asi que un contexto no les sirve. Se podria
 * tener contexto para React y registro para el resto, pero serian dos
 * mecanismos para el mismo problema y siempre habria que decidir cual toca.
 * Un registro cubre los diez.
 *
 * ## Como se usa en el port a movil
 *
 * `main.tsx` llama `setPlatform(webPlatform)`. El dia del port, el entry de
 * Expo llamara `setPlatform(nativePlatform)` y **ningun archivo de dominio
 * cambia**. Ese es el criterio de exito del bloque 5.
 */
let activePlatform: Platform | null = null;

/**
 * Registra la plataforma. Se llama una sola vez, en el punto de entrada, antes
 * de montar nada.
 */
export function setPlatform(platform: Platform): void {
  activePlatform = platform;
}

/**
 * Devuelve la plataforma activa.
 *
 * Lanza si nadie la registro. Es deliberado: un fallback silencioso a la
 * implementacion web volveria a meter `chrome.*` en el grafo y reintroduciria
 * justo el problema que este modulo existe para cerrar. Mejor un error claro en
 * el arranque que un acoplamiento invisible.
 */
export function getPlatform(): Platform {
  if (!activePlatform) {
    throw new Error(
      'Plataforma no registrada. Llama a setPlatform() en el punto de entrada antes de usar los puertos.',
    );
  }

  return activePlatform;
}

/** Solo para tests: permite instalar una plataforma falsa y limpiarla. */
export function resetPlatformForTesting(platform: Platform | null): void {
  activePlatform = platform;
}
