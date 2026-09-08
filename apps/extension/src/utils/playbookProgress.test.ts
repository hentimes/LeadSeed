import { describe, it, expect } from 'vitest';
import { progresoDe, agruparPorFase } from './playbookProgress';
import type { PlaybookRunItem, PlaybookRunItemState } from '../types';

function item(
  id: string,
  position: number,
  state: PlaybookRunItemState = 'pendiente',
  sectionPosition = 1,
  sectionTitle = 'Fase 1 · Diagnóstico',
): PlaybookRunItem {
  return {
    id,
    runId: 'run-1',
    position,
    title: `Punto ${position}`,
    question: '¿Y bien?',
    sectionTitle,
    sectionPosition,
    state,
    answerType: 'texto',
    options: [],
    sourceRunItemIds: [],
    selections: [],
  };
}

describe('progresoDe', () => {
  /*
   * "8 de 17" cuenta los resueltos, y un "no aplica" ESTA resuelto: la
   * pregunta ya se despacho, aunque fuera para descartarla. Contarlo como
   * pendiente dejaria el contador clavado sin nada que hacer.
   */
  it('los que no aplican cuentan como resueltos', () => {
    const items = [
      item('a', 1, 'hecho'),
      item('b', 2, 'no_aplica'),
      item('c', 3, 'pendiente'),
    ];

    expect(progresoDe(items)).toEqual({
      hechos: 1,
      noAplica: 1,
      resueltos: 2,
      pendientes: 1,
      total: 3,
    });
  });

  it('un recorrido sin empezar no tiene nada resuelto', () => {
    expect(progresoDe([item('a', 1), item('b', 2)])).toMatchObject({ resueltos: 0, pendientes: 2 });
  });

  it('una lista vacia no divide por cero ni inventa un total', () => {
    expect(progresoDe([])).toEqual({
      hechos: 0,
      noAplica: 0,
      resueltos: 0,
      pendientes: 0,
      total: 0,
    });
  });
});

describe('agruparPorFase', () => {
  it('ordena las fases por posicion y no por el orden de llegada', () => {
    const items = [
      item('b', 1, 'pendiente', 2, 'Fase 2 · Propuesta'),
      item('a', 1, 'pendiente', 1, 'Fase 1 · Diagnóstico'),
    ];

    expect(agruparPorFase(items).map((f) => f.position)).toEqual([1, 2]);
  });

  /*
   * Se agrupa por posicion y no por titulo: el titulo es texto que el usuario
   * edita, y dos fases pueden acabar llamandose igual.
   */
  it('dos fases con el mismo titulo no se mezclan', () => {
    const items = [
      item('a', 1, 'pendiente', 1, 'Seguimiento'),
      item('b', 1, 'pendiente', 2, 'Seguimiento'),
    ];

    expect(agruparPorFase(items)).toHaveLength(2);
  });

  it('cada fase trae su propio avance', () => {
    const items = [
      item('a', 1, 'hecho', 1),
      item('b', 2, 'pendiente', 1),
      item('c', 1, 'hecho', 2, 'Fase 2'),
    ];

    const fases = agruparPorFase(items);
    expect(fases.map((fase) => fase.progreso.resueltos)).toEqual([1, 1]);
    expect(fases.map((fase) => fase.progreso.total)).toEqual([2, 1]);
  });
});
