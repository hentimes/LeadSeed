import { describe, it, expect, vi, afterEach } from 'vitest';
import { todayDate, toIsoLocal, dateInDays } from './appointmentDateTime';

afterEach(() => vi.useRealTimers());

/** El 2 de septiembre de 2026, 21:00 hora local. */
function congelar(): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 2, 21, 0, 0));
}

describe('todayDate', () => {
  /*
   * Con `toISOString().slice(0,10)` la fecha de la noche saltaria al dia
   * siguiente en cualquier zona por detras de UTC, que es la de Chile: a las
   * 21:00 del 2 devolveria el 3.
   */
  it('da el dia local, no el de UTC', () => {
    congelar();
    expect(todayDate()).toBe('2026-09-02');
  });
});

describe('dateInDays', () => {
  it('cuenta desde hoy', () => {
    congelar();
    expect(dateInDays(7)).toBe('2026-09-09');
  });

  it('cruza el cambio de mes', () => {
    congelar();
    expect(dateInDays(30)).toBe('2026-10-02');
  });
});

describe('toIsoLocal', () => {
  /*
   * Quien agenda escribe SU hora. El instante absoluto que se guarda depende
   * de la zona, asi que lo que se comprueba es la ida y vuelta: al volver a
   * leerlo en local tiene que salir la misma hora que se escribio.
   */
  it('conserva la hora local al convertir', () => {
    const iso = toIsoLocal('2026-09-03', '15:30');
    const vuelta = new Date(iso);

    expect(vuelta.getHours()).toBe(15);
    expect(vuelta.getMinutes()).toBe(30);
    expect(vuelta.getDate()).toBe(3);
  });

  it('devuelve un instante absoluto valido', () => {
    expect(Number.isNaN(Date.parse(toIsoLocal('2026-09-03', '09:00')))).toBe(false);
  });
});
