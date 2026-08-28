import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchReactionsForMessages,
  subscribeToReactionChanges,
} from '../repositories/chatReactionsRepository';
import { removeChatChannel } from '../repositories/chatRepository';
import { toggleChatReaction } from '../services/chatService';
import type { ChatReactionEmoji, ChatReactionSummary } from '../types';

/**
 * Reacciones de los mensajes visibles de la sala.
 *
 * Vive aparte de `useChat` a proposito. Las reacciones cambian mucho mas a
 * menudo que los mensajes -y por gente que no escribio nada- asi que meterlas
 * en el mismo estado obligaria a recomponer la lista entera de mensajes cada
 * vez que alguien pone un pulgar.
 *
 * ## Como se cargan sin un N+1
 *
 * Una sola consulta agregada para TODOS los ids visibles, no una por mensaje.
 * La agregacion la hace la vista `chat_message_reaction_summary` en la base.
 *
 * ## Que pasa sin la migracion 119
 *
 * La consulta falla y el repositorio devuelve un mapa vacio. El chat sigue
 * funcionando entero: simplemente no aparece ninguna reaccion. Es la
 * degradacion que se busco, en vez de una pantalla rota.
 */
export interface ChatReactions {
  /** Reacciones por id de mensaje. Un mensaje sin reacciones no esta en el mapa. */
  byMessage: Map<string, ChatReactionSummary[]>;
  /** Pone la reaccion si no estaba, la quita si estaba. */
  toggle(messageId: string, emoji: ChatReactionEmoji): Promise<void>;
  /** Ids con un cambio en vuelo, para atenuarlos mientras viajan. */
  pending: Set<string>;
}

export function useChatReactions(
  roomId: string | undefined,
  userId: string | undefined,
  messageIds: string[]
): ChatReactions {
  const [byMessage, setByMessage] = useState<Map<string, ChatReactionSummary[]>>(new Map());
  const [pending, setPending] = useState<Set<string>>(new Set());

  /*
   * La lista de ids se compara por contenido y no por identidad: `messageIds`
   * es un array nuevo en cada render del componente que lo arma, y usarlo tal
   * cual como dependencia dispararia una consulta por render.
   */
  const clave = messageIds.join(',');

  /*
   * La copia en ref existe solo para el callback de realtime, que se registra
   * una vez y necesita consultar la lista vigente. Se escribe desde un efecto y
   * no durante el render: escribir una ref mientras se renderiza es un efecto
   * secundario y React lo desaconseja.
   */
  const idsRef = useRef<string[]>([]);

  useEffect(() => {
    idsRef.current = clave ? clave.split(',') : [];
  }, [clave]);

  const recargar = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        setByMessage(new Map());
        return;
      }
      setByMessage(await fetchReactionsForMessages(ids, userId));
    },
    [userId]
  );

  useEffect(() => {
    void recargar(clave ? clave.split(',') : []);
  }, [clave, recargar]);

  useEffect(() => {
    if (!roomId) return;

    const canal = subscribeToReactionChanges(roomId, (messageId) => {
      // Solo interesa si el mensaje esta en pantalla: la tabla no tiene
      // room_id, asi que llegan tambien los cambios de otras salas.
      if (!idsRef.current.includes(messageId)) return;
      void recargar(idsRef.current);
    });

    return () => removeChatChannel(canal);
  }, [roomId, recargar]);

  const toggle = useCallback(
    async (messageId: string, emoji: ChatReactionEmoji) => {
      if (!userId) return;

      const actuales = byMessage.get(messageId) ?? [];

      /*
       * UNA reaccion por persona y por mensaje.
       *
       * La tabla admitiria varias -su clave primaria es (mensaje, persona,
       * emoji)- pero el producto quiere que elegir una reemplace a la anterior,
       * como en WhatsApp. Se resuelve aca y ademas en la base con un trigger
       * (migracion 127): el cliente solo, con dos pestañas abiertas, no
       * alcanza.
       */
      const mia = actuales.find((r) => r.reactedByMe);
      const esLaMisma = mia?.emoji === emoji;
      const anterior = esLaMisma ? undefined : mia;

      /*
       * Optimista, mismo patron que `toggleLike` del foro: el chip responde al
       * instante y se revierte si el servidor dice que no. Sin esto hay un
       * retardo visible en cada pulgar, que es justo la interaccion que tiene
       * que sentirse gratis.
       */
      const siguiente = actuales
        .map((r) => {
          if (r.emoji === anterior?.emoji) {
            return { ...r, count: Math.max(0, r.count - 1), reactedByMe: false };
          }
          if (r.emoji === emoji) {
            return {
              ...r,
              count: Math.max(0, r.count + (esLaMisma ? -1 : 1)),
              reactedByMe: !esLaMisma,
            };
          }
          return r;
        })
        .concat(
          // La reaccion elegida todavia no existia en el mensaje.
          !esLaMisma && !actuales.some((r) => r.emoji === emoji)
            ? [{ emoji, count: 1, reactedByMe: true }]
            : []
        )
        .filter((r) => r.count > 0);

      setByMessage((prev) => new Map(prev).set(messageId, siguiente));
      setPending((prev) => new Set(prev).add(messageId));

      try {
        // Primero se quita la anterior y despues se pone la nueva: al reves,
        // un fallo a mitad dejaria dos reacciones puestas de la misma persona.
        if (anterior) await toggleChatReaction(messageId, userId, anterior.emoji, false);
        await toggleChatReaction(messageId, userId, emoji, !esLaMisma);
      } catch (error) {
        console.error('[chat] toggleChatReaction', error);
        // Se restaura la copia previa, no se recarga la sala entera: perder
        // cien mensajes por un pulgar fallido seria peor que el fallo.
        setByMessage((prev) => new Map(prev).set(messageId, actuales));
      } finally {
        setPending((prev) => {
          const siguientePendiente = new Set(prev);
          siguientePendiente.delete(messageId);
          return siguientePendiente;
        });
      }
    },
    [byMessage, userId]
  );

  return { byMessage, toggle, pending };
}
