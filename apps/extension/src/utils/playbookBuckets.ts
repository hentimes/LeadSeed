import type { EstadoDeImportancia, PlaybookOption } from '../types';

/**
 * LA DEDUCCION: de lo marcado a lo que significa.
 *
 * Cada opcion tiene dos señales cruzadas -si se marco para mejorar, y como se
 * clasifico su importancia- y de ese cruce salen ocho casos. Son estos, y no
 * hay mas:
 *
 *   ¿mejorar?  importancia      resultado
 *   ---------  ---------------  ----------------------------------------
 *   No         sin tocar        sin señal
 *   No         indispensable    MANTENER
 *   No         flexible         FLEXIBLE (se guarda, no entra en la frase)
 *   No         prescindible     PRESCINDIBLE
 *   Si         sin tocar        MEJORAR
 *   Si         indispensable    MEJORAR SIN PERDER (clausula propia)
 *   Si         flexible         MEJORAR con margen para ceder
 *   Si         prescindible     CONTRADICCION, hay que preguntar
 *
 * ## La regla que no se puede romper
 *
 * PRESCINDIBLE nace UNICAMENTE de una clasificacion explicita. Nunca de una
 * ausencia. Deducir "no lo marco, luego no le importa" convertiria la frase de
 * confirmacion en una mentira dicha delante del cliente, que es lo peor que
 * puede pasar en esa reunion.
 *
 * ## La contradiccion se pregunta, no se decide
 *
 * Si algo esta marcado para mejorar y a la vez como prescindible, no lo resuelve
 * el asesor: se le pregunta al cliente cual pesa mas. Mientras no conteste, el
 * punto se aparta y no entra en ningun bucket -meterlo en cualquiera de los dos
 * lados seria inventar una respuesta que no dio-. Contestado, entra en el lado
 * que eligio, y queda constancia de que dijo las dos cosas.
 *
 * ## Generico a proposito
 *
 * Aqui no hay isapres ni coberturas: hay ids y etiquetas. Lo que las opciones
 * significan es contenido del playbook. Por eso el mismo motor sirve para
 * "Llamada en frio" o para lo que venga.
 */

export type Bucket =
  | 'mantener'
  | 'flexible'
  | 'prescindible'
  | 'mejorar'
  | 'mejorar_sin_perder'
  | 'mejorar_con_margen';

/** Como quedo resuelta una contradiccion cuando se le pregunto al cliente. */
export type Resolucion = 'mejorar' | 'prescindible';

export interface EntradaDeDeduccion {
  /** Lo marcado en el punto de rol 'mejorar', ya con la prioridad primero. */
  mejorar: readonly PlaybookOption[];
  /** Lo que HOY se ofrece para clasificar. Lo clasificado fuera de aqui es huerfano. */
  clasificables: readonly PlaybookOption[];
  /** Lo clasificado, tal como esta guardado. Sin entrada = sin tocar. */
  importancia: ReadonlyMap<string, EstadoDeImportancia>;
  /** Todo lo nombrable, para poder rotular lo huerfano. */
  catalogo: readonly PlaybookOption[];
  /**
   * Lo que el cliente contesto al preguntarle por una contradiccion.
   *
   * Se guarda aparte y NO se corrige el origen: que dijo las dos cosas es un
   * dato, y reescribir lo marcado arriba lo borraria. Aqui queda que dijo ambas
   * y que, preguntado, eligio una.
   */
  resoluciones: ReadonlyMap<string, Resolucion>;
}

export interface Deduccion {
  buckets: Record<Bucket, PlaybookOption[]>;
  /** Marcado para mejorar y a la vez prescindible, y todavia SIN resolver. */
  contradicciones: PlaybookOption[];
  /** Clasificado en su dia y hoy ya no marcado arriba. */
  huerfanas: PlaybookOption[];
}

const BUCKETS_VACIOS = (): Record<Bucket, PlaybookOption[]> => ({
  mantener: [],
  flexible: [],
  prescindible: [],
  mejorar: [],
  mejorar_sin_perder: [],
  mejorar_con_margen: [],
});

export function deducirBuckets(entrada: EntradaDeDeduccion): Deduccion {
  const buckets = BUCKETS_VACIOS();
  const contradicciones: PlaybookOption[] = [];
  const huerfanas: PlaybookOption[] = [];

  const clasificables = new Map(entrada.clasificables.map((o) => [o.id, o]));
  const mejorar = new Map(entrada.mejorar.map((o) => [o.id, o]));
  const nombres = new Map(
    [...entrada.catalogo, ...entrada.clasificables, ...entrada.mejorar].map((o) => [o.id, o]),
  );

  /*
   * Huerfanas: se clasifico y despues se desmarco arriba.
   *
   * No se borran -esa es la politica: conservar e ignorar, que es la unica
   * reversible- pero tampoco cuentan. Se listan para que la pantalla pueda
   * avisar de que la frase cambio sin que se tocara nada de aqui.
   */
  for (const id of entrada.importancia.keys()) {
    if (!clasificables.has(id)) huerfanas.push(nombres.get(id) ?? { id, label: id });
  }

  // Se recorre en el orden en que llega `mejorar` -la prioridad va primero- y
  // luego el resto de clasificables, para que la frase salga ordenada.
  const recorrido = [
    ...entrada.mejorar,
    ...entrada.clasificables.filter((o) => !mejorar.has(o.id)),
  ];

  for (const opcion of recorrido) {
    const enMejorar = mejorar.has(opcion.id);
    const estado = clasificables.has(opcion.id) ? entrada.importancia.get(opcion.id) : undefined;

    if (enMejorar) {
      if (estado === 'prescindible') {
        /*
         * Quiere mejorarlo y a la vez no le importa perderlo. No lo decide el
         * asesor: se le pregunta. Mientras no conteste, el punto se aparta y no
         * entra en ningun bucket; contestado, va al lado que eligio.
         */
        const resuelta = entrada.resoluciones.get(opcion.id);
        if (resuelta === 'mejorar') buckets.mejorar.push(opcion);
        else if (resuelta === 'prescindible') buckets.prescindible.push(opcion);
        else contradicciones.push(opcion);
      } else if (estado === 'indispensable') buckets.mejorar_sin_perder.push(opcion);
      else if (estado === 'flexible') buckets.mejorar_con_margen.push(opcion);
      else buckets.mejorar.push(opcion);
      continue;
    }

    if (estado === 'indispensable') buckets.mantener.push(opcion);
    else if (estado === 'flexible') buckets.flexible.push(opcion);
    else if (estado === 'prescindible') buckets.prescindible.push(opcion);
    // Sin marcar y sin clasificar: sin señal. No se inventa nada.
  }

  return { buckets, contradicciones, huerfanas };
}
