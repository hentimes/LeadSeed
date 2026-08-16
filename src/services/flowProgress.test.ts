import { describe, expect, test } from 'vitest';
import { computeFlowProgress, tocaAhora } from './flowProgress';
import type { FlowStepStatus, MessageFlowProgress, MessageFlowStep } from '../types';

function paso(id: number, stepOrder: number): MessageFlowStep {
  return { id, flowId: 'f1', stepOrder, templateId: 't' + id, waitDays: 0 };
}

function fila(stepId: number, status: FlowStepStatus, dueAt?: string): MessageFlowProgress {
  return { id: stepId * 10, enrollmentId: 1, stepId, status, ...(dueAt ? { dueAt } : {}) };
}

describe('computeFlowProgress', () => {
  const tres = [paso(1, 1), paso(2, 2), paso(3, 3)];

  test('sin nada registrado, el siguiente es el primero', () => {
    const r = computeFlowProgress(tres, []);

    expect(r.completados).toBe(0);
    expect(r.total).toBe(3);
    expect(r.siguiente?.stepOrder).toBe(1);
    expect(r.terminado).toBe(false);
  });

  test('cuenta los registrados y apunta al primero sin resolver', () => {
    const r = computeFlowProgress(tres, [fila(1, 'registrado')]);

    expect(r.completados).toBe(1);
    expect(r.siguiente?.stepOrder).toBe(2);
  });

  test('un paso omitido cuenta como resuelto, no bloquea la secuencia', () => {
    const r = computeFlowProgress(tres, [fila(1, 'registrado'), fila(2, 'omitido')]);

    expect(r.completados).toBe(2);
    expect(r.siguiente?.stepOrder).toBe(3);
  });

  test('un paso fallido tampoco bloquea: el flujo sigue', () => {
    const r = computeFlowProgress(tres, [fila(1, 'fallido')]);

    expect(r.completados).toBe(1);
    expect(r.siguiente?.stepOrder).toBe(2);
  });

  test('con todos resueltos queda terminado y sin siguiente', () => {
    const r = computeFlowProgress(tres, [
      fila(1, 'registrado'),
      fila(2, 'registrado'),
      fila(3, 'registrado'),
    ]);

    expect(r.terminado).toBe(true);
    expect(r.siguiente).toBeNull();
    expect(r.estadoSiguiente).toBeNull();
  });

  test('ordena por stepOrder y no por el orden en que llegan', () => {
    // Un flujo se puede reordenar despues de haber inscrito gente.
    const desordenados = [paso(3, 3), paso(1, 1), paso(2, 2)];
    const r = computeFlowProgress(desordenados, [fila(1, 'registrado')]);

    expect(r.siguiente?.stepOrder).toBe(2);
  });

  test('un paso sin fila de progreso cuenta como pendiente, no como hecho', () => {
    // Pasa al agregar un paso a un flujo que ya tiene inscritos.
    const r = computeFlowProgress(tres, [fila(1, 'registrado'), fila(3, 'registrado')]);

    expect(r.completados).toBe(2);
    expect(r.siguiente?.stepOrder).toBe(2);
    expect(r.estadoSiguiente).toBe('pendiente');
    expect(r.terminado).toBe(false);
  });

  test('un hueco al final no se da por terminado', () => {
    const r = computeFlowProgress(tres, [fila(1, 'registrado'), fila(2, 'registrado')]);

    expect(r.terminado).toBe(false);
    expect(r.siguiente?.stepOrder).toBe(3);
  });

  test('un flujo sin pasos no esta terminado: no hay nada que terminar', () => {
    const r = computeFlowProgress([], []);

    expect(r.total).toBe(0);
    expect(r.terminado).toBe(false);
    expect(r.siguiente).toBeNull();
  });

  test('expone el vencimiento del paso siguiente', () => {
    const r = computeFlowProgress(tres, [
      fila(1, 'registrado'),
      fila(2, 'pendiente', '2026-08-20T10:00:00Z'),
    ]);

    expect(r.venceAt).toBe('2026-08-20T10:00:00Z');
  });

  test('ignora filas de progreso de pasos que ya no existen', () => {
    // El paso se borro de la definicion pero su progreso quedo.
    const r = computeFlowProgress([paso(1, 1)], [fila(1, 'registrado'), fila(99, 'registrado')]);

    expect(r.completados).toBe(1);
    expect(r.total).toBe(1);
    expect(r.terminado).toBe(true);
  });
});

describe('tocaAhora', () => {
  const ahora = new Date('2026-08-16T12:00:00Z');
  const tres = [paso(1, 1), paso(2, 2)];

  test('el estado "toca" manda sobre la fecha', () => {
    const r = computeFlowProgress(tres, [fila(1, 'toca')]);

    expect(tocaAhora(r, ahora)).toBe(true);
  });

  test('pendiente con vencimiento pasado si toca', () => {
    const r = computeFlowProgress(tres, [fila(1, 'pendiente', '2026-08-15T00:00:00Z')]);

    expect(tocaAhora(r, ahora)).toBe(true);
  });

  test('pendiente con vencimiento futuro no toca', () => {
    const r = computeFlowProgress(tres, [fila(1, 'pendiente', '2026-08-20T00:00:00Z')]);

    expect(tocaAhora(r, ahora)).toBe(false);
  });

  test('sin fecha no se afirma que toque', () => {
    // Preferimos no mostrarlo a mostrarlo sin saber.
    const r = computeFlowProgress(tres, [fila(1, 'pendiente')]);

    expect(tocaAhora(r, ahora)).toBe(false);
  });

  test('un flujo terminado nunca toca', () => {
    const r = computeFlowProgress([paso(1, 1)], [fila(1, 'registrado')]);

    expect(tocaAhora(r, ahora)).toBe(false);
  });
});
