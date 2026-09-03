import { describe, it, expect } from 'vitest';
import { formatPct, topLeadStats, funnelShares } from './captureLinkFormat';
import type { CaptureLinkStats } from '../types';

function segmento(leadsCount: number, ageRange = '25-34'): CaptureLinkStats {
  return {
    captureLinkId: 1,
    refCode: 'abc',
    linkName: 'Link',
    campaignName: 'Campana',
    totalLeads: leadsCount,
    closedLeads: 0,
    closeRatePct: 0,
    ageRange,
    incomeRange: '$500.000 - $800.000',
    region: 'Metropolitana',
    healthSystem: 'Fonasa',
    healthProvider: 'Sin dato',
    leadsCount,
  };
}

describe('formatPct', () => {
  it('escribe el porcentaje con un decimal', () => {
    expect(formatPct(33.333)).toBe('33.3%');
  });

  it('trata la ausencia de dato como cero', () => {
    expect(formatPct(0)).toBe('0.0%');
    expect(formatPct(Number.NaN)).toBe('0.0%');
  });
});

describe('topLeadStats', () => {
  it('descarta los segmentos sin leads', () => {
    const resultado = topLeadStats([segmento(0, '18-24'), segmento(3, '25-34')]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.ageRange).toBe('25-34');
  });

  /*
   * Antes se recortaba a cuatro sin ordenar, asi que con cinco segmentos el
   * mas grande podia quedar fuera solo por el orden de la consulta.
   */
  it('deja arriba los segmentos con mas leads', () => {
    const resultado = topLeadStats([
      segmento(2, 'a'),
      segmento(9, 'b'),
      segmento(5, 'c'),
      segmento(1, 'd'),
      segmento(7, 'e'),
    ]);

    expect(resultado.map((item) => item.ageRange)).toEqual(['b', 'e', 'c', 'a']);
  });

  it('nunca devuelve mas de cuatro', () => {
    const muchos = Array.from({ length: 9 }, (_, i) => segmento(i + 1));
    expect(topLeadStats(muchos)).toHaveLength(4);
  });
});

describe('funnelShares', () => {
  it('calcula cada tramo sobre el total de visitas', () => {
    expect(funnelShares({ visits: 200, totalLeads: 50, closedLeads: 10 })).toEqual({
      leads: 25,
      closed: 5,
    });
  });

  it('sin visitas no dibuja nada, en vez de dividir por cero', () => {
    expect(funnelShares({ visits: 0, totalLeads: 4, closedLeads: 1 })).toEqual({
      leads: 0,
      closed: 0,
    });
  });

  /*
   * Los leads pueden superar a las visitas: una carga manual o un lead que
   * llega sin pasar por el link. La barra se queda en el 100%.
   */
  it('acota al 100% cuando hay mas leads que visitas', () => {
    expect(funnelShares({ visits: 2, totalLeads: 5, closedLeads: 3 })).toEqual({
      leads: 100,
      closed: 100,
    });
  });
});
