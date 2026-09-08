import { useCallback, useEffect, useState } from 'react';
import {
  fetchRunsForLead,
  iniciarRecorrido,
  mensajeDeInicio,
} from '../services/playbookRunService';
import type { PlaybookRun } from '../types';

/**
 * Los recorridos de un lead.
 *
 * Vive aparte de `useLeadDetail` -que ya son 528 lineas y esta señalado como
 * demasiado grande- en vez de crecerlo. El detalle del lead monta los dos.
 */
export function usePlaybookRunsForLead(leadId: string) {
  const [recorridos, setRecorridos] = useState<PlaybookRun[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [iniciando, setIniciando] = useState(false);

  const cargar = useCallback(async () => {
    if (!leadId) {
      setRecorridos([]);
      return;
    }

    setCargando(true);
    try {
      setRecorridos(await fetchRunsForLead(leadId));
    } finally {
      setCargando(false);
    }
  }, [leadId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Empieza un recorrido y devuelve su id, o cadena vacia si no pudo.
   *
   * `iniciando` no es cosmetico: dos toques seguidos son dos llamadas, y la
   * segunda choca con el indice unico parcial. El boton deshabilitado es la
   * primera defensa; `mensajeDeInicio` es la segunda, para la carrera que
   * viene de otra pestaña o de otro dispositivo.
   */
  const iniciar = useCallback(
    async (playbookId: string, originAppointmentId?: string | null): Promise<string> => {
      if (iniciando) return '';

      setIniciando(true);
      setError('');
      try {
        const runId = await iniciarRecorrido({ playbookId, leadId, originAppointmentId });
        await cargar();
        return runId;
      } catch (err) {
        await cargar();
        setError(mensajeDeInicio(err));
        return '';
      } finally {
        setIniciando(false);
      }
    },
    [leadId, iniciando, cargar],
  );

  const enCurso = recorridos.filter((r) => r.status === 'en_curso');
  const historicos = recorridos.filter((r) => r.status !== 'en_curso');

  /** El recorrido activo de un guion concreto, si lo hay. */
  const enCursoDe = useCallback(
    (playbookId: string): PlaybookRun | undefined =>
      enCurso.find((r) => r.playbookId === playbookId),
    [enCurso],
  );

  return { recorridos, enCurso, historicos, enCursoDe, cargando, error, iniciando, iniciar, recargar: cargar };
}
