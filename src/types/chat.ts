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
