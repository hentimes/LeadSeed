import type { ComparePeriod } from '../../types/settings';

/**
 * Las seis ventanas del panel, en un solo sitio.
 *
 * `corto` es como se nombra el periodo anterior, para cuando haga falta decir
 * contra que se compara. El panel ya no lo pinta -lo dice el propio selector-,
 * pero `calcularTendencia` lo pide y algun informe si lo muestra.
 */
export const PERIODOS: Array<{ valor: ComparePeriod; nombre: string; corto: string }> = [
  { valor: 'today', nombre: 'Hoy', corto: 'vs ayer' },
  { valor: 'last7', nombre: 'Últimos 7 días', corto: 'vs los 7 anteriores' },
  { valor: 'last30', nombre: 'Últimos 30 días', corto: 'vs los 30 anteriores' },
  { valor: 'last90', nombre: 'Últimos 90 días', corto: 'vs los 90 anteriores' },
  { valor: 'last180', nombre: 'Últimos 6 meses', corto: 'vs los 6 anteriores' },
  { valor: 'last365', nombre: 'Último año', corto: 'vs el año anterior' },
];

export function etiquetaCorta(periodo: ComparePeriod): string {
  return PERIODOS.find((p) => p.valor === periodo)?.corto ?? 'vs ayer';
}

/** Como se nombra la ventana dentro de un titulo: "Rendimiento (7 dias)". */
export function nombreDePeriodo(periodo: ComparePeriod): string {
  return PERIODOS.find((p) => p.valor === periodo)?.nombre ?? 'Hoy';
}
