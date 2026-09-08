/**
 * RETOMAR UN FLUJO POR DONDE VA EL LEAD
 *
 * Los flujos de este producto casi nunca empiezan en cero. Se arman despues de
 * haber estado escribiendo a mano, asi que media agenda ya recibio el mensaje
 * del paso 1 -a veces el del 2- antes de que el flujo existiera. Inscribir a esa
 * gente desde el principio le vuelve a mandar lo mismo.
 *
 * Por que paso va cada lead lo resuelve la base -`flow_resume_points`, migracion
 * 158-, cruzando lo enviado con las plantillas de los pasos. Lo que decide este
 * modulo es lo otro: **que se le ofrece al usuario** con ese dato en la mano.
 *
 * Esta aparte y sin tocar la base ni el DOM porque son tres casos con reglas
 * distintas y ninguno es el evidente: el lead que no recibio nada, el que
 * recibio hasta la mitad, y el que ya recibio hasta el ultimo paso -a ese
 * inscribirlo "desde donde va" lo dejaria completado en el acto, o sea sin
 * hacer nada-.
 */

export type OfertaDeInscripcion =
  /** No consta ningun mensaje del flujo: se inscribe desde el paso 1. */
  | { tipo: 'desde-el-inicio' }
  /**
   * Ya recibio hasta `ultimoPasoHecho`; se puede retomar desde el siguiente.
   * `desde` es la fecha del ultimo envio, y desde ella se cuenta la espera.
   */
  | { tipo: 'retomar'; ultimoPasoHecho: number; siguientePaso: number; desde: string }
  /**
   * Ya recibio todos los pasos. Inscribirlo "por donde va" no dejaria nada
   * pendiente, asi que no se ofrece: la unica accion con sentido es repetir el
   * flujo entero, y esa la tiene que pedir el usuario a proposito.
   */
  | { tipo: 'ya-los-recibio-todos'; desde: string };

/** Lo que la base sabe de un lead frente a un flujo. */
export interface PuntoDeRetoma {
  leadId: string;
  ultimoPasoHecho: number;
  ultimoEnvioAt: string;
}

/**
 * Que ofrecerle a un lead concreto.
 *
 * `totalDePasos` viene del flujo y no del punto de retoma: si el flujo tiene
 * tres pasos y el lead recibio el tercero, esta terminado; con el mismo dato y
 * un flujo de cuatro, le falta uno.
 */
export function ofertaParaLead(
  punto: PuntoDeRetoma | undefined,
  totalDePasos: number,
): OfertaDeInscripcion {
  if (!punto || punto.ultimoPasoHecho <= 0) return { tipo: 'desde-el-inicio' };

  if (punto.ultimoPasoHecho >= totalDePasos) {
    return { tipo: 'ya-los-recibio-todos', desde: punto.ultimoEnvioAt };
  }

  return {
    tipo: 'retomar',
    ultimoPasoHecho: punto.ultimoPasoHecho,
    siguientePaso: punto.ultimoPasoHecho + 1,
    desde: punto.ultimoEnvioAt,
  };
}

/**
 * Cuando venceria el proximo paso si se retoma ahora.
 *
 * La espera se cuenta desde el ULTIMO ENVIO REAL, no desde el momento de
 * inscribir. Un flujo que dice "3 dias despues del anterior" y alguien a quien
 * le escribiste hace cinco tiene que quedar vencido hoy, no dentro de tres
 * dias: si se contara desde la inscripcion, retomar castigaria con una espera
 * que ya paso.
 *
 * Devuelve la fecha aunque quede en el pasado. Que eso signifique "vencido" lo
 * decide quien lo pinta, comparando con su propio reloj, igual que hace
 * `tocaAhora`.
 */
export function venceAlRetomar(desde: string, esperaEnDias: number): Date {
  const base = new Date(desde);
  const vence = new Date(base);
  vence.setDate(vence.getDate() + esperaEnDias);
  return vence;
}

/** Indexa por lead los puntos que devolvio la base, para leerlos en O(1). */
export function indexarPuntos(puntos: PuntoDeRetoma[]): Map<string, PuntoDeRetoma> {
  return new Map(puntos.map((punto) => [punto.leadId, punto]));
}
