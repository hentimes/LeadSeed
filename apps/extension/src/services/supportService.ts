import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Requirement } from '../types';
import {
  createRequirement,
  createSupportControlChannel,
  fetchConversationMessagesBetweenUsers,
  fetchFirstAdminId,
  fetchUserConversationMessages,
  fetchUserRequirements,
  insertInternalMessage,
  markConversationMessagesRead,
  markMessageReadById,
  removeSupportChannel,
  subscribeReceiverMessages,
  subscribeSenderMessages,
  subscribeUserRequirements,
  updateRequirementFeedback,
} from '../repositories/supportRepository';

export type SupportMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  isSystem?: boolean;
  context_req_id?: string;
  context_ticket_code?: string;
  context_ticket_type?: string;
};

/**
 * Integra un mensaje llegado por realtime en la lista actual del chat.
 *
 * Resuelve tres casos que estaban implementados por duplicado y casi igual en
 * `AdminSupportChat` y `SupportFloatingChat`:
 *
 * - el mensaje confirma uno optimista que ya se pinto al enviar, y hay que
 *   sustituirlo en su sitio en vez de agregar un duplicado visual
 * - el mensaje ya esta en la lista (realtime puede reentregar), y se ignora
 * - el mensaje es nuevo y se agrega al final
 *
 * El pareo del optimista se hace por texto, que es lo que ambos componentes ya
 * hacian: el id definitivo lo asigna el backend, asi que no hay otra clave
 * comun entre la fila optimista y la real.
 */
export function reconcileIncomingSupportMessage(
  current: SupportMessage[],
  incoming: SupportMessage,
): SupportMessage[] {
  const optimistic = current.find(
    (item) => item.id.startsWith('temp-') && item.message === incoming.message,
  );

  if (optimistic) {
    return current.map((item) => (item.id === optimistic.id ? incoming : item));
  }

  if (current.some((item) => item.id === incoming.id)) {
    return current;
  }

  return [...current, incoming];
}

/** Reemplaza un mensaje ya presente, por id. Usado en los eventos UPDATE. */
export function applySupportMessageUpdate(
  current: SupportMessage[],
  updated: SupportMessage,
): SupportMessage[] {
  return current.map((item) => (item.id === updated.id ? updated : item));
}

function randomTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let index = 0; index < 4; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REQ-${result}`;
}

export async function loadPrimaryAdminId(): Promise<string | null> {
  return fetchFirstAdminId();
}

export async function loadUserSupportMessages(userId: string): Promise<SupportMessage[]> {
  return (await fetchUserConversationMessages(userId)) as SupportMessage[];
}

export async function loadAdminSupportMessages(adminId: string, selectedUserId: string): Promise<SupportMessage[]> {
  const rows = await fetchConversationMessagesBetweenUsers(adminId, selectedUserId);
  return (rows as SupportMessage[]).reverse();
}

export async function markConversationRead(receiverId: string, senderId: string): Promise<void> {
  await markConversationMessagesRead(receiverId, senderId);
}

export interface SupportMessageContext {
  context_req_id?: string;
  context_ticket_code?: string;
  context_ticket_type?: string;
}

export async function createSupportMessage(
  senderId: string,
  receiverId: string,
  message: string,
  context?: SupportMessageContext
): Promise<void> {
  await insertInternalMessage({ sender_id: senderId, receiver_id: receiverId, message, ...context });
}

export async function createSupportTicket(userId: string, type: string, description: string): Promise<void> {
  await createRequirement(userId, randomTicketCode(), type, description);
}

export async function loadUserSupportRequirements(userId: string): Promise<Requirement[]> {
  return fetchUserRequirements(userId);
}

export function subscribeUserSupportRequirements(userId: string, channelName: string, onChange: () => void): () => void {
  const channel = subscribeUserRequirements(userId, channelName, onChange);
  return () => {
    void removeSupportChannel(channel);
  };
}

export function subscribeUserSupportMessages(
  userId: string,
  onReceive: (message: SupportMessage) => void,
  onOwnInsert: (message: SupportMessage) => void,
  onOwnUpdate: (message: SupportMessage) => void
): () => void {
  const receiverChannel = subscribeReceiverMessages(userId, (payload) => onReceive(payload.new as SupportMessage));
  const senderChannel = subscribeSenderMessages(
    userId,
    (payload) => onOwnInsert(payload.new as SupportMessage),
    (payload) => onOwnUpdate(payload.new as SupportMessage)
  );

  return () => {
    void removeSupportChannel(receiverChannel);
    void removeSupportChannel(senderChannel);
  };
}

export function createTypingControlChannel(channelName: string): RealtimeChannel {
  return createSupportControlChannel(channelName);
}

/**
 * Cierra un canal de control.
 *
 * Los componentes llamaban a `channel.unsubscribe()`, que corta la suscripcion
 * pero deja el canal registrado en el cliente de Supabase. Con navegacion
 * repetida entre conversaciones se acumulaban canales muertos. `removeChannel`
 * es lo que usa el resto del repositorio.
 */
export function closeTypingControlChannel(channel: RealtimeChannel): void {
  void removeSupportChannel(channel);
}

export async function rateSupportRequirement(requirementId: string, rating: 'up' | 'down'): Promise<void> {
  await updateRequirementFeedback(requirementId, { rating });
}

export async function submitSupportClaim(requirementId: string, claimReason: string): Promise<void> {
  await updateRequirementFeedback(requirementId, {
    rating: 'down',
    status: 'claim',
    claim_reason: claimReason.trim(),
  });
}

export async function bumpSupportRequirement(requirement: Requirement): Promise<void> {
  await updateRequirementFeedback(requirement.id, {
    bump_count: (requirement.bump_count || 0) + 1,
    last_bumped_at: new Date().toISOString(),
  });
}

export async function markSupportMessageAsRead(messageId: string): Promise<void> {
  await markMessageReadById(messageId);
}
