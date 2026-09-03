import { useCallback, useMemo, useState } from 'react';
import {
  detectMentionQuery,
  insertCommand,
  insertMention,
  serializeFromDisplay,
  type MentionQuery,
} from '../utils/mentionParser';
import { useOnlineDirectory, displayName, avatarFor } from './useOnlineDirectory';
import type { Mention, MentionSuggestion } from '../types/mentions';

const MAX_SUGGESTIONS = 6;

interface UseMentionAutocompleteOptions {
  text: string;
  onTextChange: (text: string, cursor: number) => void;
  /** Usuarios extra a excluir de las sugerencias (normalmente uno mismo). */
  excludeUserId?: string;
  /** Sugerencias adicionales (ej. publicaciones del foro) ya filtradas. */
  extraSuggestions?: MentionSuggestion[];
  /**
   * Comandos de moderacion, para quien pueda usarlos. Se filtran por lo que se
   * lleve escrito y solo aparecen si el `@` abre el mensaje, que es la unica
   * posicion donde el chat los interpreta.
   */
  commands?: MentionSuggestion[];
}

export function useMentionAutocomplete({
  text,
  onTextChange,
  excludeUserId,
  extraSuggestions = [],
  commands = [],
}: UseMentionAutocompleteOptions) {
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  // Menciones elegidas en el borrador actual. El composer muestra "@Nombre";
  // esta lista es la que permite recuperar el identificador al enviar.
  const [resolved, setResolved] = useState<Mention[]>([]);

  const { users } = useOnlineDirectory(query?.term ?? '');

  const suggestions = useMemo<MentionSuggestion[]>(() => {
    if (!query) return [];

    const commandSuggestions =
      query.start === 0
        ? commands.filter((command) =>
            command.label.toLowerCase().startsWith(query.term.toLowerCase()),
          )
        : [];

    const userSuggestions: MentionSuggestion[] = users
      .filter((user) => user.id !== excludeUserId)
      .map((user) => ({
        kind: 'user',
        id: user.id,
        label: displayName(user),
        hint: 'En línea',
        avatarUrl: avatarFor(user),
      }));

    // Los comandos van delante: cuando alguien de staff abre el mensaje con
    // una arroba, casi siempre es para moderar, no para mencionarse a nadie.
    return [...commandSuggestions, ...userSuggestions, ...extraSuggestions].slice(
      0,
      MAX_SUGGESTIONS,
    );
  }, [query, users, excludeUserId, extraSuggestions, commands]);

  const isOpen = query !== null && suggestions.length > 0;

  const syncFromInput = useCallback((value: string, cursor: number) => {
    const next = detectMentionQuery(value, cursor);
    setQuery(next);
    setHighlighted(0);
  }, []);

  const close = useCallback(() => setQuery(null), []);

  const select = useCallback(
    (suggestion: MentionSuggestion) => {
      if (!query) return;

      // Un comando es texto y nada mas: no se guarda como mencion resuelta
      // porque no hay identificador que recuperar al enviar.
      if (suggestion.kind === 'command') {
        const resultado = insertCommand(text, query, suggestion.label);
        onTextChange(resultado.text, resultado.cursor);
        setQuery(null);
        return;
      }

      const mention: Mention = {
        kind: suggestion.kind,
        id: suggestion.id,
        label: suggestion.label,
      };
      const result = insertMention(text, query, mention);

      setResolved((prev) =>
        prev.some((item) => item.kind === mention.kind && item.id === mention.id)
          ? prev
          : [...prev, mention]
      );
      onTextChange(result.text, result.cursor);
      setQuery(null);
    },
    [query, text, onTextChange]
  );

  /** Texto listo para guardar, con los identificadores de las menciones. */
  const serialize = useCallback(
    (value: string) => serializeFromDisplay(value, resolved),
    [resolved]
  );

  const reset = useCallback(() => {
    setResolved([]);
    setQuery(null);
  }, []);

  /** Devuelve true si el autocompletado consumio la tecla. */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): boolean => {
      if (!isOpen) return false;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlighted((prev) => (prev + 1) % suggestions.length);
        return true;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlighted((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return true;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        const elegida = suggestions[highlighted];
        if (!elegida) return false;
        event.preventDefault();
        select(elegida);
        return true;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return true;
      }

      return false;
    },
    [isOpen, suggestions, highlighted, select, close]
  );

  return {
    isOpen,
    suggestions,
    highlighted,
    term: query?.term ?? '',
    setHighlighted,
    syncFromInput,
    handleKeyDown,
    select,
    close,
    serialize,
    reset,
    addResolved: (mention: Mention) =>
      setResolved((prev) =>
        prev.some((item) => item.kind === mention.kind && item.id === mention.id)
          ? prev
          : [...prev, mention]
      ),
  };
}
