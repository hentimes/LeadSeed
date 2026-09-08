import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchRun,
  fetchRunItems,
  fetchRunNotes,
  marcarItem as marcarItemEnServidor,
  guardarNotaDeItem as guardarNotaEnServidor,
  guardarSelecciones as guardarSeleccionesEnServidor,
  guardarTextoDeCheckpoint as guardarCheckpointEnServidor,
  agregarNota as agregarNotaEnServidor,
  cerrarRecorrido,
  mensajeDeCierreDeRecorrido,
  type CierreDeRecorrido,
} from '../services/playbookRunService';
import { progresoDe } from '../utils/playbookProgress';
import type {
  PlaybookRun,
  PlaybookRunItem,
  PlaybookRunItemState,
  PlaybookRunNote,
  PlaybookSelection,
} from '../types';

/**
 * Un recorrido y su avance.
 *
 * ## Sin Realtime, a proposito
 *
 * Durante una reunion el unico que escribe aqui es esta pantalla. Un evento
 * entrante compitiendo con una marca optimista produce parpadeo: el item se
 * tacha, se destacha y se vuelve a tachar. Se recarga a mano, como la cola de
 * los flujos.
 */
export function usePlaybookRun(runId: string) {
  const [run, setRun] = useState<PlaybookRun | null>(null);
  const [items, setItems] = useState<PlaybookRunItem[]>([]);
  const [notas, setNotas] = useState<PlaybookRunNote[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [guardandoItemId, setGuardandoItemId] = useState('');
  /** Turno de la ultima escritura pedida por punto. Ver `guardarSelecciones`. */
  const secuenciaPorItem = useRef(new Map<string, number>());

  const cargar = useCallback(async () => {
    if (!runId) {
      setRun(null);
      setItems([]);
      setNotas([]);
      return;
    }

    setCargando(true);
    setError('');
    try {
      const [recorrido, susItems, susNotas] = await Promise.all([
        fetchRun(runId),
        fetchRunItems(runId),
        fetchRunNotes(runId),
      ]);
      setRun(recorrido);
      setItems(susItems);
      setNotas(susNotas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el guion');
    } finally {
      setCargando(false);
    }
  }, [runId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Marca optimista con vuelta atras.
   *
   * En una reunion el toque tiene que responder al instante; esperar al
   * servidor con el dedo en el aire hace dudar de si se registro. Si la
   * escritura falla se restaura el estado previo, porque dejar el item tachado
   * mintiendo es peor que no haberlo tachado.
   *
   * De la fila que responde el servidor se toman SOLO `state` y `answeredAt`.
   * Ese sello lo pone un trigger y el cliente no puede calcularlo; el resto de
   * campos no son de esta escritura y copiarlos pisaria lo que viaje a la vez.
   */
  const marcar = useCallback(
    async (itemId: string, state: PlaybookRunItemState) => {
      const previos = items;
      setItems((actuales) =>
        actuales.map((item) => (item.id === itemId ? { ...item, state } : item)),
      );
      setGuardandoItemId(itemId);
      setError('');

      try {
        const guardado = await marcarItemEnServidor(itemId, state);
        // Se toman SOLO los campos de esta escritura. Sustituir la fila entera
        // haria que marcar un punto pisara una seleccion que viajaba a la vez,
        // y la perdedora desapareceria de la pantalla hasta recargar.
        setItems((actuales) =>
          actuales.map((item) =>
            item.id === itemId
              ? { ...item, state: guardado.state, answeredAt: guardado.answeredAt }
              : item,
          ),
        );
      } catch (err) {
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo marcar el punto');
      } finally {
        setGuardandoItemId('');
      }
    },
    [items],
  );

  const guardarNotaDeItem = useCallback(async (itemId: string, note: string) => {
    setGuardandoItemId(itemId);
    setError('');
    try {
      const guardado = await guardarNotaEnServidor(itemId, note);
      setItems((actuales) =>
        actuales.map((item) => (item.id === itemId ? { ...item, note: guardado.note } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la nota');
    } finally {
      setGuardandoItemId('');
    }
  }, []);

  /**
   * Guarda lo respondido por opciones.
   *
   * ## El guardian de secuencia
   *
   * A diferencia de marcar -un toque, una llamada, con el boton deshabilitado
   * mientras viaja-, aqui se tocan varias fichas seguidas del mismo punto y las
   * llamadas se solapan. Sin numero de secuencia, la respuesta lenta del primer
   * toque puede pisar el resultado de uno posterior que ya volvio, y el usuario
   * ve que marco cinco y se guardaron cuatro.
   *
   * Deshabilitar las doce fichas mientras guarda seria la otra salida, y hace
   * el marcado insoportable en mitad de una llamada.
   */
  const guardarSelecciones = useCallback(
    async (itemId: string, selections: PlaybookSelection[]) => {
      const previos = items;
      const turno = (secuenciaPorItem.current.get(itemId) ?? 0) + 1;
      secuenciaPorItem.current.set(itemId, turno);

      setItems((actuales) =>
        actuales.map((item) => (item.id === itemId ? { ...item, selections } : item)),
      );
      setError('');

      try {
        const guardado = await guardarSeleccionesEnServidor(itemId, selections);
        if (secuenciaPorItem.current.get(itemId) !== turno) return;
        setItems((actuales) =>
          actuales.map((item) =>
            item.id === itemId ? { ...item, selections: guardado.selections } : item,
          ),
        );
      } catch (err) {
        if (secuenciaPorItem.current.get(itemId) !== turno) return;
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo guardar la respuesta');
      }
    },
    [items],
  );

  /** La frase de confirmacion editada a mano. `null` vuelve a la derivada. */
  const guardarTextoDeCheckpoint = useCallback(async (itemId: string, texto: string | null) => {
    setGuardandoItemId(itemId);
    setError('');
    try {
      const guardado = await guardarCheckpointEnServidor(itemId, texto);
      setItems((actuales) =>
        actuales.map((item) =>
          item.id === itemId ? { ...item, checkpointText: guardado.checkpointText } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la confirmación');
    } finally {
      setGuardandoItemId('');
    }
  }, []);

  const agregarNota = useCallback(
    async (body: string) => {
      setError('');
      try {
        const nota = await agregarNotaEnServidor(runId, body);
        setNotas((actuales) => [nota, ...actuales]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar la nota');
      }
    },
    [runId],
  );

  /**
   * Devuelve si se cerro. El error se deja puesto DESPUES de recargar, no
   * antes: `cargar` arranca con `setError('')` y se lo comeria, que es como se
   * quedaron mudos los fallos de la agenda.
   */
  const cerrar = useCallback(
    async (cierre: Omit<CierreDeRecorrido, 'runId'>): Promise<boolean> => {
      try {
        await cerrarRecorrido({ ...cierre, runId });
        await cargar();
        return true;
      } catch (err) {
        await cargar();
        setError(mensajeDeCierreDeRecorrido(err));
        return false;
      }
    },
    [runId, cargar],
  );

  return {
    run,
    items,
    notas,
    progreso: progresoDe(items),
    cargando,
    error,
    guardandoItemId,
    recargar: cargar,
    marcar,
    guardarNotaDeItem,
    guardarSelecciones,
    guardarTextoDeCheckpoint,
    agregarNota,
    cerrar,
  };
}
