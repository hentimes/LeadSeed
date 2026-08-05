import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPublicProfile } from '../repositories/publicProfileRepository';
import { subscribeToAnyIncomingDirectMessage, type DirectMessage } from '../repositories/directMessagesRepository';
import { usePresence } from './usePresence';

export interface DmSession {
  userId: string;
  label: string;
  avatarUrl?: string;
  minimized: boolean;
  unreadCount: number;
}

/**
 * Sesiones de mensaje directo visibles en la barra superior del chat.
 *
 * A diferencia de useDirectMessages (una conversacion puntual, para la
 * ventana ya abierta), esto escucha CUALQUIER mensaje entrante para poder
 * mostrar un avatar con contador aunque el destinatario nunca haya abierto
 * esa conversacion -- es lo que le avisa a la otra persona que le llego algo,
 * sin forzarle una ventana encima.
 */
export function useDirectMessageSessions(currentUserId?: string) {
  const [sessions, setSessions] = useState<Record<string, DmSession>>({});
  const knownIds = useRef<Set<string>>(new Set());
  // El directorio de presencia ya esta en memoria (viene del contexto global),
  // asi que da nombre/avatar sin esperar un round-trip. El fetch a
  // profiles_public queda como respaldo para cuando el remitente esta offline
  // o la presencia todavia no sincronizo esos campos.
  const { onlineUsers } = usePresence();
  const onlineUsersRef = useRef(onlineUsers);
  onlineUsersRef.current = onlineUsers;

  useEffect(() => {
    if (!currentUserId) return;

    return subscribeToAnyIncomingDirectMessage(currentUserId, (message: DirectMessage) => {
      const online = onlineUsersRef.current[message.sender_id];

      setSessions((prev) => {
        const existing = prev[message.sender_id];
        // Con la ventana abierta y visible, ese mensaje ya lo muestra en vivo
        // el propio useDirectMessages de la ventana; no hace falta duplicar
        // el aviso ni el contador.
        if (existing && !existing.minimized) return prev;

        return {
          ...prev,
          [message.sender_id]: {
            userId: message.sender_id,
            label: existing?.label || online?.full_name || 'Usuario',
            avatarUrl: existing?.avatarUrl || online?.avatar_url,
            minimized: true,
            unreadCount: (existing?.unreadCount ?? 0) + 1,
          },
        };
      });

      if (!knownIds.current.has(message.sender_id)) {
        knownIds.current.add(message.sender_id);
        void fetchPublicProfile(message.sender_id).then((profile) => {
          if (!profile) return;
          setSessions((prev) => {
            const current = prev[message.sender_id];
            if (!current) return prev;
            return {
              ...prev,
              [message.sender_id]: {
                ...current,
                label: profile.full_name || current.label,
                avatarUrl: profile.avatar_url || current.avatarUrl,
              },
            };
          });
        });
      }
    });
  }, [currentUserId]);

  const openSession = useCallback((userId: string, label: string, avatarUrl?: string) => {
    knownIds.current.add(userId);
    setSessions((prev) => ({
      ...prev,
      [userId]: {
        userId,
        label,
        avatarUrl: avatarUrl ?? prev[userId]?.avatarUrl,
        minimized: false,
        unreadCount: 0,
      },
    }));
  }, []);

  const minimizeSession = useCallback((userId: string) => {
    setSessions((prev) => (prev[userId] ? { ...prev, [userId]: { ...prev[userId], minimized: true } } : prev));
  }, []);

  const closeSession = useCallback((userId: string) => {
    setSessions((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  return { sessions, openSession, minimizeSession, closeSession };
}
