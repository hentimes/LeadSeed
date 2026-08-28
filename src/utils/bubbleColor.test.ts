import { describe, expect, test } from 'vitest';
import { TOTAL_COLORES_DE_BURBUJA, colorDeBurbuja, indiceDeBurbuja } from './bubbleColor';

describe('indiceDeBurbuja', () => {
  test('siempre cae dentro de la paleta', () => {
    for (let i = 0; i < 500; i++) {
      const indice = indiceDeBurbuja(`usuario-${i}`);
      expect(indice).toBeGreaterThanOrEqual(1);
      expect(indice).toBeLessThanOrEqual(TOTAL_COLORES_DE_BURBUJA);
    }
  });

  /*
   * Esta es la propiedad que justifica que el color se derive del autor en vez
   * de sortearse: si no fuera estable, la conversacion parpadearia.
   */
  test('el mismo autor da siempre el mismo color', () => {
    expect(indiceDeBurbuja('abc-123')).toBe(indiceDeBurbuja('abc-123'));
  });

  test('autores distintos no caen todos en el mismo color', () => {
    const vistos = new Set<number>();
    for (let i = 0; i < 200; i++) vistos.add(indiceDeBurbuja(`usuario-${i}`));
    expect(vistos.size).toBe(TOTAL_COLORES_DE_BURBUJA);
  });

  test('reparte de forma pareja', () => {
    const cuenta = new Map<number, number>();
    const total = 4000;
    for (let i = 0; i < total; i++) {
      const indice = indiceDeBurbuja(`f4a2-${i}-usuario`);
      cuenta.set(indice, (cuenta.get(indice) ?? 0) + 1);
    }

    // Con reparto perfecto tocarian 500 por color. Se admite un margen amplio:
    // lo que se comprueba es que no haya un color que se lleve casi todo.
    const esperado = total / TOTAL_COLORES_DE_BURBUJA;
    for (const [, veces] of cuenta) {
      expect(veces).toBeGreaterThan(esperado * 0.5);
      expect(veces).toBeLessThan(esperado * 1.5);
    }
  });

  test('no devuelve negativos aunque el hash desborde', () => {
    // Cadenas largas hacen desbordar el entero de 32 bits; sin `>>> 0` el resto
    // saldria negativo y la variable CSS no existiria.
    const indice = indiceDeBurbuja('x'.repeat(400));
    expect(indice).toBeGreaterThanOrEqual(1);
  });

  test('la cadena vacia tampoco rompe', () => {
    expect(indiceDeBurbuja('')).toBeGreaterThanOrEqual(1);
  });
});

describe('colorDeBurbuja', () => {
  test('devuelve una variable CSS de la paleta', () => {
    expect(colorDeBurbuja('abc')).toMatch(/^var\(--ls-bubble-[1-8]\)$/);
  });
});
