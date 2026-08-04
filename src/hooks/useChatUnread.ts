import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasUnreadChatMessages, subscribeToIncomingChatMessages } from '../services/chatService';
import type { Page } from '../types';

/**
 * Indicador de mensajes de chat sin leer para el menu de navegacion.
 * Vive fuera de la pagina de chat porque justamente debe avisar cuando el
 * usuario no la esta mirando.
 */
export function useChatUnread(currentPage: Page): boolean {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const isViewingChat = currentPage === 'chat';

  const refresh = useCallback(async () => {
    setHasUnread(await hasUnreadChatMessages());
  }, []);

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    // Al entrar al chat, ChatRoom marca la sala como leida; al salir volvemos a
    // consultar para reflejar lo que haya llegado mientras tanto.
    if (isViewingChat) {
      setHasUnread(false);
      return;
    }

    void refresh();

    return subscribeToIncomingChatMessages(user.id, () => setHasUnread(true));
  }, [user, isViewingChat, refresh]);

  return hasUnread;
}
