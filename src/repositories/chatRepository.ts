import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { ChatMessage, ChatRoom, Profile } from '../types';

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

export async function fetchChatProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles_public').select('*').eq('id', userId).single();
  if (error) return null;
  return data as Profile;
}

export async function fetchReplyMessageById(messageId: string): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, user_id, content, reply_to_id, created_at, user_profile:profiles_public(*)')
    .eq('id', messageId)
    .single();

  if (error) return null;
  return data as unknown as ChatMessage;
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

export async function insertChatMessage(
  roomId: string,
  userId: string,
  content: string,
  replyToId?: string
): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    room_id: roomId,
    user_id: userId,
    content,
    reply_to_id: replyToId || null,
  });

  if (error) throw error;
}

export function removeChatChannel(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel);
}

export async function fetchHasUnreadChatMessages(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_unread_chat_messages');
  if (error) return false;
  return data === true;
}

export async function upsertChatRoomRead(roomId: string, userId: string): Promise<void> {
  await supabase
    .from('chat_room_reads')
    .upsert(
      { room_id: roomId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,room_id' }
    );
}

/** Escucha mensajes nuevos de cualquier sala, para el indicador del menu. */
export function subscribeToAnyChatMessageInsert(
  onInsert: (message: ChatMessage) => void
): RealtimeChannel {
  return supabase
    .channel('chat-unread-watch')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        onInsert(payload.new as ChatMessage);
      }
    )
    .subscribe();
}
