import { describe, expect, test } from 'vitest';
import { describeError, getErrorMessage } from './errorMessage';

/** Forma real de un PostgrestError: objeto plano, no instancia de Error. */
const postgrestError = {
  message: 'new row violates row-level security policy',
  code: '42501',
  details: 'Failing row contains (...)',
  hint: 'Revisa la policy de insert',
};

describe('getErrorMessage', () => {
  test('devuelve el mensaje de un Error real', () => {
    expect(getErrorMessage(new Error('algo fallo'), 'generico')).toBe('algo fallo');
  });

  test('devuelve el mensaje de un error plano de Supabase', () => {
    // El caso que motiva este modulo: instanceof Error no lo reconoce y sin
    // esta rama el usuario siempre veria el fallback generico.
    expect(getErrorMessage(postgrestError, 'generico')).toBe(
      'new row violates row-level security policy',
    );
  });

  test('no filtra detalles tecnicos a la interfaz', () => {
    const resultado = getErrorMessage(postgrestError, 'generico');
    expect(resultado).not.toContain('code=');
    expect(resultado).not.toContain('details=');
    expect(resultado).not.toContain('hint=');
  });

  test('cae al fallback cuando el mensaje esta vacio o es solo espacios', () => {
    expect(getErrorMessage(new Error(''), 'generico')).toBe('generico');
    expect(getErrorMessage({ message: '' }, 'generico')).toBe('generico');
    expect(getErrorMessage({ message: '   ' }, 'generico')).toBe('generico');
  });

  test('cae al fallback con valores sin mensaje', () => {
    expect(getErrorMessage(null, 'generico')).toBe('generico');
    expect(getErrorMessage(undefined, 'generico')).toBe('generico');
    expect(getErrorMessage({}, 'generico')).toBe('generico');
    expect(getErrorMessage('texto suelto', 'generico')).toBe('generico');
  });
});

describe('describeError', () => {
  test('concatena los campos tecnicos de un error de Supabase', () => {
    const resultado = describeError(postgrestError);

    expect(resultado).toContain('new row violates row-level security policy');
    expect(resultado).toContain('code=42501');
    expect(resultado).toContain('hint=Revisa la policy de insert');
  });

  test('devuelve el mensaje de un Error real sin adornos', () => {
    expect(describeError(new Error('algo fallo'))).toBe('algo fallo');
  });

  test('serializa un objeto sin campos conocidos en vez de perderlo', () => {
    // Antes esto se registraba como "[object Object]" y no servia de nada.
    expect(describeError({ raro: true })).toBe('{"raro":true}');
  });

  test('no revienta con una referencia circular', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => describeError(circular)).not.toThrow();
  });

  test('describe los valores vacios de forma explicita', () => {
    expect(describeError(null)).toBe('error desconocido');
    expect(describeError(undefined)).toBe('error desconocido');
  });
});
