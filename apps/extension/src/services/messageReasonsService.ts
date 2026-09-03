import {
  createMessageReason,
  deleteMessageReasonRow,
  fetchMessageReasonRows,
  updateMessageReason,
} from '../repositories/messageReasonsRepository';

/**
 * Un motivo del catalogo: la frase que sustituye a `{motivo}` en una plantilla.
 *
 * No confundir con `leads.discard_reason`, que tambien se llama "motivo" en
 * pantalla pero responde a otra pregunta: por que se descarto un lead.
 */
export interface MessageReason {
  id?: number;
  text: string;
  createdAt: string;
}

/** Tope de longitud. Un motivo es una frase, no un parrafo: entra en un desplegable. */
export const MAX_REASON_LENGTH = 140;

export async function fetchMessageReasons(userId: string): Promise<MessageReason[]> {
  const rows = await fetchMessageReasonRows(userId);
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
  }));
}

/**
 * Devuelve el motivo limpio y valido, o `null` si no lo es.
 *
 * Se separa del guardado para poder probarla y para que la interfaz pueda
 * deshabilitar el boton sin duplicar la regla.
 */
export function normalizeReasonText(text: string): string | null {
  const limpio = text.trim().replace(/\s+/g, ' ');
  if (limpio.length === 0) return null;
  if (limpio.length > MAX_REASON_LENGTH) return null;
  return limpio;
}

/** Compara ignorando mayusculas y espacios, para no acabar con dos motivos iguales. */
export function isDuplicateReason(
  text: string,
  existentes: MessageReason[],
  ignorarId?: number
): boolean {
  const objetivo = text.trim().toLocaleLowerCase('es');
  return existentes.some(
    (reason) => reason.id !== ignorarId && reason.text.trim().toLocaleLowerCase('es') === objetivo
  );
}

export async function saveMessageReason(userId: string, reason: MessageReason): Promise<number> {
  const text = normalizeReasonText(reason.text);
  if (text === null) {
    throw new Error(`El motivo no puede estar vacio ni pasar de ${MAX_REASON_LENGTH} caracteres`);
  }

  if (reason.id) {
    await updateMessageReason(reason.id, { text, updated_at: new Date().toISOString() });
    return reason.id;
  }

  return createMessageReason({ user_id: userId, text });
}

export async function deleteMessageReason(id: number): Promise<void> {
  await deleteMessageReasonRow(id);
}
