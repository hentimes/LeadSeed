import { compressImageToWebp } from '../utils/imageCompression';
import {
  attachmentPublicUrl,
  insertChatAttachment,
  uploadChatAttachment,
  type ChatAttachment,
} from '../repositories/chatAttachmentsRepository';

export const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB, mismo limite que el bucket

export function validateAttachmentSize(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return 'El archivo supera el máximo de 3 MB.';
  }
  return null;
}

function fileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : 'bin';
}

/**
 * Sube el archivo y crea la fila que lo asocia al mensaje. El mensaje ya
 * tiene que existir (se crea antes, con el texto/caption) porque la policy
 * de insert de chat_message_attachments exige que el mensaje sea del mismo
 * usuario que sube.
 */
export async function attachFileToMessage(
  messageId: string,
  roomId: string,
  uploaderId: string,
  file: File
): Promise<ChatAttachment> {
  const isImage = file.type.startsWith('image/');

  if (isImage) {
    const { blob, width, height } = await compressImageToWebp(file);
    const path = await uploadChatAttachment(uploaderId, blob, 'webp');

    return insertChatAttachment({
      message_id: messageId,
      room_id: roomId,
      uploader_id: uploaderId,
      kind: 'image',
      storage_path: path,
      file_name: file.name,
      mime_type: 'image/webp',
      size_bytes: blob.size,
      width,
      height,
    });
  }

  const path = await uploadChatAttachment(uploaderId, file, fileExtension(file.name));

  return insertChatAttachment({
    message_id: messageId,
    room_id: roomId,
    uploader_id: uploaderId,
    kind: 'file',
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    width: null,
    height: null,
  });
}

export { attachmentPublicUrl };
export type { ChatAttachment };
