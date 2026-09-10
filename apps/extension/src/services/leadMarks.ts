import {
  callMarcarLeadNoContactar,
  callMarcarLeadSinWhatsApp,
} from '../repositories/leadMarksRepository';
import type { SendLog } from '../types';

/**
 * LAS DOS MARCAS DE UNA RONDA DE ENVIO, SIN FLUJO DE POR MEDIO.
 *
 * En Flujos, marcar a alguien sale de una inscripcion y de un paso. En Enviar
 * no hay ninguna de las dos cosas: un destinatario es solo un lead. Los hechos
 * que hay que poder anotar, en cambio, son identicos -su numero no esta en
 * WhatsApp, o pidio que no le escriban- porque son hechos sobre la persona.
 *
 * Este modulo es la via que no necesita flujo. Las dos pantallas terminan en la
 * misma funcion de la base, asi que no pueden divergir. Ver migracion 186.
 */

/**
 * El registro de envio que hay que deshacer al marcar "no tiene WhatsApp".
 *
 * ## Por que hay que buscarlo
 *
 * La cola registra el envio al abrir el chat, y devuelve el historial COMPLETO
 * de la plantilla: cientos de filas de todos los destinatarios de todas las
 * rondas. La que acaba de escribir es la mas reciente de este lead.
 *
 * ## Por que se compara por fecha y no se toma la ultima del arreglo
 *
 * Porque el orden en que llega el historial no es una promesa de nadie.
 * Apoyarse en el funciona hasta que alguien cambie un `order by` en una
 * consulta que parece no tener nada que ver, y entonces esto empieza a borrar
 * el envio equivocado sin que ninguna prueba se entere.
 *
 * Devuelve `null` si no hay ninguno, y entonces no se deshace nada: marcar al
 * lead sigue siendo correcto aunque el registro no aparezca.
 */
export function envioQueSeDeshace(historial: SendLog[], leadId: string): number | null {
  let elegido: SendLog | null = null;

  for (const envio of historial) {
    if (envio.leadId !== leadId || envio.id === undefined) continue;
    if (!elegido || envio.sentAt > elegido.sentAt) elegido = envio;
  }

  return elegido?.id ?? null;
}

/**
 * Marca que el numero no esta en WhatsApp y deshace el envio recien registrado.
 *
 * Se le pasa el historial de la plantilla, no un identificador: quien llama
 * tiene el historial a mano y no el id, y hacer que lo busque cada pantalla
 * seria repetir el mismo bucle en dos sitios.
 */
export async function marcarSinWhatsApp(
  leadId: string,
  historial: SendLog[],
): Promise<void> {
  await callMarcarLeadSinWhatsApp(leadId, envioQueSeDeshace(historial, leadId));
}

/**
 * Marca que el lead pidio no recibir mas mensajes.
 *
 * No recibe historial porque no deshace nada: el mensaje si salio, y es el que
 * provoco la respuesta.
 */
export async function marcarNoContactar(leadId: string, nota: string): Promise<void> {
  await callMarcarLeadNoContactar(leadId, nota.trim() || null);
}
