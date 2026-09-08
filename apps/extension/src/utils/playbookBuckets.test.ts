import { describe, it, expect } from 'vitest';
import { deducirBuckets, type EntradaDeDeduccion, type Resolucion } from './playbookBuckets';
import type { EstadoDeImportancia, PlaybookOption } from '../types';

const PRECIO: PlaybookOption = { id: 'precio', label: 'Precio' };
const HOSP: PlaybookOption = { id: 'hosp', label: 'Cobertura hospitalaria' };

function entrada(over: Partial<EntradaDeDeduccion> = {}): EntradaDeDeduccion {
  return {
    mejorar: [],
    clasificables: [],
    importancia: new Map<string, EstadoDeImportancia>(),
    catalogo: [PRECIO, HOSP],
    resoluciones: new Map<string, Resolucion>(),
    ...over,
  };
}

/*
 * Las ocho celdas del cruce, una por test y con el nombre de la celda. Es la
 * unica logica de verdad de toda la funcionalidad: si una de estas se rompe,
 * la frase que se le lee al cliente dice algo que no dijo.
 */
describe('deducirBuckets · las ocho celdas', () => {
  it('no marcado y sin clasificar: sin señal', () => {
    const d = deducirBuckets(entrada({ clasificables: [PRECIO] }));

    expect(d.buckets.mejorar).toEqual([]);
    expect(d.buckets.mantener).toEqual([]);
    expect(d.buckets.prescindible).toEqual([]);
  });

  it('no marcado e indispensable: mantener', () => {
    const d = deducirBuckets(
      entrada({ clasificables: [PRECIO], importancia: new Map([['precio', 'indispensable']]) }),
    );

    expect(d.buckets.mantener).toEqual([PRECIO]);
  });

  it('no marcado y flexible: flexible, y NO entra en la frase', () => {
    const d = deducirBuckets(
      entrada({ clasificables: [PRECIO], importancia: new Map([['precio', 'flexible']]) }),
    );

    expect(d.buckets.flexible).toEqual([PRECIO]);
    expect(d.buckets.mantener).toEqual([]);
    expect(d.buckets.prescindible).toEqual([]);
  });

  it('no marcado y prescindible: prescindible', () => {
    const d = deducirBuckets(
      entrada({ clasificables: [PRECIO], importancia: new Map([['precio', 'prescindible']]) }),
    );

    expect(d.buckets.prescindible).toEqual([PRECIO]);
  });

  it('marcado y sin clasificar: mejorar', () => {
    const d = deducirBuckets(entrada({ mejorar: [PRECIO], clasificables: [PRECIO] }));

    expect(d.buckets.mejorar).toEqual([PRECIO]);
  });

  it('marcado e indispensable: mejorar sin perder', () => {
    const d = deducirBuckets(
      entrada({
        mejorar: [HOSP],
        clasificables: [HOSP],
        importancia: new Map([['hosp', 'indispensable']]),
      }),
    );

    expect(d.buckets.mejorar_sin_perder).toEqual([HOSP]);
    // No puede aparecer ademas en las listas normales: se diria dos veces.
    expect(d.buckets.mejorar).toEqual([]);
    expect(d.buckets.mantener).toEqual([]);
  });

  it('marcado y flexible: mejorar con margen', () => {
    const d = deducirBuckets(
      entrada({
        mejorar: [PRECIO],
        clasificables: [PRECIO],
        importancia: new Map([['precio', 'flexible']]),
      }),
    );

    expect(d.buckets.mejorar_con_margen).toEqual([PRECIO]);
  });

  /*
   * Quiere mejorarlo y a la vez no le importa perderlo. No lo decide el
   * asesor: se aparta y se pregunta. Meterlo en cualquiera de los dos lados
   * seria inventar una respuesta que el cliente no dio.
   */
  it('marcado y prescindible: contradiccion, y fuera de todo bucket', () => {
    const d = deducirBuckets(
      entrada({
        mejorar: [PRECIO],
        clasificables: [PRECIO],
        importancia: new Map([['precio', 'prescindible']]),
      }),
    );

    expect(d.contradicciones).toEqual([PRECIO]);
    expect(d.buckets.mejorar).toEqual([]);
    expect(d.buckets.prescindible).toEqual([]);
  });
});

describe('deducirBuckets · resolver la contradiccion', () => {
  const contradictorio = {
    mejorar: [PRECIO],
    clasificables: [PRECIO],
    importancia: new Map<string, EstadoDeImportancia>([['precio', 'prescindible']]),
  };

  /*
   * Se le pregunta al cliente cual pesa mas, y su respuesta manda. Lo que NO se
   * hace es corregir el origen: que dijo las dos cosas queda guardado.
   */
  it('contestar "mejorar" lo manda a mejorar y deja de ser contradiccion', () => {
    const d = deducirBuckets(
      entrada({ ...contradictorio, resoluciones: new Map([['precio', 'mejorar']]) }),
    );

    expect(d.buckets.mejorar).toEqual([PRECIO]);
    expect(d.contradicciones).toEqual([]);
  });

  it('contestar "prescindible" lo manda a prescindible', () => {
    const d = deducirBuckets(
      entrada({ ...contradictorio, resoluciones: new Map([['precio', 'prescindible']]) }),
    );

    expect(d.buckets.prescindible).toEqual([PRECIO]);
    expect(d.contradicciones).toEqual([]);
  });

  it('una resolucion de otra opcion no desactiva esta contradiccion', () => {
    const d = deducirBuckets(
      entrada({ ...contradictorio, resoluciones: new Map([['hosp', 'mejorar']]) }),
    );

    expect(d.contradicciones).toEqual([PRECIO]);
  });

  /*
   * Resolver algo que no esta en conflicto no puede moverlo de sitio: la
   * resolucion solo aplica en la celda de la contradiccion.
   */
  it('resolver algo sin conflicto no lo mueve', () => {
    const d = deducirBuckets(
      entrada({
        mejorar: [PRECIO],
        clasificables: [PRECIO],
        resoluciones: new Map([['precio', 'prescindible']]),
      }),
    );

    expect(d.buckets.mejorar).toEqual([PRECIO]);
    expect(d.buckets.prescindible).toEqual([]);
  });
});

describe('deducirBuckets · la regla que no se puede romper', () => {
  /*
   * Deducir "no lo marco, luego no le importa" convertiria la frase en una
   * mentira dicha delante del cliente.
   */
  it('lo no marcado NUNCA se vuelve prescindible', () => {
    const d = deducirBuckets(entrada({ mejorar: [PRECIO], clasificables: [PRECIO, HOSP] }));

    expect(d.buckets.prescindible).toEqual([]);
  });
});

describe('deducirBuckets · huerfanas', () => {
  /*
   * Se clasifico y despues se desmarco arriba. La clasificacion se conserva
   * -es la unica politica reversible- pero no cuenta, y se lista para que la
   * pantalla pueda avisar de que la frase cambio sin tocar nada de aqui.
   */
  it('lo clasificado que ya no se ofrece no cuenta, pero se informa', () => {
    const d = deducirBuckets(
      entrada({ clasificables: [PRECIO], importancia: new Map([['hosp', 'indispensable']]) }),
    );

    expect(d.buckets.mantener).toEqual([]);
    expect(d.huerfanas).toEqual([HOSP]);
  });

  it('vuelve a contar en cuanto se marca de nuevo arriba', () => {
    const d = deducirBuckets(
      entrada({
        clasificables: [PRECIO, HOSP],
        importancia: new Map([['hosp', 'indispensable']]),
      }),
    );

    expect(d.buckets.mantener).toEqual([HOSP]);
    expect(d.huerfanas).toEqual([]);
  });
});

describe('deducirBuckets · orden', () => {
  it('respeta el orden en que llega lo marcado, que trae la prioridad primero', () => {
    const d = deducirBuckets(entrada({ mejorar: [HOSP, PRECIO], clasificables: [HOSP, PRECIO] }));

    expect(d.buckets.mejorar.map((o) => o.id)).toEqual(['hosp', 'precio']);
  });
});
