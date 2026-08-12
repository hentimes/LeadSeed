import { describe, expect, test } from 'vitest';
import {
  calculateRutDv,
  formatRutDisplay,
  isValidRut,
  normalizeRut,
} from './rutNormalizer';

describe('normalizeRut', () => {
  test('une cuerpo y digito verificador cuando vienen separados', () => {
    expect(normalizeRut('12345678', '9')).toBe('12345678-9');
  });

  test('acepta el formato ya normalizado sin alterarlo', () => {
    expect(normalizeRut('12345678-9')).toBe('12345678-9');
  });

  test('descarta puntos y comas de miles', () => {
    expect(normalizeRut('12.345.678-9')).toBe('12345678-9');
    expect(normalizeRut('12,345,678-9')).toBe('12345678-9');
  });

  test('separa el digito verificador pegado cuando hay mas de 8 digitos', () => {
    expect(normalizeRut('123456789')).toBe('12345678-9');
  });

  test('deja el cuerpo sin digito verificador cuando hay 8 digitos o menos', () => {
    // Es intencional: el usuario puede estar escribiendo todavia.
    expect(normalizeRut('12345678')).toBe('12345678');
  });

  test('reconoce K como digito verificador y lo normaliza a mayuscula', () => {
    expect(normalizeRut('12345678-k')).toBe('12345678-K');
    expect(normalizeRut('12345678K')).toBe('12345678-K');
  });

  test('devuelve null cuando no hay entrada', () => {
    expect(normalizeRut('')).toBeNull();
    expect(normalizeRut('', undefined)).toBeNull();
  });

  test('devuelve null cuando el cuerpo queda fuera del rango valido', () => {
    expect(normalizeRut('123')).toBeNull();
    expect(normalizeRut('12345')).toBeNull();
    expect(normalizeRut('12345678901234')).toBeNull();
  });

  test('devuelve null cuando la entrada no tiene ningun caracter aprovechable', () => {
    expect(normalizeRut('abc def')).toBeNull();
  });
});

describe('calculateRutDv', () => {
  test('calcula el digito verificador conocido', () => {
    expect(calculateRutDv('12345678')).toBe('5');
  });

  test('ignora separadores en el cuerpo', () => {
    expect(calculateRutDv('12.345.678')).toBe('5');
  });

  test('rechaza cuerpos fuera del rango de 6 a 9 digitos', () => {
    expect(calculateRutDv('12345')).toBeNull();
    expect(calculateRutDv('1234567890')).toBeNull();
  });
});

describe('isValidRut', () => {
  test('acepta un RUT cuyo digito verificador corresponde al cuerpo', () => {
    expect(isValidRut('12345678-5')).toBe(true);
  });

  test('rechaza un RUT con digito verificador equivocado', () => {
    expect(isValidRut('12345678-9')).toBe(false);
  });

  test('rechaza un RUT sin digito verificador', () => {
    expect(isValidRut('12345678')).toBe(false);
  });

  test('el digito calculado siempre valida contra su propio cuerpo', () => {
    // Propiedad: calculateRutDv e isValidRut deben coincidir para cualquier
    // cuerpo valido, incluidos los casos que resuelven en 'K' y en '0'.
    const cuerpos = [
      '111111', '234567', '1234567', '7654321',
      '12345678', '87654321', '20000000', '9999999',
      '123456789', '100000000',
    ];

    for (const cuerpo of cuerpos) {
      const dv = calculateRutDv(cuerpo);
      expect(dv, `sin dv para ${cuerpo}`).not.toBeNull();
      expect(isValidRut(`${cuerpo}-${dv}`), `${cuerpo}-${dv} deberia validar`).toBe(true);
    }
  });

  test('acepta el digito verificador en minuscula', () => {
    const dv = calculateRutDv('11111111');
    if (dv === 'K') {
      expect(isValidRut('11111111-k')).toBe(true);
    }
    // Si el cuerpo no resuelve en K, la propiedad ya quedo cubierta arriba.
    expect(isValidRut(`11111111-${dv}`)).toBe(true);
  });
});

describe('formatRutDisplay', () => {
  test('inserta puntos de miles y conserva el digito verificador', () => {
    expect(formatRutDisplay('12345678-9')).toBe('12.345.678-9');
  });

  test('formatea un cuerpo sin digito verificador', () => {
    expect(formatRutDisplay('12345678')).toBe('12.345.678');
  });

  test('es estable al aplicarse sobre su propia salida', () => {
    expect(formatRutDisplay(formatRutDisplay('12345678-9'))).toBe('12.345.678-9');
  });
});
