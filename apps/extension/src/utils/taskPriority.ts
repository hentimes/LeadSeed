/**
 * LOS DOS EJES DE UNA TAREA
 *
 * ## Por que la urgencia no se marca a mano
 *
 * La importancia es un juicio -¿esto me acerca a un objetivo?- y por eso vive
 * en un campo que se marca. La urgencia no: es un hecho que se deduce de la
 * fecha de vencimiento. Pedir las dos a mano dejaria marcar "no urgente" una
 * tarea que vence manana, o sea permitir que los datos se contradigan.
 *
 * Es tambien lo que dice el metodo: urgente es lo que "requiere atencion
 * inmediata", y eso lo decide el plazo, no la opinion.
 *
 * ## El corte
 *
 * Dos dias. Una tarea vencida o que vence dentro de las proximas 48 horas es
 * urgente. Una sin fecha NO lo es, y no es un descuido: no tener plazo es
 * exactamente lo contrario de que apremie.
 *
 * El numero vive aca y no repartido por los componentes justamente para que la
 * matriz y el formulario no puedan discrepar sobre cual es la regla.
 */

/** Cuantos dias antes del vencimiento una tarea pasa a contar como urgente. */
export const DIAS_PARA_URGENTE = 2;

const UN_DIA = 86400000;

export type Cuadrante = 'hacer' | 'programar' | 'despachar' | 'eliminar';

export interface TareaPriorizable {
  fechaVencimiento: string;
  importante: boolean;
}

/**
 * `ahora` se recibe en vez de leer el reloj adentro para que la funcion se
 * pueda probar: con un instante fijo el resultado es determinista.
 */
export function esUrgente(tarea: TareaPriorizable, ahora: number = Date.now()): boolean {
  if (!tarea.fechaVencimiento) return false;

  const vence = new Date(tarea.fechaVencimiento).getTime();
  // Una fecha que no se puede leer no vuelve urgente a nadie.
  if (Number.isNaN(vence)) return false;

  return vence - ahora < DIAS_PARA_URGENTE * UN_DIA;
}

/** En que casilla de la matriz cae la tarea. */
export function cuadranteDe(tarea: TareaPriorizable, ahora: number = Date.now()): Cuadrante {
  const urgente = esUrgente(tarea, ahora);

  if (urgente && tarea.importante) return 'hacer';
  if (!urgente && tarea.importante) return 'programar';
  if (urgente && !tarea.importante) return 'despachar';
  return 'eliminar';
}

/**
 * Como explicarle a alguien, mientras elige la fecha, si eso la vuelve urgente.
 *
 * Existe porque la urgencia era invisible: se marcaba "es importante" y la otra
 * mitad de la matriz se decidia sola, sin que nada en pantalla dijera con que
 * regla.
 */
export function explicarUrgencia(fechaVencimiento: string, ahora: number = Date.now()): string {
  if (!fechaVencimiento) return 'Sin fecha no cuenta como urgente.';

  const vence = new Date(fechaVencimiento).getTime();
  if (Number.isNaN(vence)) return 'Sin fecha no cuenta como urgente.';

  if (vence < ahora) return 'Ya venció: cuenta como urgente.';

  return esUrgente({ fechaVencimiento, importante: false }, ahora)
    ? 'Vence pronto: cuenta como urgente.'
    : `Falta más de ${DIAS_PARA_URGENTE} días: todavía no es urgente.`;
}
