import { useEffect, useRef, useState } from 'react';
import { useDirectMessages } from '../../hooks/useDirectMessages';
import { useMessageGuard } from '../../hooks/useMessageGuard';
import { MAX_CHAT_MESSAGE_DISPLAY_LENGTH as MAX_LENGTH } from '../../services/chatService';
import { Icon } from '../../utils/icons';
import EmojiPicker from './EmojiPicker';
import FloatingWindow from './FloatingWindow';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatearHora } from '../../utils/date';

interface DirectMessageWindowProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onMinimize?: () => void;
  cascadeIndex?: number;
}

export default function DirectMessageWindow({
  userId,
  userName,
  onClose,
  onMinimize,
  cascadeIndex,
}: DirectMessageWindowProps) {
  const { messages, loading, send, currentUserId } = useDirectMessages(userId);
  const guard = useMessageGuard();
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    const content = text.trim();
    if (!content || !guard.verify(content)) return;

    try {
      await send(content);
      guard.confirmSent(content);
      setText('');
      setSendError('');
    } catch (error) {
      console.error('Error enviando mensaje directo', error);
      // El bloqueo entre usuarios lo impone un trigger de Postgres con
      // RAISE EXCEPTION (ver 079_chat_blocks_mutes.sql), y ese error llega como
      // PostgrestError, que es un objeto plano y NO una instancia de Error. El
      // `instanceof Error` que habia aqui daba false siempre, asi que el aviso
      // de "no podes enviarle mensajes a este usuario" nunca se mostraba: el
      // usuario veia el generico y no entendia por que no llegaba su mensaje.
      const detalle = getErrorMessage(error, '');
      setSendError(
        detalle.includes('podés enviarle') ? detalle : 'No se pudo enviar el mensaje.'
      );
    }
  };

  return (
    <FloatingWindow title={userName} onClose={onClose} onMinimize={onMinimize} cascadeIndex={cascadeIndex}>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-surface-muted dark:bg-gray-950">
        {loading && <p className="text-center text-xs text-ink-muted">Cargando conversación...</p>}

        {!loading && messages.length === 0 && (
          <p className="text-center text-xs text-ink-muted mt-6">
            Todavía no hay mensajes con {userName}.
          </p>
        )}

        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;

          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`min-w-0 max-w-[85%] px-3 py-2 text-[13px] break-words break-all shadow-sm ${
                  isOwn
                    ? 'bg-primary text-white rounded-2xl rounded-tr-sm'
                    : 'bg-surface text-ink dark:text-gray-100 border border-line dark:border-gray-700 rounded-2xl rounded-tl-sm'
                }`}
              >
                {message.message}
                <span
                  className={`block mt-0.5 text-[10px] ${isOwn ? 'text-white/70' : 'text-ink-muted'}`}
                >
                  {formatearHora(message.created_at)}
                </span>
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="relative p-2 border-t border-line dark:border-gray-700 bg-surface"
      >
        {(guard.blockedReason || sendError) && (
          <p className="mb-1.5 px-1 text-[11px] font-medium text-state-danger">
            {guard.blockedReason || sendError}
          </p>
        )}

        {showEmojis && (
          <EmojiPicker
            onClose={() => setShowEmojis(false)}
            onSelect={(emoji) => {
              setText((prev) => `${prev}${emoji}`);
              setShowEmojis(false);
              inputRef.current?.focus();
            }}
          />
        )}

        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              guard.clearBlock();
              setSendError('');
            }}
            maxLength={MAX_LENGTH}
            placeholder="Escribí un mensaje..."
            className="flex-1 min-w-0 rounded-full border border-line dark:border-gray-700 bg-surface px-3 py-1.5 text-[13px] text-ink dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-soft"
          />

          <button
            type="button"
            onClick={() => setShowEmojis((prev) => !prev)}
            className="p-1.5 rounded-full text-ink-muted hover:bg-surface-muted dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            title="Emoticones"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          <button
            type="submit"
            disabled={!text.trim()}
            className="w-8 h-8 rounded-full bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-ink-muted text-white flex items-center justify-center flex-shrink-0 transition-colors"
            title="Enviar"
          >
            <span className="[&_svg]:!h-4 [&_svg]:!w-4">
              <Icon.Send />
            </span>
          </button>
        </div>
      </form>
    </FloatingWindow>
  );
}
