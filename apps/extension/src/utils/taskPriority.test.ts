import { describe, expect, test } from 'vitest';
import { cuadranteDe, esUrgente, explicarUrgencia } from './taskPriority';

/** Un instante fijo, para que nada dependa del reloj de quien corre los tests. */
const AHORA = new Date('2026-08-28T12:00:00.000Z').getTime();
const UN_DIA = 86400000;

const tarea = (dias: number | null, importante = false) => ({
  fechaVencimiento: dias === null ? '' : new Date(AHORA + dias * UN_DIA).toISOString(),
  importante,
});

describe('esUrgente', () => {
  test('una tarea vencida es urgente', () => {
    expect(esUrgente(tarea(-5), AHORA)).toBe(true);
  });

  test('una que vence manana es urgente', () => {
    expect(esUrgente(tarea(1), AHORA)).toBe(true);
  });

  test('una que vence en una semana no lo es', () => {
    expect(esUrgente(tarea(7), AHORA)).toBe(false);
  });

  /*
   * No tener plazo es lo contrario de que apremie. Si esto devolviera `true`,
   * toda tarea nueva sin fecha nacería en la mitad urgente de la matriz.
   */
  test('sin fecha no es urgente', () => {
    expect(esUrgente(tarea(null), AHORA)).toBe(false);
  });

  test('una fecha ilegible no vuelve urgente a nadie', () => {
    expect(esUrgente({ fechaVencimiento: 'no es una fecha', importante: false }, AHORA)).toBe(false);
  });
});

describe('cuadranteDe', () => {
  test('urgente e importante va a hacer', () => {
    expect(cuadranteDe(tarea(1, true), AHORA)).toBe('hacer');
  });

  test('importante pero lejana va a programar', () => {
    expect(cuadranteDe(tarea(30, true), AHORA)).toBe('programar');
  });

  test('urgente sin importancia va a despachar', () => {
    expect(cuadranteDe(tarea(-1, false), AHORA)).toBe('despachar');
  });

  test('ni urgente ni importante va a eliminar', () => {
    expect(cuadranteDe(tarea(null, false), AHORA)).toBe('eliminar');
  });

  /*
   * La propiedad que sostiene a la matriz: cada tarea cae en UNA casilla, y las
   * cuatro juntas no dejan ninguna afuera.
   */
  test('toda combinacion cae en exactamente un cuadrante', () => {
    const casos = [tarea(-1, true), tarea(1, false), tarea(90, true), tarea(null, false)];
    const cuadrantes = casos.map((caso) => cuadranteDe(caso, AHORA));
    expect(new Set(cuadrantes).size).toBe(4);
  });
});

describe('explicarUrgencia', () => {
  test('lo dice cuando ya vencio', () => {
    expect(explicarUrgencia(tarea(-2).fechaVencimiento, AHORA)).toContain('venció');
  });

  test('lo dice cuando vence pronto', () => {
    expect(explicarUrgencia(tarea(1).fechaVencimiento, AHORA)).toContain('urgente');
  });

  test('lo dice cuando todavia falta', () => {
    expect(explicarUrgencia(tarea(10).fechaVencimiento, AHORA)).toContain('todavía no');
  });

  test('lo dice cuando no hay fecha', () => {
    expect(explicarUrgencia('', AHORA)).toContain('Sin fecha');
  });
});
