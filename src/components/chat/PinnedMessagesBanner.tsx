import { useEffect, useState } from 'react';
import { toPlainText } from '../../utils/mentionParser';
import type { ChatPinnedMessage } from '../../types';

interface PinnedMessagesBannerProps {
  pinned: ChatPinnedMessage[];
  canUnpin: boolean;
  onUnpin: (messageId: string) => void;
}

const PinIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16 3a1 1 0 011 1v5.586l3.707 3.707a1 1 0 01-.707 1.707H13v5a1 1 0 01-2 0v-5H4.586a1 1 0 01-.293-1.707L8 9.586V4a1 1 0 011-1z" />
  </svg>
);

/**
 * Header compacto de un solo mensaje fijado a la vez. Con mas de uno, una
 * flecha a la derecha avanza al siguiente en vez de apilarlos todos.
 */
export default function PinnedMessagesBanner({ pinned, canUnpin, onUnpin }: PinnedMessagesBannerProps) {
  const [index, setIndex] = useState(0);

  // Si se fija o vence uno y el indice queda fuera de rango, volver al primero.
  useEffect(() => {
    if (index >= pinned.length) setIndex(0);
  }, [pinned.length, index]);

  if (pinned.length === 0) return null;

  const current = pinned[index] ?? pinned[0];
  if (!current) return null;

  const hasMultiple = pinned.length > 1;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-line dark:border-gray-700 bg-amber-50 dark:bg-amber-500/10">
      <span className="text-amber-600 dark:text-amber-400 flex-shrink-0">
        <PinIcon />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            {current.message?.user_profile?.full_name || 'Usuario'}
          </span>
          {hasMultiple && (
            <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
              {index + 1}/{pinned.length}
            </span>
          )}
        </div>
        <p className="text-xs text-ink dark:text-gray-200 truncate">
          {current.message ? toPlainText(current.message.content) : ''}
        </p>
      </div>

      {canUnpin && (
        <button
          type="button"
          onClick={() => onUnpin(current.message_id)}
          className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0"
        >
          Desfijar
        </button>
      )}

      {hasMultiple && (
        <button
          type="button"
          onClick={() => setIndex((prev) => (prev + 1) % pinned.length)}
          className="p-1 rounded-full text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors flex-shrink-0"
          title="Ver siguiente mensaje fijado"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
