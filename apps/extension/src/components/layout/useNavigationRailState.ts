import { useCallback, useState } from 'react';

/**
 * Estado contraido/expandido del rail de navegacion.
 *
 * ## Por que `localStorage` y no `appSettings`
 *
 * El resto de preferencias (tema, modo compacto, columnas) viajan por
 * `chrome.storage` y Supabase, que son asincronos. Para el ancho de un menu
 * eso se nota: el primer fotograma se pintaria contraido y el rail saltaria a
 * 176px entre 200 y 800ms despues, en **cada** apertura del panel lateral.
 * `localStorage` es sincrono y se lee dentro del inicializador de `useState`,
 * asi que el primer fotograma ya es el correcto.
 *
 * Ademas es una preferencia de dispositivo, no de cuenta: el ancho comodo
 * depende de como tenga cada quien el panel de Chrome, no de quien firma.
 *
 * ## Por que vive junto al componente y no en `src/hooks`
 *
 * `src/hooks` es capa de dominio y el linter le prohibe `localStorage`, porque
 * ese codigo tiene que poder correr en React Native. El ancho de un rail de
 * navegacion no es dominio: es una preferencia de la interfaz web, y aqui no
 * estorba al port.
 */
const CLAVE = 'ls.rail.expanded';

/** Contraido por defecto: a 320px el rail abierto tapa mas de la mitad. */
function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    // Modo incognito o almacenamiento bloqueado: el rail sigue funcionando,
    // solo que sin recordar el estado entre sesiones.
    return false;
  }
}

function guardarPreferencia(expandido: boolean): void {
  try {
    localStorage.setItem(CLAVE, expandido ? '1' : '0');
  } catch {
    // Mismo caso: no poder recordarlo no es motivo para romper la navegacion.
  }
}

export interface NavigationRailState {
  isExpanded: boolean;
  toggle: () => void;
  collapse: () => void;
}

export function useNavigationRailState(): NavigationRailState {
  const [isExpanded, setIsExpanded] = useState<boolean>(leerPreferencia);

  const toggle = useCallback(() => {
    setIsExpanded((previo) => {
      const siguiente = !previo;
      guardarPreferencia(siguiente);
      return siguiente;
    });
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded((previo) => {
      if (!previo) return previo;
      guardarPreferencia(false);
      return false;
    });
  }, []);

  return { isExpanded, toggle, collapse };
}
