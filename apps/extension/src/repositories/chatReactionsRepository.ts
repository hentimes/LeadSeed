import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { ChatReactionKind, ChatReactionSummary } from '../types';
import { uniqueChannelName } from '../utils/realtimeChannel';

/**
 * Acceso a las reacciones de los mensajes del chat.
 *
 * Vive en su propio archivo y no dentro de `chatRepository.ts` por el mismo
 * criterio que `chatAttachmentsRepository.ts`: es una tabla aparte, con su
 * propio ciclo de vida y su propio canal de realtime.
 *
 * Requiere la migracion 119.
 */

interface FilaDeResumen {
  message_id: string;
  reaction: ChatReactionKind;
  count: number;
  user_ids: string[];
}

/**
 * Reacciones de un lote de mensajes, agrupadas por mensaje.
 *
 * Es UNA consulta para todos los mensajes de la sala, no una por mensaje: con
 * cien mensajes en pantalla, la version ingenua serian cien viajes. El agregado
 * lo hace la vista `chat_message_reaction_summary` en la base, asi que aca solo
 * se reordena lo que llega.
 *
 * `currentUserId` se pasa como argumento en vez de leerlo de la sesion adentro
 * para que la funcion siga siendo una consulta pura y se pueda probar.
 */
export async function fetchReactionsForMessages(
  messageIds: string[],
  currentUserId?: string
): Promise<Map<string, ChatReactionSummary[]>> {
  const porMensaje = new Map<string, ChatReactionSummary[]>();
  if (messageIds.length === 0) return porMensaje;

  const { data, error } = await supabase
    .from('chat_message_reaction_summary')
    .select('message_id, reaction, count, user_ids')
    .in('message_id', messageIds);

  if (error || !data) {
    // Sin la migracion 119 aplicada esto falla, y es una degradacion aceptable:
    // el chat sigue funcionando entero, simplemente sin reacciones.
    if (error) console.error('[chat] fetchReactionsForMessages', error);
    return porMensaje;
  }

  for (const fila of data as unknown as FilaDeResumen[]) {
    const lista = porMensaje.get(fila.message_id) ?? [];
    lista.push({
      reaction: fila.reaction,
      count: fila.count,
      reactedByMe: !!currentUserId && fila.user_ids.includes(currentUserId),
    });
    porMensaje.set(fila.message_id, lista);
  }

  return porMensaje;
}

/**
 * Pone o quita una reaccion.
 *
 * El codigo `23505` es "clave duplicada": significa que esa reaccion ya estaba
 * puesta. No es un error que haya que mostrar -el estado final es el que el
 * usuario queria- y pasa de verdad cuando dos pestañas de la misma cuenta
 * reaccionan a la vez.
 */
export async function toggleChatReaction(
  messageId: string,
  userId: string,
  reaction: ChatReactionKind,
  reacted: boolean
): Promise<void> {
  if (reacted) {
    const { error } = await supabase
      .from('chat_message_reactions')
      .insert({ message_id: messageId, user_id: userId, reaction });

    if (error && error.code !== '23505') throw error;
    return;
  }

  const { error } = await supabase
    .from('chat_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('reaction', reaction);

  if (error) throw error;
}

/**
 * Avisa cuando cambia cualquier reaccion.
 *
 * No se filtra por sala en el servidor porque la tabla no tiene `room_id`: se
 * decidio no desnormalizarlo solo para el filtro del canal. Quien escucha
 * compara el id contra los mensajes que ya tiene cargados e ignora el resto,
 * que es lo mismo que hace la suscripcion a mensajes nuevos.
 */
export function subscribeToReactionChanges(
  scope: string,
  onChange: (messageId: string) => void
): RealtimeChannel {
  return supabase
    .channel(uniqueChannelName('chat-reactions', scope))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_message_reactions' },
      (payload) => {
        const fila = (payload.new ?? payload.old) as { message_id?: string } | null;
        if (fila?.message_id) onChange(fila.message_id);
      }
    )
    .subscribe();
}
