import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { ChatMessage, ChatPinnedMessage, ChatRoom, Profile } from '../types';
import type { ChatAttachment } from './chatAttachmentsRepository';
import { uniqueChannelName } from '../utils/realtimeChannel';

export async function fetchDefaultChatRoom(): Promise<ChatRoom | null> {
  const { data, error } = await supabase.from('chat_rooms').select('*').eq('name', 'General').single();
  if (error) return null;
  return data as ChatRoom;
}

export async function fetchChatRoomById(roomId: string): Promise<ChatRoom | null> {
  const { data, error } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single();
  if (error) return null;
  return data as ChatRoom;
}

export async function updateChatRoomInfo(
  roomId: string,
  fields: { description?: string; rules?: string }
): Promise<void> {
  const { error } = await supabase.from('chat_rooms').update(fields).eq('id', roomId);
  if (error) throw error;
}

export async function freezeChatRoom(
  roomId: string,
  frozenBy: string,
  frozenUntil: string
): Promise<void> {
  const { error } = await supabase
    .from('chat_rooms')
    .update({ frozen_until: frozenUntil, frozen_by: frozenBy })
    .eq('id', roomId);
  if (error) throw error;
}

export async function unfreezeChatRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_rooms')
    .update({ frozen_until: null, frozen_by: null })
    .eq('id', roomId);
  if (error) throw error;
}

/** Cambios en la sala (por ahora, solo pausa/reanudacion) en vivo. */
export function subscribeToChatRoomUpdates(
  roomId: string,
  onUpdate: (room: ChatRoom) => void
): RealtimeChannel {
  return supabase
    .channel(`room-updates:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` },
      (payload) => onUpdate(payload.new as ChatRoom)
    )
    .subscribe();
}

export async function cleanChatRoomMessages(roomId: string): Promise<number> {
  const { data, error } = await supabase.rpc('clean_chat_room_messages', { p_room_id: roomId });
  if (error) throw error;
  return data as number;
}

export async function purgeChatRoomMessages(roomId: string): Promise<number> {
  const { data, error } = await supabase.rpc('purge_chat_room_messages', { p_room_id: roomId });
  if (error) throw error;
  return data as number;
}

/**
 * Mensajes borrados de la sala en vivo. Sin esto, cuando staff corre
 * @limpiar o @purgar, el resto de la gente conectada sigue viendo los
 * mensajes borrados hasta que recarga la sala.
 */
export function subscribeToRoomMessageDeletes(
  roomId: string,
  onDelete: (messageId: string) => void
): RealtimeChannel {
  return supabase
    .channel(`room-deletes:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => onDelete((payload.old as { id: string }).id)
    )
    .subscribe();
}

/** Borrado "blando" de un mensaje puntual: reemplaza su contenido por un
 * aviso en vez de borrar la fila, para no romper la conversacion alrededor. */
export async function deleteChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_chat_message', { p_message_id: messageId });
  if (error) throw error;
}

/** Cambios de contenido de mensajes ya enviados (por ahora, solo el borrado
 * de un admin) en vivo, para que a todos los conectados les llegue el aviso
 * sin tener que recargar la sala. */
export function subscribeToRoomMessageUpdates(
  roomId: string,
  onUpdate: (message: ChatMessage) => void
): RealtimeChannel {
  return supabase
    .channel(`room-message-updates:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => onUpdate(payload.new as ChatMessage)
    )
    .subscribe();
}

export async function fetchChatProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles_public').select('*').eq('id', userId).single();
  if (error) return null;
  return data as Profile;
}

// El embed a profiles_public necesita el hint explicito del nombre de la FK
// (!chat_messages_user_id_fkey) porque desde que existe chat_saved_messages
// (FK a chat_messages y a profiles) PostgREST encuentra dos caminos posibles
// entre chat_messages y profiles_public -- el autor directo, y uno indirecto
// via guardados -- y sin el hint rechaza la consulta entera con PGRST201
// ("more than one relationship was found"). Sin este hint, fetchRoomMessages,
// fetchSavedMessages y fetchPinnedMessages devuelven [] en cada llamada.
const USER_PROFILE_EMBED = 'user_profile:profiles_public!chat_messages_user_id_fkey(*)';

export async function fetchReplyMessageById(messageId: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`id, room_id, user_id, content, reply_to_id, created_at, ${USER_PROFILE_EMBED}`)
    .eq('id', messageId)
    .single();

  if (error) return null;
  return data as unknown as ChatMessage;
}

const ATTACHMENTS_EMBED =
  'attachments:chat_message_attachments(id, message_id, room_id, uploader_id, kind, storage_path, file_name, mime_type, size_bytes, width, height, created_at)';

const MESSAGE_SELECT = `id, room_id, user_id, content, reply_to_id, is_announcement, deleted_at, deleted_by, created_at, ${USER_PROFILE_EMBED}, ${ATTACHMENTS_EMBED}`;

/** Ultimos mensajes de la sala, del mas viejo al mas nuevo. */
export async function fetchRoomMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(MESSAGE_SELECT)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[chat] fetchRoomMessages', error);
    return [];
  }

  // Se pide descendente para quedarse con los ultimos N, y se invierte para
  // mostrarlos en orden de conversacion.
  return (data as unknown as ChatMessage[]).reverse();
}

export function subscribeToChatRoomMessageInserts(
  roomId: string,
  onInsert: (message: ChatMessage) => void
): RealtimeChannel {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onInsert(payload.new as ChatMessage);
      }
    )
    .subscribe();
}

/** Devuelve el id del mensaje creado, para poder asociarle un adjunto despues. */
export async function insertChatMessage(
  roomId: string,
  userId: string,
  content: string,
  replyToId?: string,
  isAnnouncement = false
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      content,
      reply_to_id: replyToId || null,
      is_announcement: isAnnouncement,
    })
    .select('id')
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

export function removeChatChannel(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel);
}

export async function fetchUnreadChatCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_unread_chat_messages');
  if (error || typeof data !== 'number') return 0;
  return data;
}

export async function upsertChatRoomRead(roomId: string, userId: string): Promise<void> {
  await supabase
    .from('chat_room_reads')
    .upsert(
      { room_id: roomId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,room_id' }
    );
}

/**
 * Escucha adjuntos nuevos de una sala. El mensaje se crea antes que el
 * adjunto (subir el archivo tarda), asi que quien ya tiene ese mensaje en
 * pantalla -- sea el que lo envio o cualquier otra persona conectada -- lo
 * completa cuando llega este evento, en vez de esperar a recargar el
 * historial.
 */
export function subscribeToRoomAttachmentInserts(
  roomId: string,
  onInsert: (attachment: ChatAttachment) => void
): RealtimeChannel {
  return supabase
    .channel(`room-attachments:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_message_attachments',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onInsert(payload.new as ChatAttachment);
      }
    )
    .subscribe();
}

/** Escucha mensajes nuevos de cualquier sala, para el indicador del menu. */
export function subscribeToAnyChatMessageInsert(
  onInsert: (message: ChatMessage) => void
): RealtimeChannel {
  return supabase
    .channel(uniqueChannelName('chat-unread-watch'))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        onInsert(payload.new as ChatMessage);
      }
    )
    .subscribe();
}

// --- Mensajes guardados ---------------------------------------------------

export async function fetchSavedMessages(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_saved_messages')
    .select(`created_at, message:chat_messages(${MESSAGE_SELECT})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[chat] fetchSavedMessages', error);
    return [];
  }

  return data
    .map((row) => (row as unknown as { message: ChatMessage | null }).message)
    .filter((message): message is ChatMessage => message !== null);
}

export async function fetchSavedMessageIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('chat_saved_messages')
    .select('message_id')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data.map((row) => (row as { message_id: string }).message_id);
}

export async function saveChatMessage(userId: string, messageId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_saved_messages')
    .insert({ user_id: userId, message_id: messageId });

  if (error && error.code !== '23505') throw error;
}

export async function unsaveChatMessage(userId: string, messageId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_saved_messages')
    .delete()
    .eq('user_id', userId)
    .eq('message_id', messageId);

  if (error) throw error;
}

// --- Mensajes fijados ------------------------------------------------------

const PINNED_SELECT = `message_id, room_id, pinned_by, pinned_until, created_at, message:chat_messages(${MESSAGE_SELECT})`;

export async function fetchPinnedMessages(roomId: string): Promise<ChatPinnedMessage[]> {
  const { data, error } = await supabase
    .from('chat_pinned_messages')
    .select(PINNED_SELECT)
    .eq('room_id', roomId)
    .gt('pinned_until', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[chat] fetchPinnedMessages', error);
    return [];
  }
  return data as unknown as ChatPinnedMessage[];
}

export async function pinChatMessage(
  messageId: string,
  roomId: string,
  pinnedBy: string,
  pinnedUntil: string
): Promise<void> {
  const { error } = await supabase.from('chat_pinned_messages').insert({
    message_id: messageId,
    room_id: roomId,
    pinned_by: pinnedBy,
    pinned_until: pinnedUntil,
  });

  if (error) throw error;
}

export async function unpinChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('chat_pinned_messages').delete().eq('message_id', messageId);
  if (error) throw error;
}

export function subscribeToPinnedMessageChanges(roomId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`pinned:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_pinned_messages', filter: `room_id=eq.${roomId}` },
      onChange
    )
    .subscribe();
}

// --- Anuncios (@todos) ------------------------------------------------------

/** Anuncios que el usuario todavia no vio, para avisarle al conectarse. */
export async function fetchPendingAnnouncements(): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('pending_chat_announcements');
  if (error || !data) return [];
  return data as ChatMessage[];
}
