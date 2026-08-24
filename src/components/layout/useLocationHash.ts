import { useSyncExternalStore } from 'react';

/**
 * El hash actual, como estado de React.
 *
 * Las siete secciones de Ajustes se abren escribiendo `window.location.hash`.
 * El menu marcaba la activa comparando contra `window.location.hash` durante
 * el render, pero nadie escuchaba `hashchange`: al saltar de Datos a Metas el
 * menu no se volvia a pintar y el resaltado se quedaba en la seccion anterior
 * hasta que algo mas provocara un render.
 *
 * Vive junto al rail y no en `src/hooks` porque el hash es del navegador: la
 * capa de dominio tiene prohibido `window` para que el nucleo pueda correr en
 * React Native.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useLocationHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
}

/**
 * Escribe el hash. Vive aqui y no en el rail para que el unico modulo que
 * conoce el hash del navegador sea este.
 */
export function setLocationHash(destino: string): void {
  window.location.hash = destino;
}
