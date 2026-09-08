/**
 * EL CUPO DIARIO DE WHATSAPP
 *
 * WhatsApp bloquea cuentas que mandan demasiado en un dia. El numero seguro
 * depende de la antiguedad de la cuenta y de cuanta gente responde; el producto
 * lo deja como ajuste, con 50 por defecto.
 *
 * Este modulo hace dos cosas y las dos son puras: decir cuanto queda hoy, y
 * repartir en los proximos dias lo que no cabe. Sin DOM, sin red y sin leer el
 * reloj -el `ahora` se recibe-, asi que se prueba entero y sirve igual en la
 * app movil.
 *
 * ## Por que el cupo cuenta TODO el WhatsApp del dia
 *
 * Y no solo lo que sale de los flujos. El limite es de la cuenta, no del flujo:
 * si mandaste 40 a mano desde Enviar, a los flujos les quedan 10. Un contador
 * que ignorara los manuales diria "0 de 50" el mismo dia en que ya te pasaste,
 * que es mentir en la unica direccion que importa.
 *
 * ## Por que hay que repartir y no solo bloquear
 *
 * Bloquear al llegar al tope deja los que sobran atrasados, y al dia siguiente
 * son los atrasados MAS los nuevos. La bola crece sola hasta que la cola deja
 * de significar nada. Repartir convierte "400 el 10/09" en "50 por dia del 10
 * al 17", que es una agenda que se puede cumplir.
 */

/** Un paso pendiente, con lo minimo para poder repartirlo. */
export interface PasoProgramable {
  progressId: number;
  /** Cuando vence hoy. Los mas viejos se reparten primero. */
  dueAt: string;
}

/** Un paso movido a otro dia. */
export interface Reprogramacion {
  progressId: number;
  dueAt: string;
}

export interface EstadoDelCupo {
  usados: number;
  tope: number;
  /** Nunca negativo: pasarse del tope deja cero, no un numero rojo. */
  quedan: number;
  agotado: boolean;
}

/** El comienzo del dia del USUARIO, no el del servidor. */
export function comienzoDelDia(ahora: Date): Date {
  const inicio = new Date(ahora);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

/**
 * Como esta el cupo de hoy.
 *
 * `quedan` se acota a cero porque pasarse ya ocurrio: mostrar "-12" invita a
 * pensar que hay que recuperarlos, cuando lo unico que hay que hacer es parar.
 */
export function estadoDelCupo(usados: number, tope: number): EstadoDelCupo {
  const topeSano = Math.max(0, tope);
  return {
    usados,
    tope: topeSano,
    quedan: Math.max(0, topeSano - usados),
    agotado: usados >= topeSano,
  };
}

/**
 * Reparte los pasos en los proximos dias sin pasar del cupo.
 *
 * El primer dia solo admite lo que queda del cupo de hoy -si ya mandaste 40 de
 * 50, hoy entran diez-; los siguientes admiten el tope entero.
 *
 * Los pasos se reparten del vencimiento mas viejo al mas nuevo: quien lleva mas
 * tiempo esperando sale antes. Es la misma regla que ya usa la cola de envio,
 * y romperla aqui haria que repartir cambiara el orden de la fila.
 *
 * Devuelve SOLO los que se ATRASAN. Un paso que ya vencia hoy o antes y que
 * cabe en el cupo de hoy se deja intacto, aunque le tocara "hoy a las 10:00":
 * moverlo le borraria el atraso, y "Atrasado 9d" es justo el dato con el que se
 * decide a quien escribirle primero. Repartir sirve para descongestionar el
 * futuro, no para blanquear el pasado.
 *
 * Por lo mismo, los que ya caben tampoco se anotan: una reprogramacion que
 * reescribe fechas que no hacia falta tocar convierte una operacion revisable
 * en una que hay que creerse entera.
 */
export function repartirEnDias(
  pasos: PasoProgramable[],
  tope: number,
  quedanHoy: number,
  ahora: Date,
): Reprogramacion[] {
  if (tope <= 0) return [];

  const ordenados = [...pasos].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const movimientos: Reprogramacion[] = [];

  /* Dia 0 = hoy, con el cupo ya gastado descontado. */
  let dia = 0;
  let sitiosEnElDia = Math.max(0, Math.min(quedanHoy, tope));

  for (const paso of ordenados) {
    while (sitiosEnElDia === 0) {
      dia += 1;
      sitiosEnElDia = tope;
    }
    sitiosEnElDia -= 1;

    const destino = comienzoDelDia(ahora);
    destino.setDate(destino.getDate() + dia);
    /*
     * A la hora en la que se reparte, no a medianoche: un paso que vence a las
     * 00:00 aparece como "atrasado" en cuanto empieza el dia, y la cola se
     * llenaria de rojo a primera hora sin que nadie se haya retrasado.
     */
    destino.setHours(ahora.getHours(), ahora.getMinutes(), 0, 0);

    /*
     * Lo que cae en el dia 0 NUNCA se toca. Le toca hoy, y da igual si venia de
     * hoy o del 1 de septiembre: reescribirle la fecha le borraria el atraso, y
     * "Atrasado 9d" es el dato con el que se decide a quien escribirle primero.
     *
     * Y aunque caiga en un dia posterior, solo se mueve si eso lo ATRASA: un
     * paso que ya estaba programado para el 20 no se adelanta al 12 porque
     * quedara sitio. Repartir descongestiona el futuro; nunca manda antes de
     * tiempo ni blanquea el pasado.
     */
    if (dia === 0) continue;

    const actual = new Date(paso.dueAt);
    if (comienzoDelDia(destino).getTime() > comienzoDelDia(actual).getTime()) {
      movimientos.push({ progressId: paso.progressId, dueAt: destino.toISOString() });
    }
  }

  return movimientos;
}

/** Si dos instantes caen en el mismo dia del calendario local. */
export function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Cuantos dias abarca un reparto, para poder anunciarlo antes de aplicarlo.
 *
 * Cero movimientos significa que todo cabe hoy: no es un reparto de cero dias,
 * es que no hay nada que repartir, y quien lo pinta debe decirlo asi.
 */
export function diasQueAbarca(movimientos: Reprogramacion[], ahora: Date): number {
  if (movimientos.length === 0) return 0;
  const ultimo = movimientos
    .map((m) => new Date(m.dueAt).getTime())
    .reduce((mayor, actual) => Math.max(mayor, actual), 0);
  const dias = Math.round(
    (comienzoDelDia(new Date(ultimo)).getTime() - comienzoDelDia(ahora).getTime()) / 86400000,
  );
  return Math.max(0, dias);
}
