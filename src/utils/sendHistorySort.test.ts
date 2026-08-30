import { describe, expect, test } from 'vitest';
import {
  ORDENES,
  ORDEN_POR_DEFECTO,
  ordenPorValor,
  ordenarHistorial,
  type FilaOrdenable,
} from './sendHistorySort';

function fila(leadName: string, templateNombre: string, sentAt: string): FilaOrdenable {
  return { leadName, templateNombre, sentAt };
}

const ANA = fila('Ana', 'Bienvenida', '2026-08-10T10:00:00.000Z');
const ZOE = fila('Zoe', 'Aviso', '2026-08-12T10:00:00.000Z');
const ANGELA = fila('Ángela', 'Cierre', '2026-08-11T10:00:00.000Z');

describe('orden por fecha', () => {
  test('descendente pone lo mas reciente primero', () => {
    const ordenado = ordenarHistorial([ANA, ZOE, ANGELA], 'fecha', 'desc');

    expect(ordenado.map((f) => f.leadName)).toEqual(['Zoe', 'Ángela', 'Ana']);
  });

  test('ascendente pone lo mas antiguo primero', () => {
    const ordenado = ordenarHistorial([ANA, ZOE, ANGELA], 'fecha', 'asc');

    expect(ordenado.map((f) => f.leadName)).toEqual(['Ana', 'Ángela', 'Zoe']);
  });
});

describe('orden por lead', () => {
  test('la tilde no manda el nombre al final', () => {
    // El fallo que este test existe para impedir: comparando por codigo, "Á"
    // (U+00C1) es mayor que "Z", asi que Ángela caeria despues de Zoe. En una
    // lista de nombres en castellano eso se ve enseguida y se ve mal.
    const ordenado = ordenarHistorial([ZOE, ANGELA, ANA], 'lead', 'asc');

    expect(ordenado.map((f) => f.leadName)).toEqual(['Ana', 'Ángela', 'Zoe']);
  });

  test('descendente invierte', () => {
    const ordenado = ordenarHistorial([ANA, ANGELA, ZOE], 'lead', 'desc');

    expect(ordenado.map((f) => f.leadName)).toEqual(['Zoe', 'Ángela', 'Ana']);
  });

  test('mayusculas y minusculas quedan juntas', () => {
    const filas = [fila('ana', 'X', '2026-08-01T00:00:00Z'), fila('Bruno', 'X', '2026-08-02T00:00:00Z'), fila('Ana', 'X', '2026-08-03T00:00:00Z')];

    const ordenado = ordenarHistorial(filas, 'lead', 'asc');

    expect(ordenado.map((f) => f.leadName)).toEqual(['Ana', 'ana', 'Bruno']);
  });

  test('dos envios al mismo lead se desempatan por fecha, del mas nuevo al mas viejo', () => {
    const viejo = fila('Ana', 'X', '2026-08-01T00:00:00Z');
    const nuevo = fila('Ana', 'Y', '2026-08-09T00:00:00Z');

    const ordenado = ordenarHistorial([viejo, nuevo], 'lead', 'asc');

    expect(ordenado.map((f) => f.templateNombre)).toEqual(['Y', 'X']);
  });

  test('el desempate por fecha NO se invierte al invertir la direccion', () => {
    // Con direccion `desc` se invierte el criterio principal -los nombres-, no
    // el desempate: dentro de un mismo lead lo mas nuevo sigue arriba. Si se
    // invirtiera tambien, cambiar el orden de nombres reordenaria por dentro
    // cada grupo sin que nadie lo haya pedido.
    const viejo = fila('Ana', 'X', '2026-08-01T00:00:00Z');
    const nuevo = fila('Ana', 'Y', '2026-08-09T00:00:00Z');

    const ordenado = ordenarHistorial([viejo, nuevo], 'lead', 'desc');

    expect(ordenado.map((f) => f.templateNombre)).toEqual(['Y', 'X']);
  });
});

describe('orden por plantilla', () => {
  test('ordena por el nombre de la plantilla', () => {
    const ordenado = ordenarHistorial([ANA, ZOE, ANGELA], 'plantilla', 'asc');

    expect(ordenado.map((f) => f.templateNombre)).toEqual(['Aviso', 'Bienvenida', 'Cierre']);
  });

  test('los numeros se ordenan como numeros, no como texto', () => {
    // "Paso 10" antes que "Paso 2" es el orden alfabetico y es el que sorprende
    // a todo el mundo. `numeric: true` lo evita.
    const filas = [
      fila('A', 'Paso 10', '2026-08-01T00:00:00Z'),
      fila('B', 'Paso 2', '2026-08-01T00:00:00Z'),
    ];

    const ordenado = ordenarHistorial(filas, 'plantilla', 'asc');

    expect(ordenado.map((f) => f.templateNombre)).toEqual(['Paso 2', 'Paso 10']);
  });
});

describe('la funcion no muta', () => {
  test('el arreglo original queda como estaba', () => {
    // Mutar un arreglo que vino del estado de React deja la lista sin
    // repintar: la referencia no cambio, asi que React no ve nada nuevo.
    const original = [ZOE, ANA, ANGELA];
    const copia = [...original];

    ordenarHistorial(original, 'lead', 'asc');

    expect(original).toEqual(copia);
  });

  test('devuelve un arreglo distinto del que recibio', () => {
    const original = [ANA];

    expect(ordenarHistorial(original, 'fecha', 'desc')).not.toBe(original);
  });
});

describe('catalogo de ordenes', () => {
  test('el valor por defecto existe en el catalogo', () => {
    expect(ORDENES.some((orden) => orden.value === ORDEN_POR_DEFECTO)).toBe(true);
  });

  test('cada valor del catalogo se resuelve a su criterio y direccion', () => {
    for (const orden of ORDENES) {
      expect(ordenPorValor(orden.value)).toEqual({
        criterio: orden.criterio,
        direccion: orden.direccion,
      });
    }
  });

  test('un valor desconocido cae al defecto en vez de romper', () => {
    // Puede llegar de una preferencia guardada por una version anterior.
    expect(ordenPorValor('criterio-que-ya-no-existe')).toEqual({
      criterio: 'fecha',
      direccion: 'desc',
    });
  });

  test('no hay dos opciones con el mismo valor', () => {
    const valores = ORDENES.map((orden) => orden.value);

    expect(new Set(valores).size).toBe(valores.length);
  });
});
