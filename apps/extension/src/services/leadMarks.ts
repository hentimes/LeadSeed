import {
  callMarcarLeadNoContactar,
  callMarcarLeadSinWhatsApp,
} from '../repositories/leadMarksRepository';

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
 * Marca que el numero no esta en WhatsApp y deshace el envio recien registrado.
 *
 * `sendLogId` es el registro que la cola escribio al abrir el chat, que ella
 * guarda al escribirlo. Hubo una version que lo buscaba en el historial de la
 * plantilla eligiendo "el mas reciente de este lead": eso era adivinar cual
 * deshacer, y el historial trae cientos de filas de todas las rondas. Va nulo
 * cuando no hay ninguno que deshacer.
 */
export async function marcarSinWhatsApp(
  leadId: string,
  sendLogId: number | null,
): Promise<void> {
  await callMarcarLeadSinWhatsApp(leadId, sendLogId);
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
