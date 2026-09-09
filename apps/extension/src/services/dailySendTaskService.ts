import { fetchFlowUpcomingRows } from '../repositories/messageFlowsRepository';
import {
  ensureDailySendTaskRow,
  type ResultadoTareaDiariaRow,
} from '../repositories/dailySendTaskRepository';

/**
 * La tarea diaria de envios.
 *
 * Cada dia aparece sola una tarea "Enviar mensajes de hoy" con cuantos pasos
 * de flujo hay pendientes. No existia nada asi: se busco automatizacion de
 * tareas en el cliente y en las migraciones y no habia absolutamente nada.
 *
 * ## Por que se dispara al abrir el panel
 *
 * No hay servidor que corra tareas programadas. La alternativa era una alarma
 * de Chrome, que solo dispara si el navegador esta abierto y ademas crea la
 * tarea los sabados y en vacaciones. Al abrir, en cambio, no se crea nada los
 * dias que no trabajas, que es cuando una tarea de mas solo estorba.
 *
 * ## Por que la idempotencia vive en la base
 *
 * Dos ventanas del panel abiertas a la vez llegarian aqui las dos. La
 * comprobacion y el insert van juntos dentro de `ensure_daily_send_task`, con
 * la fila del perfil bloqueada, asi que la segunda ve la marca que dejo la
 * primera. Comprobarlo aqui con un `select` y despues insertar seria
 * exactamente la carrera que la funcion evita.
 */
export type ResultadoTareaDiaria = ResultadoTareaDiariaRow;

/** El dia de HOY en la zona de quien mira, como `YYYY-MM-DD`. */
function hoyLocal(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

export async function asegurarTareaDiariaDeEnvios(): Promise<ResultadoTareaDiaria> {
  const hoy = hoyLocal();

  /*
   * Los pendientes son informativos: si la consulta falla se manda cero y la
   * tarea se crea igual, sin el numero. Perder el recordatorio entero porque
   * no se pudo contar la cola seria cambiar lo importante por el adorno.
   */
  let pendientes: number;
  try {
    const carga = await fetchFlowUpcomingRows(1);
    pendientes = carga.find((fila) => fila.dia === hoy)?.cantidad ?? 0;
  } catch {
    pendientes = 0;
  }

  return ensureDailySendTaskRow(hoy, pendientes);
}
