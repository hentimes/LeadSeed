import { EmptyState } from '../../design';
import { ChatIcon } from './ChatIcons';
import { toPlainText } from '../../utils/mentionParser';
import { formatearFechaHora } from '../../utils/date';
import type { ChatMessage } from '../../types';

interface SavedMessagesPanelProps {
  messages: ChatMessage[];
  onUnsave: (message: ChatMessage) => void;
}

/**
 * Los mensajes que guardaste, en su propia pestana.
 *
 * La fecha usaba `toLocaleString()` sin idioma, que en un equipo configurado en
 * ingles muestra `8/25/2026, 2:32:07 PM` -mes y dia dados vuelta, y con
 * segundos-. Ahora pasa por `formatearFechaHora`, que ya fija `es-CL` para todo
 * el producto.
 */
export default function SavedMessagesPanel({ messages, onUnsave }: SavedMessagesPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-muted">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <EmptyState
            icon={<ChatIcon.Bookmark />}
            title="Todavía no guardaste nada"
            description="Usá el marcador de un mensaje para guardarlo acá."
          />
        ) : (
          messages.map((message) => (
            <div key={message.id} className="rounded-lg border border-line bg-surface p-2.5">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-meta font-semibold text-ink">
                  {message.user_profile?.full_name || 'Usuario'}
                </span>

                <button
                  type="button"
                  onClick={() => onUnsave(message)}
                  className="shrink-0 text-micro font-semibold text-ink-muted transition-colors hover:text-state-danger"
                >
                  Quitar
                </button>
              </div>

              <p className="whitespace-pre-wrap break-words text-body text-ink">
                {toPlainText(message.content)}
              </p>

              <span className="mt-1 block text-micro text-ink-muted">
                {formatearFechaHora(message.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
