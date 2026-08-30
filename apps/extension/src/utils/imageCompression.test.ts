import { describe, expect, it } from 'vitest';
import { ESCALERA_DE_CALIDAD, scaledSize } from './imageCompression';

/*
 * Solo se prueba la parte pura. La codificacion depende de `canvas.toBlob`, que
 * el entorno de test no implementa de verdad: un test ahi comprobaria el doble,
 * no el navegador.
 */

describe('scaledSize', () => {
  it('no agranda una imagen que ya entra', () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('respeta el limite justo', () => {
    expect(scaledSize(1280, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it('achica por el lado mas largo conservando la proporcion', () => {
    const r = scaledSize(3840, 2160);
    expect(r.width).toBe(1280);
    expect(r.height).toBe(720);
    expect(r.width / r.height).toBeCloseTo(3840 / 2160, 5);
  });

  it('achica igual de bien una imagen vertical', () => {
    const r = scaledSize(1000, 4000);
    expect(r.height).toBe(1280);
    expect(r.width).toBe(320);
  });

  it('acepta un tope distinto al de por defecto', () => {
    expect(scaledSize(3840, 2160, 640)).toEqual({ width: 640, height: 360 });
  });

  /*
   * El peso escala con el area. Este test fija por que el tope es 1280 y no
   * 1920: no es una preferencia, es que 1920 son 2,25 veces los pixeles para un
   * contenedor que a 2x de densidad necesita 1096.
   */
  it('a 1280 el area es menos de la mitad que a 1920', () => {
    const a1280 = scaledSize(4000, 3000, 1280);
    const a1920 = scaledSize(4000, 3000, 1920);

    const area = (s: { width: number; height: number }) => s.width * s.height;
    expect(area(a1280) / area(a1920)).toBeLessThan(0.5);
  });
});

describe('ESCALERA_DE_CALIDAD', () => {
  it('va siempre de mayor a menor', () => {
    const ordenada = [...ESCALERA_DE_CALIDAD].sort((a, b) => b - a);
    expect(ESCALERA_DE_CALIDAD).toEqual(ordenada);
  });

  it('no baja de 0.55, donde los artefactos se ven en capturas con texto', () => {
    expect(Math.min(...ESCALERA_DE_CALIDAD)).toBeGreaterThanOrEqual(0.55);
  });

  it('está acotada: como mucho cuatro reintentos', () => {
    expect(ESCALERA_DE_CALIDAD.length).toBeLessThanOrEqual(4);
  });
});
