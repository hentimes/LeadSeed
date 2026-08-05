import { toPlainText } from '../../utils/mentionParser';
import type { ChatMessage } from '../../types';

interface SavedMessagesPanelProps {
  messages: ChatMessage[];
  onUnsave: (message: ChatMessage) => void;
}

export default function SavedMessagesPanel({ messages, onUnsave }: SavedMessagesPanelProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface-muted dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-muted mt-8">
            No guardaste ningún mensaje todavía. Tocá el ícono de marcador en un mensaje para guardarlo.
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-xl bg-white dark:bg-gray-800 border border-line dark:border-gray-700 p-3"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-ink dark:text-gray-200 truncate">
                {message.user_profile?.full_name || 'Usuario'}
              </span>
              <button
                type="button"
                onClick={() => onUnsave(message)}
                className="text-[11px] font-semibold text-ink-muted hover:text-state-danger transition-colors flex-shrink-0"
              >
                Quitar
              </button>
            </div>
            <p className="text-sm text-ink dark:text-gray-100 break-words whitespace-pre-wrap">
              {toPlainText(message.content)}
            </p>
            <span className="block mt-1 text-[10px] text-ink-muted">
              {new Date(message.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
