import { supabase } from '../lib/supabaseClient';

const BUCKET = 'chat-attachments';

export interface ChatAttachment {
  id: string;
  message_id: string;
  room_id: string;
  uploader_id: string;
  kind: 'image' | 'file';
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export const ATTACHMENT_SELECT =
  'id, message_id, room_id, uploader_id, kind, storage_path, file_name, mime_type, size_bytes, width, height, created_at';

export function attachmentPublicUrl(storagePath: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/** Ruta con el uid del que sube como primer segmento: lo exige la policy de insert. */
export async function uploadChatAttachment(
  uploaderId: string,
  blob: Blob,
  extension: string
): Promise<string> {
  const path = `${uploaderId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function insertChatAttachment(
  attachment: Omit<ChatAttachment, 'id' | 'created_at'>
): Promise<ChatAttachment> {
  const { data, error } = await supabase
    .from('chat_message_attachments')
    .insert(attachment)
    .select(ATTACHMENT_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as ChatAttachment;
}

export async function fetchRoomAttachments(
  roomId: string,
  kind: 'image' | 'file'
): Promise<ChatAttachment[]> {
  const { data, error } = await supabase
    .from('chat_message_attachments')
    .select(ATTACHMENT_SELECT)
    .eq('room_id', roomId)
    .eq('kind', kind)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[chat] fetchRoomAttachments', error);
    return [];
  }
  return data as unknown as ChatAttachment[];
}
