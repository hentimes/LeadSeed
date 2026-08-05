import { useEffect, useState } from 'react';
import { toPlainText } from '../../utils/mentionParser';
import type { ChatHighlightedMessage } from '../../services/chatModerationService';

interface HighlightedMessagesCarouselProps {
  highlights: ChatHighlightedMessage[];
  onRemove: (messageId: string, highlightedBy: string) => void;
}

/**
 * Un destacado a la vez, con flecha para pasar al siguiente -- mismo patron
 * que el banner de fijados arriba del chat, pero vive dentro del panel de
 * info de la sala en vez de apilar todos los destacados en una lista.
 */
export default function HighlightedMessagesCarousel({
  highlights,
  onRemove,
}: HighlightedMessagesCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= highlights.length) setIndex(0);
  }, [highlights.length, index]);

  if (highlights.length === 0) {
    return <p className="text-sm text-ink-muted">Nadie destacó ningún mensaje todavía.</p>;
  }

  const current = highlights[index] ?? highlights[0];
  const hasMultiple = highlights.length > 1;

  return (
    <div className="rounded-xl bg-surface-muted dark:bg-gray-800 p-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-ink dark:text-gray-200 truncate">
              {current.message?.user_profile?.full_name || 'Usuario'}
            </span>
            {hasMultiple && (
              <span className="text-[10px] text-ink-muted flex-shrink-0">
                {index + 1}/{highlights.length}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted truncate">
            {current.message ? toPlainText(current.message.content) : ''}
          </p>
          <span className="text-[10px] text-ink-muted">
            destacado por {current.highlighter?.full_name || 'alguien'}
          </span>
        </div>

        {hasMultiple && (
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev + 1) % highlights.length)}
            className="p-1 rounded-full text-ink-muted hover:bg-white dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            title="Ver siguiente destacado"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onRemove(current.message_id, current.highlighted_by)}
        className="mt-1.5 text-[10px] font-semibold text-ink-muted hover:text-state-danger"
      >
        Quitar destacado
      </button>
    </div>
  );
}
