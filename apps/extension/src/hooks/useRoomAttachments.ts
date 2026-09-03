import { useCallback, useEffect, useState } from 'react';
import { fetchRoomAttachments, type ChatAttachment } from '../repositories/chatAttachmentsRepository';

export function useRoomAttachments(roomId?: string) {
  const [images, setImages] = useState<ChatAttachment[]>([]);
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    const [imageRows, fileRows] = await Promise.all([
      fetchRoomAttachments(roomId, 'image'),
      fetchRoomAttachments(roomId, 'file'),
    ]);
    setImages(imageRows);
    setFiles(fileRows);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { images, files, loading, refresh };
}
