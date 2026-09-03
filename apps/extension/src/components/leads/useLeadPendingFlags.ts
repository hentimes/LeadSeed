import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLeadPendingFlags, type LeadPendingFlags } from '../../services/leadPendingService';

/**
 * Citas y tareas pendientes por lead, para la lista.
 *
 * Mismo patron que `useSendCounts`: una consulta y un mapa estable que la fila
 * memoizada puede comparar por referencia.
 *
 * ## Por que vive aca y no en `src/hooks`
 *
 * `src/hooks` es capa de dominio y el linter le prohibe `document`, porque ese
 * codigo tiene que poder correr en React Native. Escuchar cuando el panel
 * vuelve a estar visible es de la plataforma web, no del dominio: el servicio
 * y el repositorio que consultan los datos si se quedan donde estaban.
 *
 * ## Por que se vuelve a consultar al volver
 *
 * Los distintivos se cargaban una sola vez, al montar. Agendar una cita o
 * cerrar una tarea ocurre en OTRA pantalla, asi que al volver a Leads la lista
 * seguia mostrando lo de antes hasta recargar el panel entero: un icono que ya
 * no correspondia, o ninguno donde acababa de aparecer algo.
 *
 * Se refresca cuando el panel vuelve a estar visible, que es el mismo momento
 * en que `App` recuenta las tareas pendientes. No hay suscripcion en vivo a
 * proposito: dos consultas al volver cuestan menos que mantener abiertos dos
 * canales para pintar dos iconos.
 */
export function useLeadPendingFlags(): Record<string, LeadPendingFlags> {
  const [flags, setFlags] = useState<Record<string, LeadPendingFlags>>({});
  const { user } = useAuth();
  const userId = user?.id;

  const refrescar = useCallback(async () => {
    if (!userId) {
      setFlags({});
      return;
    }

    try {
      setFlags(await fetchLeadPendingFlags(userId));
    } catch {
      // El distintivo es informativo: si la consulta falla, la lista se pinta
      // sin el en vez de romperse entera.
    }
  }, [userId]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') void refrescar();
    };

    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);

    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [refrescar]);

  return flags;
}
