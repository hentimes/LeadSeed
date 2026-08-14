export type TrendDirection = 'up' | 'down' | 'flat';

export interface Trend {
  /** Ya formateado: porcentaje, diferencia con signo, o texto. */
  value: string;
  /** Contra que se compara: "vs ayer", "vs mes pasado". */
  label: string;
  direction: TrendDirection;
}

/**
 * Compara el dato de hoy con el del periodo anterior.
 *
 * Reemplaza a tres calculos sueltos que hasta el `2026-08-14` daban numeros
 * equivocados de dos maneras distintas:
 *
 * - Sin referencia previa devolvian `0%` **con flecha verde**, que se lee como
 *   "igual que ayer" cuando en realidad ayer no hubo nada con que comparar.
 * - Los anillos de metas pasaban la diferencia en unidades y le pegaban un `%`
 *   detras: cinco mensajes mas que ayer aparecian como "5%".
 *
 * Cuando no hay con que comparar se muestra la diferencia absoluta con signo en
 * vez de inventar un porcentaje. Un `+12` sin referencia es honesto; un `100%`
 * o un `0%` no lo son.
 */
export function calcularTendencia(actual: number, comparado: number, etiqueta: string): Trend {
  const diferencia = actual - comparado;
  const direction: TrendDirection = diferencia > 0 ? 'up' : diferencia < 0 ? 'down' : 'flat';

  if (diferencia === 0) {
    return { value: 'sin cambios', label: etiqueta, direction };
  }

  if (comparado === 0) {
    return { value: `${diferencia > 0 ? '+' : ''}${diferencia}`, label: etiqueta, direction };
  }

  // El signo lo lleva la flecha, asi que el porcentaje va en valor absoluto.
  return {
    value: `${Math.abs(Math.round((diferencia / comparado) * 100))}%`,
    label: etiqueta,
    direction,
  };
}
