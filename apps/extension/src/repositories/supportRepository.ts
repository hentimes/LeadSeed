import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Requirement } from '../types';
import { uniqueChannelName } from '../utils/realtimeChannel';

export interface InternalMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  context_req_id?: string;
  context_ticket_code?: string;
  context_ticket_type?: string;
}

type InternalMessagePayload = RealtimePostgresChangesPayload<InternalMessageRow>;

export async function fetchFirstAdminId(): Promise<string | null> {
  const { data } = await supabase.from('profiles_public').select('id').eq('role', 'admin').limit(1).single();
  return data?.id ?? null;
}

export async function fetchUserConversationMessages(userId: string): Promise<InternalMessageRow[]> {
  const { data } = await supabase
    .from('internal_messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.not.is.null),and(receiver_id.eq.${userId})`)
    .order('created_at', { ascending: false })
    .limit(30);
  return (data ?? []) as InternalMessageRow[];
}

export async function fetchConversationMessagesBetweenUsers(userAId: string, userBId: string): Promise<InternalMessageRow[]> {
  const { data } = await supabase
    .from('internal_messages')
    .select('*')
    .or(`and(sender_id.eq.${userAId},receiver_id.eq.${userBId}),and(sender_id.eq.${userBId},receiver_id.eq.${userAId})`)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as InternalMessageRow[];
}

export async function markConversationMessagesRead(receiverId: string, senderId: string): Promise<void> {
  await supabase
    .from('internal_messages')
    .update({ is_read: true })
    .eq('receiver_id', receiverId)
    .eq('sender_id', senderId)
    .eq('is_read', false);
}

export async function markMessageReadById(messageId: string): Promise<void> {
  await supabase.from('internal_messages').update({ is_read: true }).eq('id', messageId);
}

export async function insertInternalMessage(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('internal_messages').insert(payload);
  if (error) throw error;
}

export function subscribeReceiverMessages(userId: string, onInsert: (payload: InternalMessagePayload) => void): RealtimeChannel {
  return supabase
    .channel(uniqueChannelName('public:internal_messages_user', userId))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages', filter: `receiver_id=eq.${userId}` }, onInsert)
    .subscribe();
}

export function subscribeSenderMessages(
  userId: string,
  onInsert: (payload: InternalMessagePayload) => void,
  onUpdate: (payload: InternalMessagePayload) => void
): RealtimeChannel {
  return supabase
    .channel(uniqueChannelName('public:internal_messages_me', userId))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages', filter: `sender_id=eq.${userId}` }, onInsert)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'internal_messages', filter: `sender_id=eq.${userId}` }, onUpdate)
    .subscribe();
}

export function createSupportControlChannel(channelName: string): RealtimeChannel {
  return supabase.channel(channelName);
}

export async function fetchUserRequirements(userId: string): Promise<Requirement[]> {
  const { data } = await supabase.from('requirements').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return (data ?? []) as Requirement[];
}

export function subscribeUserRequirements(userId: string, channelName: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requirements', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
}

export async function updateRequirementFeedback(requirementId: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('requirements').update(payload).eq('id', requirementId);
  if (error) throw error;
}

export async function createRequirement(userId: string, ticketCode: string, type: string, content: string): Promise<void> {
  const { error } = await supabase.from('requirements').insert({
    user_id: userId,
    ticket_code: ticketCode,
    type,
    content,
    status: 'open',
  });
  if (error) throw error;
}

export async function removeSupportChannel(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}
