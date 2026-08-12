import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ChatMessage, ChatRoom } from '../types';
import {
  loadRoomHistory,
  resolveChatRoom,
  sendRoomMessage,
  subscribeToChatRoomUpdates,
  subscribeToRoomAttachmentInserts,
  subscribeToRoomMessageDeletes,
  subscribeToRoomMessageUpdates,
  subscribeToRoomMessages,
} from '../services/chatService';
import type { ChatAttachment } from '../services/chatAttachmentsService';

export function useChat(roomId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<ChatRoom | null>(null);

  useEffect(() => {
    let isMounted = true;

    resolveChatRoom(roomId).then((resolvedRoom) => {
      if (!isMounted) return;
      setRoom(resolvedRoom);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!room) return;

    let isMounted = true;

    void loadRoomHistory(room.id).then((history) => {
      if (!isMounted) return;
      // El historial no pisa lo que haya llegado en vivo mientras se cargaba.
      setMessages((prev) => {
        const known = new Set(history.map((message) => message.id));
        return [...history, ...prev.filter((message) => !known.has(message.id))];
      });
    });

    return () => {
      isMounted = false;
    };
  }, [room?.id]);

  useEffect(() => {
    if (!room) return;

    return subscribeToRoomMessages(room.id, (message) => {
      setMessages((prev) =>
        prev.some((item) => item.id === message.id) ? prev : [...prev, message]
      );
    });
  }, [room]);

  useEffect(() => {
    if (!room) return;

    return subscribeToRoomAttachmentInserts(room.id, (attachment) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === attachment.message_id
            ? { ...message, attachments: [...(message.attachments ?? []), attachment] }
            : message
        )
      );
    });
  }, [room]);

  // Sin esto, cuando staff corre @limpiar o @purgar, el resto de la gente
  // conectada sigue viendo los mensajes borrados hasta que recarga la sala.
  useEffect(() => {
    if (!room) return;

    return subscribeToRoomMessageDeletes(room.id, (messageId) => {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    });
  }, [room?.id]);

  // Cuando un admin borra un mensaje puntual, su contenido cambia por un
  // aviso (no se borra la fila) -- sin esto, el resto de la gente conectada
  // sigue viendo el mensaje original hasta que recarga la sala.
  useEffect(() => {
    if (!room) return;

    return subscribeToRoomMessageUpdates(room.id, (updatedMessage) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === updatedMessage.id
            ? { ...message, content: updatedMessage.content, deleted_at: updatedMessage.deleted_at, deleted_by: updatedMessage.deleted_by }
            : message
        )
      );
    });
  }, [room?.id]);

  // Pausa/reanudacion en vivo: quien esta con el chat abierto se entera sin
  // recargar cuando alguien corre @silenciar o lo reanuda antes de tiempo.
  useEffect(() => {
    if (!room) return;

    return subscribeToChatRoomUpdates(room.id, (updatedRoom) => {
      setRoom((prev) => (prev ? { ...prev, ...updatedRoom } : prev));
    });
  }, [room?.id]);

  const sendMessage = useCallback(
    async (content: string, replyToId?: string, isAnnouncement = false) => {
      if (!user || !room) return undefined;
      return sendRoomMessage(room.id, user.id, content, replyToId, isAnnouncement);
    },
    [user, room]
  );

  /** Completa localmente el mensaje recien enviado, sin esperar el evento
   * realtime del propio adjunto (asi el que subio el archivo lo ve al toque). */
  const attachToMessage = useCallback((messageId: string, attachment: ChatAttachment) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              attachments: message.attachments?.some((item) => item.id === attachment.id)
                ? message.attachments
                : [...(message.attachments ?? []), attachment],
            }
          : message
      )
    );
  }, []);

  return {
    room,
    messages,
    loading,
    sendMessage,
    attachToMessage,
  };
}
