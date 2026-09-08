import { describe, it, expect } from 'vitest';
import {
  luminanciaRelativa,
  textoSobre,
  TEXTO_SOBRE_CLARO,
  TEXTO_SOBRE_OSCURO,
} from './contrasteDeTexto';
import { BRAND, STATE } from '../config/colors';

/** El contraste de WCAG entre dos luminancias, para comprobar el resultado. */
function contraste(a: number, b: number): number {
  const [claro, oscuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (oscuro + 0.05);
}

describe('luminanciaRelativa', () => {
  it('va de 0 en negro a 1 en blanco', () => {
    expect(luminanciaRelativa('#000000')).toBe(0);
    expect(luminanciaRelativa('#ffffff')).toBeCloseTo(1, 5);
  });

  it('acepta el hexadecimal corto y sin almohadilla', () => {
    expect(luminanciaRelativa('#fff')).toBeCloseTo(1, 5);
    expect(luminanciaRelativa('ffffff')).toBeCloseTo(1, 5);
  });

  it('devuelve nulo con un color que no se entiende', () => {
    expect(luminanciaRelativa('rojo')).toBeNull();
    expect(luminanciaRelativa('#12345')).toBeNull();
    expect(luminanciaRelativa('')).toBeNull();
  });

  it('pesa el verde mas que el azul, como el ojo', () => {
    // Es la razon de no promediar los tres canales: con el promedio, estos dos
    // darian lo mismo y el verde saldria "oscuro".
    expect(luminanciaRelativa('#00ff00')!).toBeGreaterThan(luminanciaRelativa('#0000ff')!);
  });
});

describe('textoSobre', () => {
  it('pone texto claro sobre fondos oscuros', () => {
    expect(textoSobre('#000000')).toBe(TEXTO_SOBRE_OSCURO);
    expect(textoSobre(BRAND.primary)).toBe(TEXTO_SOBRE_OSCURO);
  });

  it('pone texto oscuro sobre fondos claros', () => {
    // El caso que motivo todo: un amarillo con texto blanco es ilegible.
    expect(textoSobre('#ffe600')).toBe(TEXTO_SOBRE_CLARO);
    expect(textoSobre('#a7f3d0')).toBe(TEXTO_SOBRE_CLARO);
  });

  it('el color que elija el usuario cumple 4.5:1 con el texto que se elige', () => {
    const colores = [
      '#000000', '#ffffff', '#ffe600', '#a7f3d0', '#0000ff', '#00ff00',
      // El gris medio es el peor caso posible: el fondo que menos contraste
      // deja tanto con blanco como con negro.
      '#808080', '#7f7f7f', BRAND.primary, STATE.success, STATE.warning,
    ];

    for (const fondo of colores) {
      const texto = textoSobre(fondo);
      const razon = contraste(luminanciaRelativa(fondo)!, luminanciaRelativa(texto)!);
      expect(razon, `${fondo} con ${texto}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('un color roto conserva el aspecto de antes en vez de romper la pastilla', () => {
    expect(textoSobre('no-es-un-color')).toBe(TEXTO_SOBRE_OSCURO);
  });
});
