import type { Profile } from './saas';

export interface ChatRoom {
  id: string;
  name: string;
  created_by?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  reply_to_id?: string;
  created_at: string;

  // Joins
  user_profile?: Profile;
  reply_to_message?: ChatMessage;
}
