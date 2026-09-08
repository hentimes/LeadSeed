import { describe, it, expect } from 'vitest';
import {
  comienzoDelDia,
  diasQueAbarca,
  estadoDelCupo,
  mismoDia,
  repartirEnDias,
  type PasoProgramable,
} from './whatsappQuota';

/** Un jueves a las 10:00, hora local del que corre el test. */
const AHORA = new Date(2026, 8, 10, 10, 0, 0);

function pasos(cuantos: number, desde = new Date(2026, 8, 10, 9, 0, 0)): PasoProgramable[] {
  return Array.from({ length: cuantos }, (_, i) => ({
    progressId: i + 1,
    // Todos vencen el mismo dia, un minuto detras del anterior: es el caso que
    // motiva todo -dos flujos que caen juntos-.
    dueAt: new Date(desde.getTime() + i * 60000).toISOString(),
  }));
}

describe('estadoDelCupo', () => {
  it('dice cuanto queda', () => {
    expect(estadoDelCupo(34, 50)).toEqual({ usados: 34, tope: 50, quedan: 16, agotado: false });
  });

  it('al llegar justo al tope ya esta agotado', () => {
    expect(estadoDelCupo(50, 50).agotado).toBe(true);
    expect(estadoDelCupo(50, 50).quedan).toBe(0);
  });

  it('pasarse no deja un numero rojo', () => {
    // Mostrar "-12" invita a pensar que hay que recuperarlos; lo unico que hay
    // que hacer es parar.
    expect(estadoDelCupo(62, 50).quedan).toBe(0);
    expect(estadoDelCupo(62, 50).agotado).toBe(true);
  });

  it('un tope negativo se trata como cero', () => {
    expect(estadoDelCupo(0, -5)).toEqual({ usados: 0, tope: 0, quedan: 0, agotado: true });
  });
});

describe('repartirEnDias', () => {
  it('si todo cabe hoy, no mueve nada', () => {
    // Cero movimientos y no "cero dias": no hay nada que repartir.
    expect(repartirEnDias(pasos(10), 50, 50, AHORA)).toEqual([]);
  });

  it('reparte de a topes por dia', () => {
    const movimientos = repartirEnDias(pasos(120), 50, 50, AHORA);

    // Los primeros 50 se quedan hoy y no se anotan; los otros 70 se mueven.
    expect(movimientos).toHaveLength(70);
    expect(new Date(movimientos[0]!.dueAt).getDate()).toBe(11);
    expect(new Date(movimientos[49]!.dueAt).getDate()).toBe(11);
    expect(new Date(movimientos[50]!.dueAt).getDate()).toBe(12);
  });

  it('el primer dia solo admite lo que queda del cupo de hoy', () => {
    // Ya mandaste 40 de 50: hoy entran diez y el resto se corre.
    const movimientos = repartirEnDias(pasos(30), 50, 10, AHORA);

    expect(movimientos).toHaveLength(20);
    expect(new Date(movimientos[0]!.dueAt).getDate()).toBe(11);
  });

  it('con el cupo de hoy agotado, todo empieza mañana', () => {
    const movimientos = repartirEnDias(pasos(3), 50, 0, AHORA);

    expect(movimientos).toHaveLength(3);
    for (const movimiento of movimientos) {
      expect(new Date(movimiento.dueAt).getDate()).toBe(11);
    }
  });

  it('reparte del vencimiento mas viejo al mas nuevo', () => {
    // Quien lleva mas tiempo esperando sale antes: es la misma regla que la
    // cola de envio, y romperla aqui cambiaria el orden de la fila.
    const viejo = { progressId: 1, dueAt: new Date(2026, 8, 1, 9, 0).toISOString() };
    const nuevo = { progressId: 2, dueAt: new Date(2026, 8, 10, 9, 0).toISOString() };

    const movimientos = repartirEnDias([nuevo, viejo], 1, 1, AHORA);

    // Con cupo 1 y un sitio hoy, el viejo se queda hoy y el nuevo se corre.
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0]!.progressId).toBe(2);
  });

  it('a un paso atrasado que cabe hoy no se le borra el atraso', () => {
    // Le tocaria "hoy a las 10:00", pero venia del 1 de septiembre. Moverlo
    // dejaria de decir "Atrasado 9d", que es el dato con el que se decide a
    // quien escribirle primero. Repartir descongestiona el futuro, no blanquea
    // el pasado.
    const atrasado = { progressId: 1, dueAt: new Date(2026, 8, 1, 9, 0).toISOString() };

    expect(repartirEnDias([atrasado], 50, 50, AHORA)).toEqual([]);
  });

  it('no mueve a medianoche, mueve a la hora en que se reparte', () => {
    // A medianoche todo aparece como atrasado en cuanto empieza el dia.
    const movimientos = repartirEnDias(pasos(2), 1, 1, AHORA);

    expect(new Date(movimientos[0]!.dueAt).getHours()).toBe(AHORA.getHours());
  });

  it('cruza el cambio de mes sin ayuda', () => {
    const fin = new Date(2026, 8, 30, 10, 0, 0);
    const movimientos = repartirEnDias(pasos(3, new Date(2026, 8, 30, 9, 0)), 1, 1, fin);

    expect(new Date(movimientos[1]!.dueAt).getMonth()).toBe(9);
  });

  it('no adelanta un paso que ya estaba programado mas adelante', () => {
    // Si el 20 ya estaba puesto, que sobre sitio el 12 no es motivo para
    // mandarselo antes de tiempo.
    const futuro = { progressId: 1, dueAt: new Date(2026, 8, 20, 9, 0).toISOString() };
    const hoy = { progressId: 2, dueAt: new Date(2026, 8, 10, 9, 0).toISOString() };

    const movimientos = repartirEnDias([hoy, futuro], 1, 1, AHORA);

    // `hoy` se queda en el dia 0; a `futuro` le tocaria el 11, que es antes del
    // 20 en el que ya estaba: no se mueve.
    expect(movimientos).toEqual([]);
  });

  it('un tope de cero no reparte nada, en vez de repartir infinito', () => {
    // Sin esta guarda el bucle que busca sitio no termina nunca.
    expect(repartirEnDias(pasos(5), 0, 0, AHORA)).toEqual([]);
  });

  it('no muta el arreglo original', () => {
    const originales = pasos(5);
    const copia = [...originales];

    repartirEnDias(originales, 1, 1, AHORA);

    expect(originales).toEqual(copia);
  });
});

describe('diasQueAbarca', () => {
  it('sin movimientos son cero dias', () => {
    expect(diasQueAbarca([], AHORA)).toBe(0);
  });

  it('cuenta hasta el ultimo dia usado', () => {
    const movimientos = repartirEnDias(pasos(120), 50, 50, AHORA);

    // 50 hoy, 50 mañana, 20 pasado: el ultimo es dentro de dos dias.
    expect(diasQueAbarca(movimientos, AHORA)).toBe(2);
  });
});

describe('comienzoDelDia y mismoDia', () => {
  it('el dia empieza a medianoche local', () => {
    const inicio = comienzoDelDia(AHORA);

    expect(inicio.getHours()).toBe(0);
    expect(inicio.getDate()).toBe(AHORA.getDate());
  });

  it('distingue dos instantes del mismo dia de dos dias distintos', () => {
    expect(mismoDia(new Date(2026, 8, 10, 1, 0), new Date(2026, 8, 10, 23, 0))).toBe(true);
    expect(mismoDia(new Date(2026, 8, 10, 23, 0), new Date(2026, 8, 11, 1, 0))).toBe(false);
  });
});
