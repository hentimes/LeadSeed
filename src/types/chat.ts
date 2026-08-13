import type { Profile } from './saas';
import type { ChatAttachment } from '../repositories/chatAttachmentsRepository';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string | null;
  rules?: string | null;
  frozen_until?: string | null;
  frozen_by?: string | null;
  created_by?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  reply_to_id?: string;
  is_announcement?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;

  // Joins
  user_profile?: Profile;
  reply_to_message?: ChatMessage;
  attachments?: ChatAttachment[];
}

export interface ChatPinnedMessage {
  message_id: string;
  room_id: string;
  pinned_by: string;
  pinned_until: string;
  created_at: string;
  message?: ChatMessage;
}

/**
 * Usuario conectado, tal como lo publica el canal de presencia.
 *
 * Vivia dentro de `usePresence.tsx`. Es una entidad, no el estado interno de
 * un hook: describe a una persona conectada y sobrevive intacta a un port a
 * movil, donde el hook que la produce si se reescribe.
 */
export interface OnlineUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  online_at: string;
}

/**
 * Conversacion directa abierta en la barra superior del chat.
 *
 * Vivia dentro de `useDirectMessageSessions.ts` y la consumian tres
 * componentes, que importaban un tipo de dominio desde un hook.
 *
 * `minimized` es estado de presentacion y no encaja del todo aqui, pero
 * separarlo obligaria a mantener dos objetos en paralelo por un campo. Se deja
 * anotado en vez de partirlo.
 */
export interface DmSession {
  userId: string;
  label: string;
  avatarUrl?: string;
  minimized: boolean;
  unreadCount: number;
}
