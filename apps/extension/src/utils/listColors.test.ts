import { describe, expect, it } from 'vitest';
import { AVAILABLE_COLORS, elegirColorAlAzar, nombreDeColor } from './listColors';

describe('elegirColorAlAzar', () => {
  it('devuelve un color de la paleta', () => {
    const hex = elegirColorAlAzar();
    expect(AVAILABLE_COLORS.some((color) => color.hex === hex)).toBe(true);
  });

  /*
   * Estos dos son el motivo de que exista la lista de excluidos: un punto
   * blanco desaparece sobre la superficie y uno negro se confunde con el texto.
   * Elegirlos a mano vale; que toquen sin mirar, no.
   */
  it('nunca sortea el blanco ni el negro', () => {
    // Se recorre el rango entero del generador, no una muestra al azar.
    for (let i = 0; i < 100; i++) {
      const hex = elegirColorAlAzar([], () => i / 100);
      expect(hex).not.toBe('#FFFFFF');
      expect(hex).not.toBe('#000000');
    }
  });

  it('es determinista con un generador fijo', () => {
    expect(elegirColorAlAzar([], () => 0)).toBe(elegirColorAlAzar([], () => 0));
  });

  it('evita los colores ya usados', () => {
    const usados = AVAILABLE_COLORS.slice(0, 10).map((color) => color.hex);
    const hex = elegirColorAlAzar(usados, () => 0);
    expect(usados).not.toContain(hex);
  });

  it('si estan todos usados, repite en vez de fallar', () => {
    const todos = AVAILABLE_COLORS.map((color) => color.hex);
    const hex = elegirColorAlAzar(todos, () => 0);
    expect(AVAILABLE_COLORS.some((color) => color.hex === hex)).toBe(true);
  });

  it('con el generador en su tope no se sale del arreglo', () => {
    // `Math.random` nunca devuelve 1, pero un generador inyectado si podria.
    const hex = elegirColorAlAzar([], () => 0.999999);
    expect(AVAILABLE_COLORS.some((color) => color.hex === hex)).toBe(true);
  });
});

describe('nombreDeColor', () => {
  it('devuelve el nombre de un color de la paleta', () => {
    expect(nombreDeColor('#EF4444')).toBe('Rojo Claro');
  });

  it('no falla con un color que no esta en la paleta', () => {
    expect(nombreDeColor('#123456')).toBe('Color personalizado');
  });
});
