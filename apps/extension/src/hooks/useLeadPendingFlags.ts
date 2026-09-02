import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeadPendingFlags, type LeadPendingFlags } from '../services/leadPendingService';

/**
 * Citas y tareas pendientes por lead, para la lista.
 *
 * Mismo patron que `useSendCounts`: una consulta al montar y un mapa estable
 * que la fila memoizada puede comparar por referencia.
 */
export function useLeadPendingFlags(): Record<string, LeadPendingFlags> {
  const [flags, setFlags] = useState<Record<string, LeadPendingFlags>>({});
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setFlags({});
      return;
    }

    void (async () => {
      try {
        const next = await fetchLeadPendingFlags(user.id);
        if (!cancelled) setFlags(next);
      } catch {
        // El distintivo es informativo: si la consulta falla, la lista se
        // pinta sin el en vez de romperse entera.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return flags;
}
