import MessageContent from './MessageContent';
import { ChatIcon } from './ChatIcons';
import type { ChatMessage } from '../../types';
import type { Mention } from '../../types/mentions';

/**
 * Anuncio del staff: le llega a todo el mundo, este o no conectado, asi que se
 * pinta a ancho completo y con marco propio en vez de como una burbuja mas.
 *
 * El ambar sale de `--ls-accent`, no del `bg-amber-50 / text-amber-700` crudo
 * de Tailwind que llevaba antes. Ese par daba 2.9:1 en la linea de la firma:
 * por debajo del 4.5:1 que pide WCAG AA, y encima a 11px.
 */
export default function ChatAnnouncementMessage({
  message,
  isSaved,
  onToggleSaved,
  onMentionClick,
}: {
  message: ChatMessage;
  isSaved: boolean;
  onToggleSaved: () => void;
  onMentionClick: (mention: Mention) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-accent-border bg-accent-soft px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-accent">
        <ChatIcon.Megaphone />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-micro font-bold uppercase tracking-wider text-accent">
          Anuncio de {message.user_profile?.full_name || 'Usuario'}
        </p>
        <p className="whitespace-pre-wrap break-words text-body text-ink">
          <MessageContent content={message.content} onMentionClick={onMentionClick} />
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleSaved}
        title={isSaved ? 'Quitar de guardados' : 'Guardar anuncio'}
        aria-label={isSaved ? 'Quitar de guardados' : 'Guardar anuncio'}
        aria-pressed={isSaved}
        className={`shrink-0 rounded-full p-1 transition-colors ${
          isSaved ? 'text-primary' : 'text-accent hover:text-primary'
        }`}
      >
        <ChatIcon.Bookmark filled={isSaved} />
      </button>
    </div>
  );
}
