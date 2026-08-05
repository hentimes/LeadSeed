import { useState } from 'react';
import { attachmentPublicUrl } from '../../services/chatAttachmentsService';
import { formatFileSize } from '../../utils/formatFileSize';
import AttachmentLightbox from './AttachmentLightbox';
import type { ChatAttachment } from '../../services/chatAttachmentsService';

const FileIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
);

interface MessageAttachmentProps {
  attachment: ChatAttachment;
}

/**
 * Todas las imagenes ocupan el mismo recuadro en el chat (sin recortar, la
 * proporcion original se ve al abrirla). Los documentos se muestran como una
 * tarjeta con nombre, peso y un link de descarga.
 */
export default function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const [expanded, setExpanded] = useState(false);
  const url = attachmentPublicUrl(attachment.storage_path);

  if (attachment.kind === 'image') {
    return (
      <>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="block w-40 h-40 rounded-xl overflow-hidden bg-surface-muted dark:bg-gray-900 border border-line dark:border-gray-700"
          title={attachment.file_name}
        >
          <img src={url} alt={attachment.file_name} className="w-full h-full object-contain" loading="lazy" />
        </button>

        {expanded && (
          <AttachmentLightbox src={url} alt={attachment.file_name} onClose={() => setExpanded(false)} />
        )}
      </>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={attachment.file_name}
      className="flex items-center gap-2.5 w-56 rounded-xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 hover:border-primary/40 transition-colors"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft dark:bg-primary/20 text-primary">
        <FileIcon />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold text-ink dark:text-gray-100 truncate">
          {attachment.file_name}
        </span>
        <span className="block text-[10px] text-ink-muted">{formatFileSize(attachment.size_bytes)}</span>
      </span>
      <span className="text-ink-muted flex-shrink-0">
        <DownloadIcon />
      </span>
    </a>
  );
}
