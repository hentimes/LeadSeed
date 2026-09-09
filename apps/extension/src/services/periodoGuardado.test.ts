import { describe, it, expect } from 'vitest';
import { periodoGuardado } from './appSettingsService';

/*
 * Hasta la migracion 177 el ajuste decia contra que comparar; ahora dice que
 * ventana mostrar. Los perfiles que ya existen tienen guardado el valor viejo,
 * y sin traducirlo el selector arrancaria vacio y el panel pediria un periodo
 * que el RPC no entiende.
 */
describe('periodoGuardado', () => {
  it('traduce cada valor viejo a la ventana de su mismo tamano', () => {
    expect(periodoGuardado('yesterday')).toBe('today');
    expect(periodoGuardado('lastWeek')).toBe('last7');
    expect(periodoGuardado('lastMonth')).toBe('last30');
    expect(periodoGuardado('lastQuarter')).toBe('last90');
    expect(periodoGuardado('lastHalf')).toBe('last180');
    expect(periodoGuardado('lastYear')).toBe('last365');
  });

  it('deja pasar los valores nuevos sin tocarlos', () => {
    expect(periodoGuardado('today')).toBe('today');
    expect(periodoGuardado('last30')).toBe('last30');
    expect(periodoGuardado('last365')).toBe('last365');
  });

  it('cae a hoy con un perfil sin el ajuste', () => {
    expect(periodoGuardado(null)).toBe('today');
    expect(periodoGuardado(undefined)).toBe('today');
    expect(periodoGuardado('')).toBe('today');
  });

  /* Un valor escrito a mano en la base, o de una version futura. */
  it('cae a hoy con un valor desconocido, en vez de romper el selector', () => {
    expect(periodoGuardado('la semana que viene')).toBe('today');
  });
});
