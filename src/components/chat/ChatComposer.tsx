import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import { Icon } from '../../utils/icons';
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
 * Extraido de `ChatRoom.tsx` como parte del bloque 6. Es una extraccion
 * presentacional pura: no se movio nada de logica ni de estado, solo el JSX y
 * las referencias que ya usaba. Por eso el typecheck alcanza como verificacion
 * de que no falte ninguna: si se hubiera olvidado una prop, no compila.
 *
 * Lo que el typecheck NO puede verificar es que el resultado se siga viendo
 * igual, asi que esta extraccion se acompaña de una revision visual.
 *
 * Las quince props son un sintoma real de acoplamiento, no un descuido del
 * corte: el composer depende del estado de la sala, del guard anti-spam, del
 * autocompletado de menciones y de cuatro banderas de comandos de staff.
 * Reducirlas exige repensar esas dependencias, que es trabajo aparte.
 */
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

  /** Banderas de los comandos de staff, que cambian el aviso bajo el campo. */
  /** El staff ve avisos y comandos que el resto no. */
  isStaff: boolean;
  isAnnouncementDraft: boolean;
  isFreezeDraft: boolean;
  isCleanCommand: boolean;
  isPurgeCommand: boolean;
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
  return (
  <div className="p-4 bg-white dark:bg-gray-900 border-t border-line dark:border-gray-800 z-10 flex flex-col">
    {cleanupResult && (
      <p className="mb-2 rounded-lg bg-state-success-soft px-3 py-1.5 text-xs font-medium text-state-success">
        {cleanupResult}
      </p>
    )}

    {isFreezeDraft && (
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Enviar va a abrir el selector de duración para pausar el chat.
      </p>
    )}

    {isCleanCommand && (
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-state-danger">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Enviar va a pedir confirmación para limpiar el chat (menos fijados, destacados y guardados).
      </p>
    )}

    {isPurgeCommand && (
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-state-danger">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Enviar va a pedir confirmación para purgar TODO el historial, sin excepciones.
      </p>
    )}

    {isAnnouncementDraft && (
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11 4a1 1 0 012 0v1.08A7.002 7.002 0 0119 12v3.586l1.707 1.707A1 1 0 0120 19H4a1 1 0 01-.707-1.707L5 15.586V12a7.002 7.002 0 016-6.92V4zM9 21a3 3 0 006 0H9z" />
        </svg>
        Este mensaje se va a enviar como anuncio a todos los usuarios.
      </p>
    )}

    {(guard.blockedReason || sendError) && (
      <p className="mb-2 rounded-lg bg-state-danger-soft px-3 py-1.5 text-xs font-medium text-state-danger">
        {guard.blockedReason || sendError}
      </p>
    )}

    {replyTo && (
      <div className="mb-3 pl-3 border-l-2 border-primary flex justify-between items-center bg-surface-muted dark:bg-gray-800 py-1.5 pr-2 rounded-r-md text-sm shadow-sm transition-all">
        <div className="flex flex-col overflow-hidden">
          <span className="font-semibold text-primary text-[10px] uppercase tracking-wider">Respondiendo a {replyTo.user_profile?.full_name}</span>
          <span className="text-ink dark:text-gray-300 truncate text-xs mt-0.5">
            {toPlainText(replyTo.content)}
          </span>
        </div>
        <button onClick={() => setReplyTo(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
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
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-xl bg-surface-muted dark:bg-gray-800 border border-line dark:border-gray-700">
          {attachment.previewUrl ? (
            <img src={attachment.previewUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-gray-900 text-ink-muted flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          )}
          <span className="flex-1 min-w-0 text-xs text-ink dark:text-gray-100 truncate">
            {attachment.file.name}
          </span>
          <button
            type="button"
            onClick={attachment.clear}
            className="p-1 rounded-full text-ink-muted hover:bg-white dark:hover:bg-gray-700 hover:text-ink transition-colors flex-shrink-0"
            title="Quitar adjunto"
          >
            <Icon.Close />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1 border border-line dark:border-gray-700 bg-white dark:bg-gray-800 rounded-[20px] px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary-soft transition-all shadow-sm">

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
          className="p-2 mb-0.5 text-ink-muted hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
          title="Adjuntar archivo (máx. 3 MB)"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>

        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            guard.clearBlock();
            mentions.syncFromInput(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onClick={(e) => {
            const target = e.currentTarget;
            mentions.syncFromInput(target.value, target.selectionStart ?? target.value.length);
          }}
          onBlur={() => setTimeout(mentions.close, 150)}
          placeholder={
            isStaff
              ? 'Escribe tu mensaje... usa @ para mencionar o "@todos" al inicio para anunciar'
              : 'Escribe tu mensaje... usa @ para mencionar'
          }
          className="flex-1 resize-none bg-transparent border-none p-2 text-[14px] text-ink dark:text-gray-100 focus:ring-0 focus:outline-none max-h-32 min-h-[40px] leading-relaxed placeholder:text-slate-400"
          rows={1}
          maxLength={MAX_LENGTH}
          onKeyDown={(e) => {
            if (mentions.handleKeyDown(e)) return;

            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />

        {isAnnouncementDraft && (
          <span
            className="p-2 mb-0.5 rounded-full text-amber-600 dark:text-amber-400 flex-shrink-0 animate-fade-in"
            title="Este mensaje se enviará como anuncio a todos"
          >
            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 4a1 1 0 012 0v1.08A7.002 7.002 0 0119 12v3.586l1.707 1.707A1 1 0 0120 19H4a1 1 0 01-.707-1.707L5 15.586V12a7.002 7.002 0 016-6.92V4zM9 21a3 3 0 006 0H9z" />
            </svg>
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowEmojis((prev) => !prev)}
          className="p-2 mb-0.5 text-ink-muted hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
          title="Emoticones"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>

        <button
          type="submit"
          disabled={(!inputText.trim() && !attachment.file) || inputText.length > MAX_LENGTH || uploadingAttachment}
          className="w-10 h-10 mb-0.5 ml-1 bg-primary hover:bg-primary-hover disabled:bg-line disabled:text-slate-400 text-white rounded-[14px] flex items-center justify-center flex-shrink-0 transition-all transform active:scale-95"
        >
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      
      <div className="flex justify-end items-center mt-2 px-2">
        <div className="flex gap-3">
          <span
            className={`text-[10px] font-medium ${
              inputText.length >= MAX_LENGTH - 20 ? 'text-state-danger' : 'text-ink-muted'
            }`}
          >
            {inputText.length} / {MAX_LENGTH}
          </span>
        </div>
      </div>
    </form>
  </div>
  );
}
