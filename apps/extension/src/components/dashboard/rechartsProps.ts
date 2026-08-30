/**
 * Formas de lo que Recharts pasa a los renderizadores personalizados.
 *
 * Recharts tipa esos callbacks de forma muy laxa, asi que en el codigo estaban
 * todos como `any`. Eso no solo apaga el tipado: apaga tambien el aviso de
 * `noUncheckedIndexedAccess`, que es justo el que avisa de que `payload[0]`
 * puede no existir.
 *
 * Estos tipos describen **solo lo que el codigo usa**, no la API completa de la
 * libreria. Todo es opcional a proposito, porque Recharts llama a estos
 * callbacks tambien mientras el grafico se esta montando, cuando aun no hay
 * datos ni geometria.
 */

/**
 * Valor que Recharts pone en una entrada del tooltip.
 *
 * Incluye el caso de array porque la libreria lo admite para series con varios
 * valores por punto (por ejemplo un rango). Aqui no se usa, pero declararlo
 * obliga a comprobar el tipo antes de operar con el, que es lo correcto.
 */
export type ValorTooltip = number | string | readonly (string | number)[];

/** Un valor dentro del `payload` de un tooltip. */
export interface EntradaTooltip<T = unknown> {
  value?: ValorTooltip;
  /**
   * Nombre de la serie; en un grafico de sectores, el de la porcion. Puede ser
   * numerico porque Recharts admite claves numericas.
   */
  name?: string | number;
  color?: string;
  /** Fila original de datos, tal como se le paso al grafico. */
  payload?: T;
}

/** Lo que recibe un tooltip personalizado. */
export interface PropsTooltip<T = unknown> {
  active?: boolean;
  /** De solo lectura: Recharts entrega su propio array y no debe mutarse. */
  payload?: readonly EntradaTooltip<T>[];
  /** Etiqueta del eje X en la posicion apuntada. */
  label?: string | number;
}

/**
 * Lo que recibe el renderizador de una etiqueta sobre una barra.
 *
 * `value` puede llegar ya formateado como texto (`"42%"`), no solo numerico:
 * por eso el codigo lo compara contra `'0%'` y `'NaN%'`.
 */
export interface PropsEtiqueta {
  // Recharts los declara como `string | number` porque acepta unidades SVG en
  // texto. El codigo comprueba que sean numeros antes de operar con ellos.
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  /**
   * `RenderableText` de Recharts: admite tambien `null` y `false` para el caso
   * de "no hay nada que rotular". El codigo lo descarta con un chequeo de
   * falsedad antes de usarlo.
   */
  value?: number | string | boolean | null;
  index?: number;
}

/** Lo que recibe el renderizador de un punto de una linea. */
export interface PropsPunto<T = unknown> {
  cx?: number;
  cy?: number;
  index?: number;
  /** Fila original del punto; se usa para decidir si vale la pena animarlo. */
  payload?: T;
}
