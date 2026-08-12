import { describe, expect, test } from 'vitest';
import { compareLeadPriority, mapLeadRowToDomain } from './leadsService';
import type { Lead } from '../types';
import type { LeadRow } from '../repositories/leadsRepository';

function row(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 'lead-1',
    name: 'Ana Perez',
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
    ...overrides,
  } as LeadRow;
}

describe('mapLeadRowToDomain', () => {
  test('traduce los campos con nombre distinto entre base y dominio', () => {
    const lead = mapLeadRowToDomain(
      row({
        lista_ids: [1, 2],
        scheduled_at: '2026-08-05T12:00:00.000Z',
        utm_source: 'google',
        estimated_value: 150000,
      }),
    );

    expect(lead.listaIds).toEqual([1, 2]);
    expect(lead.scheduledAt).toBe('2026-08-05T12:00:00.000Z');
    expect(lead.utmSource).toBe('google');
    expect(lead.estimatedValue).toBe(150000);
  });

  describe('valores ausentes', () => {
    test('los campos de texto caen a cadena vacia, no a undefined', () => {
      // La UI los pinta directo; un undefined mostraria "undefined".
      const lead = mapLeadRowToDomain(row());

      expect(lead.phone).toBe('');
      expect(lead.email).toBe('');
      expect(lead.company).toBe('');
      expect(lead.rut).toBe('');
      expect(lead.notes).toBe('');
    });

    test('los campos opcionales de fecha quedan en undefined, no en cadena vacia', () => {
      // Se comparan con Date.parse, y '' daria NaN.
      const lead = mapLeadRowToDomain(row());

      expect(lead.scheduledAt).toBeUndefined();
      expect(lead.closedAt).toBeUndefined();
      expect(lead.deletedAt).toBeUndefined();
    });

    test('estado por defecto nuevo, score cero y listas vacias', () => {
      const lead = mapLeadRowToDomain(row());

      expect(lead.status).toBe('nuevo');
      expect(lead.score).toBe(0);
      expect(lead.listaIds).toEqual([]);
      expect(lead.metadata).toEqual({});
    });
  });

  describe('banderas derivadas de metadata', () => {
    test('isPinned exige exactamente true', () => {
      expect(mapLeadRowToDomain(row({ metadata: { isPinned: true } })).isPinned).toBe(true);
      expect(mapLeadRowToDomain(row({ metadata: { isPinned: 'si' } })).isPinned).toBe(false);
      expect(mapLeadRowToDomain(row()).isPinned).toBe(false);
    });

    test('un lead sin marca de lectura se considera sin leer', () => {
      // "Sin abrir" no es lo mismo que "nuevo": el estado por defecto de un
      // lead recien capturado es no leido.
      expect(mapLeadRowToDomain(row()).isUnread).toBe(true);
      expect(mapLeadRowToDomain(row({ metadata: {} })).isUnread).toBe(true);
    });

    test('solo is_read estrictamente true marca el lead como leido', () => {
      expect(mapLeadRowToDomain(row({ metadata: { is_read: true } })).isUnread).toBe(false);
      expect(mapLeadRowToDomain(row({ metadata: { is_read: 'true' } })).isUnread).toBe(true);
    });
  });

  test('las alertas cruzadas arrancan vacias, se adjuntan despues', () => {
    const lead = mapLeadRowToDomain(row());

    expect(lead.crossExecAlerts).toEqual([]);
    expect(lead.hasUnreadCrossExecAlert).toBe(false);
    expect(lead.crossExecPriorityAt).toBeUndefined();
  });

  test('un score cero de base no se confunde con ausencia', () => {
    expect(mapLeadRowToDomain(row({ score: 0 })).score).toBe(0);
  });
});

describe('compareLeadPriority', () => {
  function lead(overrides: Partial<Lead>): Lead {
    return { id: 'x', createdAt: '2026-08-01T00:00:00.000Z', ...overrides } as Lead;
  }

  test('ordena del mas reciente al mas antiguo', () => {
    const nuevo = lead({ createdAt: '2026-08-10T00:00:00.000Z' });
    const viejo = lead({ createdAt: '2026-08-01T00:00:00.000Z' });

    expect([viejo, nuevo].sort(compareLeadPriority)[0]).toBe(nuevo);
  });

  test('una alerta cruzada tiene prioridad sobre la fecha de creacion', () => {
    // El sentido de la funcion: un lead antiguo con alerta reciente debe subir.
    const antiguoConAlerta = lead({
      createdAt: '2026-01-01T00:00:00.000Z',
      crossExecPriorityAt: '2026-08-12T00:00:00.000Z',
    });
    const recienteSinAlerta = lead({ createdAt: '2026-08-10T00:00:00.000Z' });

    expect([recienteSinAlerta, antiguoConAlerta].sort(compareLeadPriority)[0]).toBe(
      antiguoConAlerta,
    );
  });

  test('devuelve cero para dos leads con la misma fecha', () => {
    const a = lead({ createdAt: '2026-08-01T00:00:00.000Z' });
    const b = lead({ createdAt: '2026-08-01T00:00:00.000Z' });

    expect(compareLeadPriority(a, b)).toBe(0);
  });

  test('el orden es estable al aplicarse dos veces', () => {
    const leads = [
      lead({ id: 'a', createdAt: '2026-08-03T00:00:00.000Z' }),
      lead({ id: 'b', createdAt: '2026-08-01T00:00:00.000Z' }),
      lead({ id: 'c', createdAt: '2026-08-02T00:00:00.000Z' }),
    ];

    const unaVez = [...leads].sort(compareLeadPriority).map((l) => l.id);
    const dosVeces = [...leads].sort(compareLeadPriority).sort(compareLeadPriority).map((l) => l.id);

    expect(unaVez).toEqual(['a', 'c', 'b']);
    expect(dosVeces).toEqual(unaVez);
  });
});
