export type MentionKind = 'user' | 'post';

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
  kind: MentionKind;
  id: string;
  label: string;
  /** Linea secundaria: email del usuario o categoria del post. */
  hint?: string;
  avatarUrl?: string;
}
