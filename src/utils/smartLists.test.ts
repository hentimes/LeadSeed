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

  describe('sistema de salud', () => {
    test('separa Fonasa de Isapre', () => {
      const activos = [
        lead({}, { sistema_actual: 'Fonasa' }),
        lead({}, { sistema_actual: 'Isapre' }),
      ];

      expect(getSmartListLeads('smart_fonasa', activos, [])).toHaveLength(1);
      expect(getSmartListLeads('smart_isapre', activos, [])).toHaveLength(1);
    });

    test('tolera espacios sobrantes en el dato del formulario', () => {
      const activos = [lead({}, { sistema_actual: '  Fonasa  ' })];

      expect(getSmartListLeads('smart_fonasa', activos, [])).toHaveLength(1);
    });

    test('un lead sin metadata no entra en ninguna de las dos', () => {
      const activos = [lead()];

      expect(getSmartListLeads('smart_fonasa', activos, [])).toHaveLength(0);
      expect(getSmartListLeads('smart_isapre', activos, [])).toHaveLength(0);
    });

    test('filtra por isapre especifica', () => {
      const activos = [
        lead({}, { isapre_especifica: 'Colmena' }),
        lead({}, { isapre_especifica: 'Banmédica' }),
      ];

      expect(getSmartListLeads('smart_isapre_colmena', activos, [])).toHaveLength(1);
      expect(getSmartListLeads('smart_isapre_banmedica', activos, [])).toHaveLength(1);
    });
  });

  describe('rangos de edad', () => {
    test('clasifica el rango textual que envia el formulario', () => {
      const activos = [
        lead({}, { rango_edad: '30-39' }),
        lead({}, { rango_edad: '40-49' }),
        lead({}, { rango_edad: '50-59' }),
        lead({}, { rango_edad: '60 o mas' }),
      ];

      expect(getSmartListLeads('smart_edad_30_39', activos, [])).toHaveLength(1);
      expect(getSmartListLeads('smart_edad_40_49', activos, [])).toHaveLength(1);
      expect(getSmartListLeads('smart_edad_50_59', activos, [])).toHaveLength(1);
      expect(getSmartListLeads('smart_edad_60plus', activos, [])).toHaveLength(1);
    });

    test('acepta una edad numerica suelta', () => {
      const activos = [lead({}, { rango_edad: '25' })];

      expect(getSmartListLeads('smart_edad_sub30', activos, [])).toHaveLength(1);
    });

    test('un lead sin edad no aparece en ningun rango', () => {
      const activos = [lead()];

      for (const id of [
        'smart_edad_sub30', 'smart_edad_30_39', 'smart_edad_40_49',
        'smart_edad_50_59', 'smart_edad_60plus',
      ]) {
        expect(getSmartListLeads(id, activos, []), id).toHaveLength(0);
      }
    });

    test('los rangos no se solapan entre si', () => {
      // Un mismo lead no puede aparecer en dos rangos de edad a la vez.
      const unico = lead({}, { rango_edad: '40-49' });
      const rangos = [
        'smart_edad_sub30', 'smart_edad_30_39', 'smart_edad_40_49',
        'smart_edad_50_59', 'smart_edad_60plus',
      ];

      const apariciones = rangos.filter((id) => getSmartListLeads(id, [unico], []).length > 0);
      expect(apariciones).toEqual(['smart_edad_40_49']);
    });
  });

  test('no muta las listas recibidas', () => {
    const activos = [lead({ status: 'nuevo' }), lead({ status: 'contactado' })];
    const copia = [...activos];

    getSmartListLeads('smart_nuevos', activos, []);

    expect(activos).toEqual(copia);
  });
});
