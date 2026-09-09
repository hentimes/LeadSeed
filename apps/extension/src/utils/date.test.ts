import { describe, it, expect } from 'vitest';
import {
  formatearFecha,
  formatearHora,
  formatearFechaHora,
  formatearFechaLarga,
  formatearFechaCorta,
} from './date';

const ISO = '2026-08-19T14:05:00';

describe('formatearFecha', () => {
  it('usa el orden dia-mes-ano de es-CL', () => {
    expect(formatearFecha(ISO)).toBe('19-08-2026');
  });

  it('acepta un Date igual que una cadena', () => {
    expect(formatearFecha(new Date(ISO))).toBe(formatearFecha(ISO));
  });

  it('no inventa nada cuando el valor falta', () => {
    expect(formatearFecha(null)).toBe('');
    expect(formatearFecha(undefined)).toBe('');
    expect(formatearFecha('')).toBe('');
  });

  it('devuelve vacio en vez de "Invalid Date" cuando el dato es basura', () => {
    expect(formatearFecha('no soy una fecha')).toBe('');
  });
});

describe('formatearHora', () => {
  it('usa reloj de 24 horas', () => {
    expect(formatearHora(ISO)).toBe('14:05');
  });

  it('rellena la hora con cero a la izquierda', () => {
    expect(formatearHora('2026-08-19T09:07:00')).toBe('09:07');
  });

  it('devuelve vacio si no hay dato', () => {
    expect(formatearHora(null)).toBe('');
  });
});

describe('formatearFechaHora', () => {
  it('junta fecha y hora con un espacio', () => {
    expect(formatearFechaHora(ISO)).toBe('19-08-2026 14:05');
  });

  it('devuelve vacio si no hay dato, sin dejar el espacio suelto', () => {
    expect(formatearFechaHora(null)).toBe('');
  });
});

describe('formatearFechaLarga', () => {
  it('escribe el mes en palabra', () => {
    expect(formatearFechaLarga(ISO)).toMatch(/19.*ago.*2026/);
  });

  it('devuelve vacio si no hay dato', () => {
    expect(formatearFechaLarga(null)).toBe('');
  });
});

describe('formatearFechaCorta', () => {
  it('da dia, mes corto y hora, sin ano', () => {
    const resultado = formatearFechaCorta(ISO);

    expect(resultado).toMatch(/19/);
    expect(resultado).toMatch(/ago/);
    expect(resultado).toMatch(/14:05/);
  });

  /*
   * El ano se omite a proposito: es para cosas que pasan dentro de las
   * proximas horas o dias, donde "2026" no aporta y ocupa.
   */
  it('no incluye el ano', () => {
    expect(formatearFechaCorta(ISO)).not.toMatch(/2026/);
  });

  it('usa reloj de 24 horas', () => {
    expect(formatearFechaCorta('2026-08-19T20:30:00')).toMatch(/20:30/);
  });

  it('devuelve vacio si no hay dato', () => {
    expect(formatearFechaCorta(null)).toBe('');
    expect(formatearFechaCorta('no es una fecha')).toBe('');
  });
});
