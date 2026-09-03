import { useCallback, useEffect, useRef, useState } from 'react';
import { useLeads } from './useLeads';
import { useLists } from './useLists';
import { useWhatsAppTemplates } from './useTemplates';
import type { Lead, LeadList, WhatsAppTemplate } from '../types';

/**
 * Los tres catalogos que necesita el pipeline.
 *
 * ## Que estaba mal
 *
 * Eran tres `await` en fila dentro de un efecto -leads, listas, plantillas-,
 * o sea tres viajes de ida y vuelta encadenados antes de pintar nada, y ninguno
 * depende del anterior.
 *
 * Peor: no habia `try`. Si la primera llamada fallaba, la promesa quedaba
 * rechazada sin manejar y la pantalla se quedaba con `leads` en vacio, que es
 * indistinguible de "no tenes ningun lead". Un fallo de red se mostraba como un
 * pipeline vacio.
 *
 * Y no habia estado de carga: el primer render pintaba los contadores en cero y
 * los cuadrantes vacios, y despues saltaba a los datos.
 *
 * Es el mismo patron que `SendPage` ya resolvio para sus ocho catalogos; aca se
 * calca en vez de reinventarlo.
 */
export function usePipelineData() {
  const { getAll: getLeads, refreshKey } = useLeads();
  const { getAll: getLists } = useLists();
  const { getAll: getWaTemplates } = useWhatsAppTemplates();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  /*
   * `cargando` solo vale para la PRIMERA carga.
   *
   * Cada guardado dispara `triggerRefresh`, y con el esqueleto atado a toda
   * recarga la pantalla entera se vaciaba y volvia a aparecer cada vez que
   * movias un lead: un parpadeo feo en el que se perdia de vista el tablero y
   * el panel de seguimiento saltaba de sitio.
   *
   * En una recarga ya hay datos en pantalla, y ademas el movimiento ya se ve
   * aplicado por el estado optimista de la pagina. Sustituir todo eso por
   * bloques grises no informa nada: solo lo tapa.
   */
  const yaCargoAlgunaVez = useRef(false);

  const cargar = useCallback(async () => {
    if (!yaCargoAlgunaVez.current) setCargando(true);
    setFallo(false);

    try {
      const [proximosLeads, proximasListas, proximasPlantillas] = await Promise.all([
        getLeads(),
        getLists(),
        getWaTemplates(),
      ]);

      setLeads(proximosLeads);
      setLists(proximasListas);
      setWaTemplates(proximasPlantillas);
    } catch (error) {
      console.error('[pipeline] no se pudieron cargar los datos', error);
      setFallo(true);
    } finally {
      yaCargoAlgunaVez.current = true;
      setCargando(false);
    }
    // Los hooks devuelven funciones nuevas en cada render; depender de ellas
    // dispararia la carga en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, refreshKey]);

  return { leads, lists, waTemplates, cargando, fallo, recargar: cargar };
}
