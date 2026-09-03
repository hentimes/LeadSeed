import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { countUnreadChatMessages, subscribeToIncomingChatMessages } from '../services/chatService';
import {
  fetchUnreadDirectMessageCount,
  subscribeToAnyIncomingDirectMessage,
} from '../repositories/directMessagesRepository';
import type { Page } from '../types';

/**
 * Cantidad de mensajes de chat sin leer (sala + directos), para el badge del
 * menu. Vive fuera de la pagina de chat porque justamente debe contar lo que
 * llega mientras el usuario esta en otra seccion.
 */
export function useChatUnread(currentPage: Page): number {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isViewingChat = currentPage === 'chat';

  const refresh = useCallback(async (userId: string) => {
    const [roomCount, dmCount] = await Promise.all([
      countUnreadChatMessages(),
      fetchUnreadDirectMessageCount(userId),
    ]);
    setUnreadCount(roomCount + dmCount);
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Dentro del chat, la sala y los DM abiertos ya se marcan leidos solos:
    // el badge del menu no tiene sentido mientras estas mirando la seccion.
    if (isViewingChat) {
      setUnreadCount(0);
      return;
    }

    // Al volver de otra seccion se recuenta contra la base: asi el numero es
    // correcto aunque los mensajes hayan llegado con la extension cerrada.
    void refresh(user.id);

    const unsubscribeRoom = subscribeToIncomingChatMessages(user.id, () => {
      setUnreadCount((prev) => prev + 1);
    });
    const unsubscribeDm = subscribeToAnyIncomingDirectMessage(user.id, () => {
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeDm();
    };
  }, [user, isViewingChat, refresh]);

  return unreadCount;
}
