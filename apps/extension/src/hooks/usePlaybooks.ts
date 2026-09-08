import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeRefresh } from './useRealtimeRefresh';
import {
  fetchPlaybooks,
  fetchPlaybookContent,
  savePlaybook,
  setPlaybookActive,
  type PlaybookDraft,
} from '../services/playbooksService';
import type { Playbook, PlaybookContent } from '../types';

/**
 * Las definiciones: los guiones y su contenido.
 *
 * Mismo contrato que `useMessageFlows`: `refreshKey` para que quien lo use
 * vuelva a pedir datos cuando cambian desde otra pestaña.
 */
export function usePlaybooks() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Playbook[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const subscriptions = useMemo(
    () => [{ channel: 'public:playbooks', table: 'playbooks' }],
    [],
  );
  const { refreshKey, triggerRefresh } = useRealtimeRefresh(subscriptions);

  const recargar = useCallback(
    async (soloActivos = false) => {
      if (!user) {
        setLista([]);
        return;
      }

      setCargando(true);
      setError('');
      try {
        setLista(await fetchPlaybooks(soloActivos));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los guiones');
      } finally {
        setCargando(false);
      }
    },
    [user],
  );

  const getContenido = useCallback(
    (playbookId: string): Promise<PlaybookContent> => fetchPlaybookContent(playbookId),
    [],
  );

  const guardar = useCallback(
    async (draft: PlaybookDraft): Promise<string> => {
      if (!user) throw new Error('Sesión no iniciada');
      const id = await savePlaybook(draft, user.id);
      triggerRefresh();
      return id;
    },
    [user, triggerRefresh],
  );

  const archivar = useCallback(
    async (id: string, activo: boolean) => {
      await setPlaybookActive(id, activo);
      triggerRefresh();
    },
    [triggerRefresh],
  );

  return { lista, cargando, error, refreshKey, recargar, getContenido, guardar, archivar };
}
