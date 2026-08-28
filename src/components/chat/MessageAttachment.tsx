import { useState } from 'react';
import { attachmentPublicUrl } from '../../services/chatAttachmentsService';
import { formatFileSize } from '../../utils/formatFileSize';
import AttachmentLightbox from './AttachmentLightbox';
import { ChatIcon } from './ChatIcons';
import type { ChatAttachment } from '../../services/chatAttachmentsService';

const DownloadIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
);

interface MessageAttachmentProps {
  attachment: ChatAttachment;
  /** Dentro de la burbuja propia el fondo ya es morado: la tarjeta se vuelve
      translucida en vez de blanca, que ahi se veria como un parche. */
  onOwnBubble?: boolean;
}

/**
 * Todas las imagenes ocupan el mismo recuadro en el chat (sin recortar, la
 * proporcion original se ve al abrirla). Los documentos se muestran como una
 * tarjeta con nombre, peso y un link de descarga.
 */
export default function MessageAttachment({ attachment, onOwnBubble = false }: MessageAttachmentProps) {
  const [expanded, setExpanded] = useState(false);
  const url = attachmentPublicUrl(attachment.storage_path);

  if (attachment.kind === 'image') {
    return (
      <>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={attachment.file_name}
          aria-label={`Ampliar imagen ${attachment.file_name}`}
          className={`block h-40 w-40 overflow-hidden rounded-xl border ${
            onOwnBubble
              ? 'border-ink-inverse/25 bg-[var(--ls-bubble-own-line)]'
              : 'border-line bg-surface-sunken'
          }`}
        >
          <img src={url} alt={attachment.file_name} className="h-full w-full object-contain" loading="lazy" />
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
      className={`flex w-56 max-w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
        onOwnBubble
          ? 'border-ink-inverse/25 bg-[var(--ls-bubble-own-line)] text-ink-inverse hover:border-ink-inverse/50'
          : 'border-line bg-surface text-ink hover:border-primary'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          onOwnBubble ? 'bg-[var(--ls-bubble-own-line)] text-ink-inverse' : 'bg-primary-soft text-primary'
        }`}
      >
        <ChatIcon.Document className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-meta font-semibold">{attachment.file_name}</span>
        <span className={`block text-micro ${onOwnBubble ? 'text-ink-inverse/70' : 'text-ink-muted'}`}>
          {formatFileSize(attachment.size_bytes)}
        </span>
      </span>

      <span className={onOwnBubble ? 'text-ink-inverse/70' : 'text-ink-muted'}>
        <DownloadIcon />
      </span>
    </a>
  );
}
