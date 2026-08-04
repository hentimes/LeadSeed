import type { Mention, MentionToken } from '../types/mentions';

/**
 * Las menciones viajan embebidas en el propio texto del mensaje como
 * `@[etiqueta](user:UUID)` o `@[etiqueta](post:UUID)`. Guardarlas asi evita
 * una tabla de menciones y hace que el mismo parser sirva para el chat y para
 * los comentarios del foro.
 */
const MENTION_PATTERN =
  /@\[([^\]\n]{1,80})\]\((user|post):([0-9a-fA-F-]{36})\)/g;

export function parseMentions(content: string): MentionToken[] {
  const tokens: MentionToken[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0;

    if (start > lastIndex) {
      tokens.push({ type: 'text', value: content.slice(lastIndex, start) });
    }

    tokens.push({
      type: 'mention',
      mention: { label: match[1], kind: match[2] as Mention['kind'], id: match[3] },
    });

    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    tokens.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return tokens;
}

export function serializeMention({ kind, id, label }: Mention): string {
  return `@[${label}](${kind}:${id})`;
}

/** Texto plano de un mensaje, con las menciones reducidas a `@etiqueta`. */
export function toPlainText(content: string): string {
  return content.replace(MENTION_PATTERN, (_match, label: string) => `@${label}`);
}

export interface MentionQuery {
  /** Texto escrito despues del `@`, ya sin el `@`. */
  term: string;
  /** Indice del `@` que abrio la busqueda. */
  start: number;
  /** Indice del cursor (fin del termino). */
  end: number;
}

/**
 * Detecta si el cursor esta dentro de un `@algo` en curso. Devuelve null si no
 * hay busqueda activa (sin `@`, con espacio de por medio, o sobre una mencion
 * ya cerrada).
 */
export function detectMentionQuery(text: string, cursor: number): MentionQuery | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf('@');

  if (at === -1) return null;

  const term = before.slice(at + 1);

  // Una mencion en curso no puede contener espacios ni saltos, y tampoco los
  // corchetes que usa el formato serializado (esa mencion ya esta cerrada).
  if (/[\s[\]()]/.test(term)) return null;

  // El `@` debe abrir palabra: o inicia el texto, o viene despues de un espacio.
  const charBefore = at > 0 ? text[at - 1] : ' ';
  if (!/\s/.test(charBefore)) return null;

  return { term, start: at, end: cursor };
}

/**
 * Reemplaza el `@termino` en curso por la etiqueta legible (`@Nombre`).
 *
 * El composer trabaja siempre con texto que el usuario pueda leer; la forma
 * serializada con el UUID se arma recien al enviar, con serializeFromDisplay.
 */
export function insertMention(
  text: string,
  query: MentionQuery,
  mention: Mention
): { text: string; cursor: number } {
  const display = `@${mention.label} `;
  const next = text.slice(0, query.start) + display + text.slice(query.end);

  return { text: next, cursor: query.start + display.length };
}

/**
 * Convierte el texto visible del composer al formato con identificadores.
 * Solo se reemplazan las etiquetas que el usuario eligio del autocompletado:
 * escribir "@juan" a mano queda como texto suelto, no como mencion.
 */
export function serializeFromDisplay(text: string, mentions: Mention[]): string {
  // De mayor a menor longitud para que una etiqueta que sea prefijo de otra
  // ("Ana" dentro de "Ana Perez") no se coma la mencion mas larga.
  const byLength = [...mentions].sort((a, b) => b.label.length - a.label.length);

  return byLength.reduce(
    (result, mention) => result.split(`@${mention.label}`).join(serializeMention(mention)),
    text
  );
}
