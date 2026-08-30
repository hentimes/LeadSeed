import { describe, expect, test } from 'vitest';
import { SMART_LIST_DEFS, getSmartListLeads } from './smartLists';
import type { Lead } from '../types';

let contador = 0;

function lead(overrides: Partial<Lead> = {}, payload: Record<string, unknown> = {}): Lead {
  contador += 1;
  return {
    id: `lead-${contador}`,
    name: `Lead ${contador}`,
    status: 'nuevo',
    updatedAt: new Date().toISOString(),
    ...(Object.keys(payload).length ? { metadata: { raw_payload: payload } } : {}),
    ...overrides,
  } as Lead;
}

/** Una fecha suficientemente antigua para el corte de cinco dias. */
function haceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

describe('SMART_LIST_DEFS', () => {
  test('todos los ids son unicos', () => {
    const ids = SMART_LIST_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('cada definicion tiene id, nombre, color y categoria', () => {
    for (const def of SMART_LIST_DEFS) {
      expect(def.id, JSON.stringify(def)).toBeTruthy();
      expect(def.name, def.id).toBeTruthy();
      expect(def.color, def.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(def.category, def.id).toBeTruthy();
    }
  });

  test('toda definicion declarada devuelve una lista, nunca undefined', () => {
    // Un id declarado que caiga en el `default` seria una lista rota en la UI.
    for (const def of SMART_LIST_DEFS) {
      expect(Array.isArray(getSmartListLeads(def.id, [], [])), def.id).toBe(true);
    }
  });
});

describe('getSmartListLeads', () => {
  test('un id desconocido devuelve lista vacia', () => {
    expect(getSmartListLeads('no_existe', [lead()], [])).toEqual([]);
  });

  test('nuevos filtra por estado', () => {
    const activos = [lead({ status: 'nuevo' }), lead({ status: 'contactado' })];

    expect(getSmartListLeads('smart_nuevos', activos, [])).toHaveLength(1);
  });

  test('eliminados devuelve la papelera, no los activos', () => {
    const eliminados = [lead(), lead()];

    expect(getSmartListLeads('smart_eliminados', [lead()], eliminados)).toEqual(eliminados);
  });

  describe('sin gestion', () => {
    test('incluye nuevos y contactados sin tocar en mas de cinco dias', () => {
      const activos = [
        lead({ status: 'nuevo', updatedAt: haceDias(10) }),
        lead({ status: 'contactado', updatedAt: haceDias(10) }),
      ];

      expect(getSmartListLeads('smart_sin_gestion', activos, [])).toHaveLength(2);
    });

    test('excluye los tocados recientemente', () => {
      const activos = [lead({ status: 'nuevo', updatedAt: haceDias(1) })];

      expect(getSmartListLeads('smart_sin_gestion', activos, [])).toHaveLength(0);
    });

    test('excluye estados que ya salieron del embudo aunque esten antiguos', () => {
      // Un lead convertido o descartado no esta "sin gestion": esta terminado.
      const activos = [
        lead({ status: 'convertido', updatedAt: haceDias(30) }),
        lead({ status: 'descartado', updatedAt: haceDias(30) }),
        lead({ status: 'interesado', updatedAt: haceDias(30) }),
      ];

      expect(getSmartListLeads('smart_sin_gestion', activos, [])).toHaveLength(0);
    });
  });

  test('no muta las listas recibidas', () => {
    const activos = [lead({ status: 'nuevo' }), lead({ status: 'contactado' })];
    const copia = [...activos];

    getSmartListLeads('smart_nuevos', activos, []);

    expect(activos).toEqual(copia);
  });
});
