import type { ComparePeriod } from '../../types/settings';

/**
 * Como se llama cada periodo de comparacion, en un solo sitio.
 *
 * Estaba repartido en dos: un `if/else` en `DashboardPage` para la etiqueta
 * corta de las tarjetas y una lista de `<option>` a mano en Ajustes. Al añadir
 * el trimestre y el semestre habria hecho falta tocar los dos y acordarse de
 * los dos.
 */
export const PERIODOS: Array<{ valor: ComparePeriod; nombre: string; corto: string }> = [
  { valor: 'yesterday', nombre: 'Ayer', corto: 'vs ayer' },
  { valor: 'lastWeek', nombre: 'Semana pasada', corto: 'vs sem. pasada' },
  { valor: 'lastMonth', nombre: 'Mes pasado', corto: 'vs mes pasado' },
  { valor: 'lastQuarter', nombre: 'Trimestre pasado', corto: 'vs trimestre' },
  { valor: 'lastHalf', nombre: 'Semestre pasado', corto: 'vs semestre' },
  { valor: 'lastYear', nombre: 'Año pasado', corto: 'vs año pasado' },
];

/** La etiqueta corta, la que va debajo de cada numero del panel. */
export function etiquetaCorta(periodo: ComparePeriod): string {
  return PERIODOS.find((p) => p.valor === periodo)?.corto ?? 'vs ayer';
}
