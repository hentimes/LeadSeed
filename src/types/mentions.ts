export type MentionKind = 'user' | 'post';

/**
 * El autocompletado ofrece ademas comandos de moderacion. No son menciones:
 * no apuntan a ningun registro y no se serializan con identificador, por eso
 * viven en un tipo aparte y `Mention` no los admite.
 */
export type MentionSuggestionKind = MentionKind | 'command';

export interface Mention {
  kind: MentionKind;
  id: string;
  label: string;
}

export type MentionToken =
  | { type: 'text'; value: string }
  | { type: 'mention'; mention: Mention };

/** Sugerencia mostrada en el autocompletado del composer. */
export interface MentionSuggestion {
  kind: MentionSuggestionKind;
  id: string;
  label: string;
  /** Linea secundaria: email del usuario, categoria del post o que hace el comando. */
  hint?: string;
  avatarUrl?: string;
}
