import { describe, expect, test } from 'vitest';
import {
  agruparPorDia,
  claveDeDia,
  diasDeLaGrillaMensual,
  diasDeLaSemana,
  duracionEnMinutos,
  esElMismoDia,
  minutosDesdeMedianoche,
  rangoParaPeriodo,
} from './agendaGrid';

/** Un miercoles, para que la semana tenga dias antes y despues. */
const MIERCOLES = new Date(2026, 7, 26, 15, 30);

describe('claveDeDia', () => {
  test('devuelve aaaa-mm-dd con ceros', () => {
    expect(claveDeDia(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('una fecha ilegible devuelve vacio en vez de romper', () => {
    expect(claveDeDia('no es una fecha')).toBe('');
  });
});

describe('diasDeLaSemana', () => {
  test('arranca el lunes y termina el domingo', () => {
    const semana = diasDeLaSemana(MIERCOLES);
    expect(semana).toHaveLength(7);
    expect(claveDeDia(semana[0]!)).toBe('2026-08-24');
    expect(claveDeDia(semana[6]!)).toBe('2026-08-30');
  });

  /*
   * `getDay()` da 0 para domingo, asi que sin corregir el desplazamiento el
   * domingo empezaria su propia semana. Es el error clasico de esta cuenta.
   */
  test('un domingo pertenece a la semana que ya empezo', () => {
    const domingo = new Date(2026, 7, 30);
    expect(claveDeDia(diasDeLaSemana(domingo)[0]!)).toBe('2026-08-24');
  });

  test('deja las horas en cero', () => {
    expect(diasDeLaSemana(MIERCOLES)[0]!.getHours()).toBe(0);
  });
});

describe('diasDeLaGrillaMensual', () => {
  /*
   * Siempre 42 y no "las que hagan falta": con filas variables la grilla cambia
   * de alto al pasar de mes y todo lo de abajo salta.
   */
  test('siempre son 42 celdas', () => {
    expect(diasDeLaGrillaMensual(2026, 7)).toHaveLength(42);
    expect(diasDeLaGrillaMensual(2026, 1)).toHaveLength(42);
  });

  test('empieza el lunes de la semana del dia 1', () => {
    // El 1 de agosto de 2026 es sabado; su lunes es el 27 de julio.
    expect(claveDeDia(diasDeLaGrillaMensual(2026, 7)[0]!)).toBe('2026-07-27');
  });

  test('cubre el mes entero', () => {
    const claves = diasDeLaGrillaMensual(2026, 7).map(claveDeDia);
    expect(claves).toContain('2026-08-01');
    expect(claves).toContain('2026-08-31');
  });
});

describe('agruparPorDia', () => {
  const cita = (iso: string) => ({ startsAt: iso });

  test('junta las del mismo dia', () => {
    const mapa = agruparPorDia([
      cita(new Date(2026, 7, 26, 9, 0).toISOString()),
      cita(new Date(2026, 7, 26, 15, 0).toISOString()),
      cita(new Date(2026, 7, 27, 9, 0).toISOString()),
    ]);

    expect(mapa.get('2026-08-26')).toHaveLength(2);
    expect(mapa.get('2026-08-27')).toHaveLength(1);
  });

  test('dentro del dia quedan ordenadas por hora', () => {
    const mapa = agruparPorDia([
      cita(new Date(2026, 7, 26, 18, 0).toISOString()),
      cita(new Date(2026, 7, 26, 9, 0).toISOString()),
    ]);

    const delDia = mapa.get('2026-08-26')!;
    expect(new Date(delDia[0]!.startsAt).getHours()).toBe(9);
  });

  test('descarta las que traen una fecha ilegible', () => {
    expect(agruparPorDia([cita('cualquier cosa')]).size).toBe(0);
  });
});

describe('minutosDesdeMedianoche', () => {
  test('cuenta horas y minutos', () => {
    expect(minutosDesdeMedianoche(new Date(2026, 7, 26, 9, 30))).toBe(570);
  });
});

describe('duracionEnMinutos', () => {
  test('usa el fin cuando lo hay', () => {
    const inicio = new Date(2026, 7, 26, 9, 0).toISOString();
    const fin = new Date(2026, 7, 26, 10, 30).toISOString();
    expect(duracionEnMinutos(inicio, fin)).toBe(90);
  });

  /*
   * Sin fin se asumen 30 minutos. Devolver 0 dejaria bloques de alto cero, o
   * sea citas invisibles en la grilla.
   */
  test('sin fin asume media hora', () => {
    expect(duracionEnMinutos(new Date(2026, 7, 26, 9, 0).toISOString())).toBe(30);
  });

  test('un fin anterior al inicio no da una duracion negativa', () => {
    const inicio = new Date(2026, 7, 26, 10, 0).toISOString();
    const fin = new Date(2026, 7, 26, 9, 0).toISOString();
    expect(duracionEnMinutos(inicio, fin)).toBe(30);
  });
});

describe('esElMismoDia', () => {
  test('compara por dia local, no por instante', () => {
    expect(esElMismoDia(new Date(2026, 7, 26, 1, 0), new Date(2026, 7, 26, 23, 0))).toBe(true);
    expect(esElMismoDia(new Date(2026, 7, 26), new Date(2026, 7, 27))).toBe(false);
  });
});

describe('rangoParaPeriodo', () => {
  /*
   * El colchon existe para que mover un mes no dispare una recarga cada vez:
   * sin el, cada flecha parpadea.
   */
  test('agrega una semana a cada lado', () => {
    const { from, to } = rangoParaPeriodo(new Date(2026, 7, 1), new Date(2026, 7, 31));
    expect(from).toBe('2026-07-25');
    expect(to).toBe('2026-09-07');
  });
});
