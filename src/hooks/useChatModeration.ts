import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  blockUser,
  fetchBlockedUserIds,
  fetchMutedUserIds,
  muteUser,
  unblockUser,
  unmuteUser,
} from '../repositories/chatModerationRepository';

/**
 * Bloqueados y silenciados por el usuario actual. Ambos esconden mensajes en
 * el cliente; el bloqueo ademas corta el envio de DM del lado del servidor
 * (ver el trigger de la migracion 079).
 */
export function useChatModeration() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) return;
    const [blocked, muted] = await Promise.all([
      fetchBlockedUserIds(user.id),
      fetchMutedUserIds(user.id),
    ]);
    setBlockedIds(new Set(blocked));
    setMutedIds(new Set(muted));
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleBlock = useCallback(
    async (targetId: string, blocked: boolean) => {
      if (!user) return;
      setBlockedIds((prev) => {
        const next = new Set(prev);
        if (blocked) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
      try {
        await (blocked ? blockUser(user.id, targetId) : unblockUser(user.id, targetId));
      } catch {
        await refresh();
      }
    },
    [user, refresh]
  );

  const toggleMute = useCallback(
    async (targetId: string, muted: boolean) => {
      if (!user) return;
      setMutedIds((prev) => {
        const next = new Set(prev);
        if (muted) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
      try {
        await (muted ? muteUser(user.id, targetId) : unmuteUser(user.id, targetId));
      } catch {
        await refresh();
      }
    },
    [user, refresh]
  );

  // Union de ambos sets: se usa para filtrar el chat, sin necesidad de saber
  // si escondio el mensaje por bloqueo o por silencio.
  const hiddenUserIds = new Set<string>([...blockedIds, ...mutedIds]);

  return { blockedIds, mutedIds, hiddenUserIds, toggleBlock, toggleMute };
}
