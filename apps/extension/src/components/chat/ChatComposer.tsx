import type { Dispatch, FormEvent, ReactNode, RefObject, SetStateAction } from 'react';
import { Icon } from '../../utils/icons';
import { ChatIcon } from './ChatIcons';
import EmojiPicker from './EmojiPicker';
import MentionAutocomplete from './MentionAutocomplete';
import { toPlainText } from '../../utils/mentionParser';
import { MAX_CHAT_MESSAGE_DISPLAY_LENGTH as MAX_LENGTH } from '../../services/chatService';
import type { ChatMessage } from '../../types';
import type { PendingAttachment } from '../../hooks/usePendingAttachment';
import type { useMessageGuard } from '../../hooks/useMessageGuard';
import type { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete';

/**
 * Barra de redaccion de la sala: texto, adjunto, emojis, respuesta citada y los
 * avisos de los comandos de staff.
 *
 * Las quince props son un sintoma real de acoplamiento, no un descuido del
 * corte: el composer depende del estado de la sala, del guard anti-spam, del
 * autocompletado de menciones y de cuatro banderas de comandos de staff.
 * Reducirlas exige repensar esas dependencias, que es trabajo aparte.
 *
 * Del rediseno del 2026-08-25 salen tres cambios que no son cosmeticos:
 *
 * 1. El contador de caracteres solo aparece cerca del limite. Antes mostraba
 *    "0 / 500" siempre: una fila entera de un panel de 320px gastada en un dato
 *    que no le importa a nadie hasta el final.
 * 2. El anillo de foco pasa de `ring-primary-soft` -un morado casi blanco sobre
 *    un borde casi blanco, o sea invisible- al token `--ls-focus-ring`.
 * 3. Los cuatro avisos de comando ocupaban dos lineas cada uno; ahora son una.
 */

/** Desde cuantos caracteres restantes aparece el contador. */
const AVISO_DE_LIMITE = 50;

/**
 * Un mensaje del chat es UNA linea logica.
 *
 * El salto de linea queda reservado para cuando el texto no entra y el
 * navegador lo parte solo. Antes, Shift+Enter metia un salto real en el
 * contenido: una persona escribia un mensaje de seis renglones y ocupaba media
 * pantalla de un panel de 320px, con el agravante de que el resto de la sala lo
 * ve igual de alto.
 *
 * Se normaliza en la entrada y no al enviar para que lo que se ve escrito sea
 * exactamente lo que se va a mandar. Cubre las tres vias: teclear, pegar y el
 * selector de emoticones.
 */
function enUnaLinea(texto: string): string {
  return texto.replace(/\s*\r?\n\s*/g, ' ');
}

export interface ChatComposerProps {
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  handleSend: (e: FormEvent) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;

  attachment: PendingAttachment;
  fileInputRef: RefObject<HTMLInputElement>;
  uploadingAttachment: boolean;

  showEmojis: boolean;
  setShowEmojis: Dispatch<SetStateAction<boolean>>;

  replyTo: ChatMessage | null;
  setReplyTo: (message: ChatMessage | null) => void;

  sendError: string;
  cleanupResult: string;

  guard: ReturnType<typeof useMessageGuard>;
  mentions: ReturnType<typeof useMentionAutocomplete>;

  /** El staff ve avisos y comandos que el resto no. */
  isStaff: boolean;
  isAnnouncementDraft: boolean;
  isFreezeDraft: boolean;
  isCleanCommand: boolean;
  isPurgeCommand: boolean;
}

/** Aviso de una linea sobre lo que va a hacer Enviar con un comando. */
function AvisoDeComando({
  tone,
  icon,
  children,
}: {
  tone: 'accent' | 'danger';
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <p
      className={`mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-micro font-semibold ${
        tone === 'danger' ? 'bg-state-danger-soft text-state-danger' : 'bg-accent-soft text-accent'
      }`}
    >
      <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      {children}
    </p>
  );
}

export default function ChatComposer({
  inputText,
  setInputText,
  handleSend,
  textareaRef,
  attachment,
  fileInputRef,
  uploadingAttachment,
  showEmojis,
  setShowEmojis,
  replyTo,
  setReplyTo,
  sendError,
  cleanupResult,
  guard,
  mentions,
  isStaff,
  isAnnouncementDraft,
  isFreezeDraft,
  isCleanCommand,
  isPurgeCommand,
}: ChatComposerProps) {
  const restantes = MAX_LENGTH - inputText.length;
  const muestraContador = restantes <= AVISO_DE_LIMITE;
  const puedeEnviar =
    (!!inputText.trim() || !!attachment.file) && restantes >= 0 && !uploadingAttachment;

  return (
    <div className="z-10 flex flex-col border-t border-line bg-surface p-3">
      {cleanupResult && (
        <p className="mb-2 rounded-md bg-state-success-soft px-2 py-1 text-micro font-semibold text-state-success">
          {cleanupResult}
        </p>
      )}

      {isFreezeDraft && (
        <AvisoDeComando tone="accent" icon={<ChatIcon.Lock />}>
          Al enviar, elegís por cuánto tiempo pausar la sala.
        </AvisoDeComando>
      )}

      {isCleanCommand && (
        <AvisoDeComando tone="danger" icon={<ChatIcon.Trash />}>
          Al enviar, te pedimos confirmación. Se conservan fijados y guardados.
        </AvisoDeComando>
      )}

      {isPurgeCommand && (
        <AvisoDeComando tone="danger" icon={<ChatIcon.Trash />}>
          Al enviar, te pedimos confirmación. Se borra todo, sin excepciones.
        </AvisoDeComando>
      )}

      {isAnnouncementDraft && (
        <AvisoDeComando tone="accent" icon={<ChatIcon.Megaphone />}>
          Se envía como anuncio a toda la sala.
        </AvisoDeComando>
      )}

      {(guard.blockedReason || sendError) && (
        <p
          role="alert"
          className="mb-2 rounded-md bg-state-danger-soft px-2 py-1 text-meta font-medium text-state-danger"
        >
          {guard.blockedReason || sendError}
        </p>
      )}

      {replyTo && (
        /*
          El mismo lenguaje que la cita dentro de la burbuja: filete y una sola
          linea. Era un bloque de dos renglones con fondo hundido y
          "RESPONDIENDO A" en mayusculas y negrita, que gritaba mas que el
          mensaje que se estaba por escribir.
 
          "Respondiendo a" en minusculas y en tono secundario: es una etiqueta
          de estado, no un titulo.
        */
        <div className="mb-1.5 flex items-center gap-1.5 border-l-2 border-primary/60 pl-2">
          <span className="min-w-0 flex-1 truncate text-micro text-ink-muted">
            <span className="text-ink-secondary">Respondiendo a </span>
            <span className="font-semibold text-ink-secondary">
              {replyTo.user_profile?.full_name || 'Usuario'}
            </span>
            <span aria-hidden="true" className="opacity-50"> · </span>
            {toPlainText(replyTo.content)}
          </span>

          <button
            type="button"
            onClick={() => setReplyTo(null)}
            title="Cancelar respuesta"
            aria-label="Cancelar respuesta"
            className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <Icon.Close />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="relative">
        {showEmojis && (
          <EmojiPicker
            onClose={() => setShowEmojis(false)}
            onSelect={(emoji) => {
              setInputText((prev) => `${prev}${emoji}`);
              setShowEmojis(false);
              requestAnimationFrame(() => textareaRef.current?.focus());
            }}
          />
        )}

        {mentions.isOpen && (
          <MentionAutocomplete
            suggestions={mentions.suggestions}
            highlighted={mentions.highlighted}
            onHighlight={mentions.setHighlighted}
            onSelect={mentions.select}
          />
        )}

        {attachment.file && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-line bg-surface-sunken px-2 py-1.5">
            {attachment.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-ink-muted">
                <ChatIcon.Document />
              </span>
            )}

            <span className="min-w-0 flex-1 truncate text-meta text-ink">
              {attachment.file.name}
            </span>

            <button
              type="button"
              onClick={attachment.clear}
              title="Quitar adjunto"
              aria-label="Quitar adjunto"
              className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Icon.Close />
            </button>
          </div>
        )}

        <div className="flex items-end gap-0.5 rounded-xl border border-line bg-surface px-1.5 py-1 shadow-sm transition-colors focus-within:border-focus">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            className="hidden"
            onChange={(e) => {
              attachment.select(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar archivo (máx. 3 MB)"
            aria-label="Adjuntar archivo"
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <ChatIcon.Paperclip className="h-[18px] w-[18px]" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => {
              const limpio = enUnaLinea(e.target.value);
              setInputText(limpio);
              guard.clearBlock();
              mentions.syncFromInput(limpio, e.target.selectionStart ?? limpio.length);
            }}
            onClick={(e) => {
              const target = e.currentTarget;
              mentions.syncFromInput(target.value, target.selectionStart ?? target.value.length);
            }}
            onBlur={() => setTimeout(mentions.close, 150)}
            placeholder="Escribí tu mensaje…"
            aria-label="Mensaje"
            title={
              isStaff
                ? 'Usá @ para mencionar; escribí @todos al inicio para anunciar'
                : 'Usá @ para mencionar'
            }
            className="max-h-28 min-h-[36px] flex-1 resize-none border-none bg-transparent p-1.5 text-body leading-relaxed text-ink placeholder:text-ink-muted focus:outline-none focus:ring-0"
            rows={1}
            maxLength={MAX_LENGTH}
            onKeyDown={(e) => {
              if (mentions.handleKeyDown(e)) return;

              // Enter envia SIEMPRE, con o sin Shift. Shift+Enter ya no abre un
              // renglon nuevo: el mensaje es de una sola linea.
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!e.shiftKey) handleSend(e);
              }
            }}
          />

          {isAnnouncementDraft && (
            <span
              className="mb-0.5 flex h-8 w-8 shrink-0 animate-fade-in items-center justify-center rounded-full text-accent"
              title="Este mensaje se enviará como anuncio a toda la sala"
            >
              <ChatIcon.Megaphone className="h-[18px] w-[18px]" />
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowEmojis((prev) => !prev)}
            title="Emoticones"
            aria-label="Emoticones"
            aria-expanded={showEmojis}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <ChatIcon.Smiley className="h-[18px] w-[18px]" />
          </button>

          <button
            type="submit"
            disabled={!puedeEnviar}
            title="Enviar mensaje"
            aria-label="Enviar mensaje"
            className="mb-0.5 ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-ink-inverse transition-colors hover:bg-primary-hover active:scale-95 disabled:bg-line disabled:text-ink-muted"
          >
            <ChatIcon.Send className="h-[15px] w-[15px]" />
          </button>
        </div>

        {muestraContador && (
          <p
            className={`mt-1 pr-1 text-right text-micro font-medium ${
              restantes < 0 ? 'text-state-danger' : 'text-ink-muted'
            }`}
          >
            {restantes < 0 ? `${-restantes} de más` : `Quedan ${restantes}`}
          </p>
        )}
      </form>
    </div>
  );
}
