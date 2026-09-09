import { describe, it, expect } from 'vitest';
import { porcentaje } from './porcentaje';

describe('porcentaje', () => {
  /* El caso que lo motiva: 1 convertido de 1936 daba "0%" en una tarjeta y
     "0.1%" en la tabla de al lado. */
  it('no aplasta a cero el primer convertido', () => {
    expect(porcentaje(1, 1936)).toBe('0.1');
  });

  it('devuelve cero solo cuando de verdad no hubo ninguno', () => {
    expect(porcentaje(0, 1936)).toBe('0');
  });

  it('redondea a entero a partir del uno por ciento', () => {
    expect(porcentaje(50, 1000)).toBe('5');
    expect(porcentaje(126, 1000)).toBe('13');
  });

  it('usa un decimal por debajo del uno por ciento', () => {
    expect(porcentaje(4, 1000)).toBe('0.4');
  });

  it('aguanta un total de cero sin dividir por cero', () => {
    expect(porcentaje(0, 0)).toBe('0');
    expect(porcentaje(5, 0)).toBe('0');
  });

  it('llega a cien', () => {
    expect(porcentaje(10, 10)).toBe('100');
  });
});
