import type { CaptureLinkStats } from '../types';

/** Cuantos segmentos se muestran en la analitica de un link. */
const MAX_SEGMENTOS = 4;

export function formatPct(value: number): string {
  return `${Number(value || 0).toFixed(1)}%`;
}

/**
 * Los segmentos con leads, de mayor a menor.
 *
 * Antes se recortaba sin ordenar, asi que "los 4 primeros" dependia del orden
 * en que llegara la consulta y no de cuales tenian mas leads. Con cuatro
 * huecos y sin ordenar, el segmento mas grande podia quedar fuera.
 */
export function topLeadStats(stats: CaptureLinkStats[]): CaptureLinkStats[] {
  return stats
    .filter((item) => item.leadsCount > 0)
    .sort((a, b) => b.leadsCount - a.leadsCount)
    .slice(0, MAX_SEGMENTOS);
}

/**
 * Tramos de la barra de embudo de un link, en porcentaje del total de visitas.
 *
 * Los dos tramos se dibujan uno encima del otro desde la izquierda, asi que
 * el de cierre va contenido dentro del de leads y no sumado a el.
 */
export function funnelShares(link: {
  visits: number;
  totalLeads: number;
  closedLeads: number;
}): { leads: number; closed: number } {
  if (link.visits <= 0) return { leads: 0, closed: 0 };

  const acotar = (valor: number) => Math.min(100, Math.max(0, (valor / link.visits) * 100));

  return { leads: acotar(link.totalLeads), closed: acotar(link.closedLeads) };
}
