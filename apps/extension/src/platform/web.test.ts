import { describe, expect, test } from 'vitest';
import { __testing } from './web';

const { parseHash, buildHash } = __testing;

/**
 * El parseo del hash concentra la parte fragil de la navegacion: era una serie
 * de expresiones regulares repartidas por `useLeadsPageController` y
 * `useAgenda`. Al centralizarlo se puede probar, que antes no se podia.
 */
describe('parseHash', () => {
  test('reconoce las rutas simples', () => {
    expect(parseHash('#leads')).toEqual({ name: 'leads' });
    expect(parseHash('#agenda')).toEqual({ name: 'agenda' });
  });

  test('extrae el lead de la ruta de leads', () => {
    expect(parseHash('#leads?lead=abc-123')).toEqual({ name: 'leads', leadId: 'abc-123' });
  });

  test('extrae la cita de la ruta de agenda', () => {
    expect(parseHash('#agenda?appointment=cita-9')).toEqual({
      name: 'agenda',
      appointmentId: 'cita-9',
    });
  });

  test('tolera el hash sin almohadilla', () => {
    expect(parseHash('leads?lead=abc')).toEqual({ name: 'leads', leadId: 'abc' });
  });

  test('devuelve null para hash vacio o desconocido', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#')).toBeNull();
    expect(parseHash('#ajustes')).toBeNull();
  });

  test('ignora parametros que no conoce', () => {
    expect(parseHash('#leads?otro=1')).toEqual({ name: 'leads' });
  });

  test('toma el parametro aunque venga acompañado', () => {
    expect(parseHash('#leads?otro=1&lead=abc')).toEqual({ name: 'leads', leadId: 'abc' });
  });

  test('un parametro vacio no cuenta como valor', () => {
    expect(parseHash('#leads?lead=')).toEqual({ name: 'leads' });
  });
});

describe('buildHash', () => {
  test('genera el formato que la shell ya esperaba', () => {
    // No se cambia el formato a proposito: App.tsx sigue leyendo estos hashes.
    expect(buildHash({ name: 'leads' })).toBe('#leads');
    expect(buildHash({ name: 'leads', leadId: 'abc' })).toBe('#leads?lead=abc');
    expect(buildHash({ name: 'agenda' })).toBe('#agenda');
    expect(buildHash({ name: 'agenda', appointmentId: 'c9' })).toBe('#agenda?appointment=c9');
  });

  test('ida y vuelta estable', () => {
    const rutas = [
      { name: 'leads' as const },
      { name: 'leads' as const, leadId: 'abc-123' },
      { name: 'agenda' as const },
      { name: 'agenda' as const, appointmentId: 'cita-9' },
    ];

    for (const ruta of rutas) {
      expect(parseHash(buildHash(ruta))).toEqual(ruta);
    }
  });
});

describe('parametros adicionales de la ruta de leads', () => {
  test('reconoce el filtro de olvidados', () => {
    expect(parseHash('#leads?filter=olvidados')).toEqual({ name: 'leads', filter: 'olvidados' });
  });

  test('reconoce la accion de lead nuevo', () => {
    expect(parseHash('#leads?action=new')).toEqual({ name: 'leads', action: 'new' });
  });

  test('ignora valores no soportados en filter y action', () => {
    // Evita que una URL manipulada active un modo que no existe.
    expect(parseHash('#leads?filter=inventado&action=borrar')).toEqual({ name: 'leads' });
  });

  test('combina varios parametros', () => {
    expect(parseHash('#leads?lead=abc&filter=olvidados')).toEqual({
      name: 'leads',
      leadId: 'abc',
      filter: 'olvidados',
    });
  });

  test('ida y vuelta con parametros combinados', () => {
    const ruta = { name: 'leads' as const, leadId: 'abc', filter: 'olvidados' as const, action: 'new' as const };
    expect(parseHash(buildHash(ruta))).toEqual(ruta);
  });
});
