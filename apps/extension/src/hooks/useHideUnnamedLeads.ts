/**
 * El interruptor de "ocultar leads sin nombre". UNA sola memoria para toda la
 * aplicacion.
 *
 * Primero fue un `useState` suelto repetido en varias pantallas, asi que cada
 * una tenia su copia y cambiar de seccion lo reiniciaba. Se movio a
 * `AppSettings` -que se guarda en `profiles`- porque es una preferencia de
 * trabajo, no un estado de pantalla.
 *
 * Pero quedaron memorias sueltas conviviendo con esa: un `localStorage` propio
 * en la hoja de destinatarios y dos `useState` mas, en la tabla de una lista y
 * en el formulario de tareas. Cuatro sitios con cuatro ideas del mismo valor:
 * lo apagabas en Leads y en Enviar seguia encendido.
 *
 * COMO SE RESUELVEN LAS DOS EXIGENCIAS A LA VEZ
 *
 * La hoja de destinatarios tenia motivo para su `localStorage`: se abre de
 * golpe con un toque, y `getSettings()` es asincrono, asi que el interruptor
 * parpadeaba de apagado a encendido en el primer fotograma. Esa exigencia es
 * legitima y se conserva; lo que cambia es el papel del `localStorage`, que
 * pasa de memoria rival a CACHE del ajuste de la cuenta:
 *
 *   1. El primer fotograma sale del cache, sincrono, sin parpadeo.
 *   2. Cuando llega el ajuste del servidor, manda ese y se refresca el cache.
 *   3. Al cambiarlo se escribe cache y servidor.
 *
 * Y para que dos pantallas montadas a la vez no discrepen, el valor vive en un
 * almacen de modulo con suscriptores en vez de en un `useState` por copia:
 * apagarlo en un sitio lo apaga en todos en el mismo fotograma.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getSettings, saveSettings } from '../services/appSettingsService';
import { getPlatform } from '../platform/registry';

const CLAVE_CACHE = 'ls.leads.ocultarSinNombre';

/*
 * Va por `preferenceCache` y no por `localStorage` directo porque esta carpeta
 * es capa de dominio: el linter le prohibe los globales del navegador, y con
 * razon -la aplicacion movil no los tiene-. El puerto declara la lectura
 * sincrona como parte del contrato, que es lo unico que aqui hace falta y lo
 * que `StoragePort`, siendo asincrono, no puede dar.
 */
function leerCache(): boolean {
  // Ausente se lee como "mostrarlo todo". Fallar hacia "ocultar" esconderia
  // filas que nadie pidio esconder, y asi se pierden contactos de vista.
  return getPlatform().preferenceCache.get(CLAVE_CACHE) === '1';
}

function escribirCache(valor: boolean): void {
  getPlatform().preferenceCache.set(CLAVE_CACHE, valor ? '1' : '0');
}

/* -------------------------------------------------------------------------
   Almacen de modulo. Es minimo a proposito: un valor, una lista de avisos.
   ------------------------------------------------------------------------- */

/*
 * Perezoso a proposito: `leerCache()` pide la plataforma, y en tiempo de
 * modulo puede no estar registrada todavia -en los tests desde luego que no-.
 * Se resuelve en la primera lectura, que siempre ocurre dentro de un render.
 */
let valorActual: boolean | null = null;
const suscriptores = new Set<() => void>();

function suscribir(avisar: () => void): () => void {
  suscriptores.add(avisar);
  return () => {
    suscriptores.delete(avisar);
  };
}

function leer(): boolean {
  if (valorActual === null) valorActual = leerCache();
  return valorActual;
}

function fijar(valor: boolean): void {
  if (valor === leer()) return;
  valorActual = valor;
  suscriptores.forEach((avisar) => avisar());
}

/** Solo para los tests: devuelve el almacen a su estado inicial. */
export function reiniciarOcultarSinNombreParaTests(): void {
  valorActual = null;
  suscriptores.forEach((avisar) => avisar());
}

export function useHideUnnamedLeads(): [boolean, (valor: boolean) => void] {
  const ocultar = useSyncExternalStore(suscribir, leer, leer);

  useEffect(() => {
    let cancelado = false;

    getSettings()
      .then((ajustes) => {
        if (cancelado) return;
        // El servidor manda sobre el cache: puede haberlo cambiado otra
        // sesion, u otro dispositivo.
        fijar(ajustes.hideUnnamedLeads);
        escribirCache(ajustes.hideUnnamedLeads);
      })
      .catch(() => {
        // Si no se pueden leer los ajustes se sigue con lo que haya en cache,
        // que es mejor que volver a cero: el usuario ya habia elegido.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const cambiar = useCallback((valor: boolean) => {
    // Optimista: el interruptor responde al momento y el guardado va detras.
    // Es una preferencia visual; si el guardado falla, lo peor que pasa es que
    // la proxima sesion empiece como antes.
    fijar(valor);
    escribirCache(valor);

    void (async () => {
      try {
        const ajustes = await getSettings();
        await saveSettings({ ...ajustes, hideUnnamedLeads: valor });
      } catch {
        // Sin ruido en la interfaz: no merece un aviso a pantalla completa por
        // no haber recordado un interruptor.
      }
    })();
  }, []);

  return [ocultar, cambiar];
}
