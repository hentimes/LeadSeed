import { describe, it, expect } from 'vitest';
import { marcadasDe, opcionesDisponibles, clasificacionesDe, resolverEntrada } from './playbookAnswers';
import type { PlaybookRunItem, PlaybookAnswerType, PlaybookIntentRole, PlaybookSelection } from '../types';

function punto(over: Partial<PlaybookRunItem> & { id: string }): PlaybookRunItem {
  return {
    runId: 'run-1',
    position: 1,
    title: 'Punto',
    question: '¿Y bien?',
    sectionTitle: 'Fase 1',
    sectionPosition: 1,
    state: 'pendiente',
    answerType: 'texto' as PlaybookAnswerType,
    options: [],
    sourceRunItemIds: [],
    selections: [],
    ...over,
  };
}

const CATALOGO = [
  { id: 'precio', label: 'Precio' },
  { id: 'hosp', label: 'Cobertura hospitalaria' },
  { id: 'red', label: 'Red de clínicas' },
];

const si = (...ids: string[]): PlaybookSelection[] => ids.map((id) => ({ id, value: 'si' }));

describe('marcadasDe', () => {
  it('devuelve las marcadas con su etiqueta del catalogo', () => {
    const item = punto({ id: 'p5', options: CATALOGO, selections: si('precio', 'red') });

    expect(marcadasDe(item).map((o) => o.label)).toEqual(['Precio', 'Red de clínicas']);
  });

  /*
   * El "Otro: ___" del cliente viaja con su etiqueta porque no esta en el
   * catalogo. Una frase de confirmacion que omite justo lo que dijo con sus
   * palabras es peor que no tener frase.
   */
  it('conserva lo escrito a mano en el "otro"', () => {
    const item = punto({
      id: 'p5',
      options: CATALOGO,
      selections: [{ id: 'otro-1', value: 'si', label: 'Cobertura dental' }],
    });

    expect(marcadasDe(item)).toEqual([{ id: 'otro-1', label: 'Cobertura dental' }]);
  });

  it('lo no marcado no cuenta', () => {
    const item = punto({ id: 'p5', options: CATALOGO, selections: [] });
    expect(marcadasDe(item)).toEqual([]);
  });
});

describe('opcionesDisponibles', () => {
  it('sin origenes, su propio catalogo', () => {
    const item = punto({ id: 'p5', options: CATALOGO });
    expect(opcionesDisponibles(item, [item])).toEqual(CATALOGO);
  });

  it('con origenes, la union de lo marcado en ellos', () => {
    const p4 = punto({ id: 'p4', options: CATALOGO, selections: si('red') });
    const p5 = punto({ id: 'p5', options: CATALOGO, selections: si('precio') });
    const p7 = punto({ id: 'p7', sourceRunItemIds: ['p4', 'p5'] });

    expect(opcionesDisponibles(p7, [p4, p5, p7]).map((o) => o.id)).toEqual(['red', 'precio']);
  });

  it('lo marcado en dos origenes no se duplica', () => {
    const p4 = punto({ id: 'p4', options: CATALOGO, selections: si('red') });
    const p5 = punto({ id: 'p5', options: CATALOGO, selections: si('red') });
    const p7 = punto({ id: 'p7', sourceRunItemIds: ['p4', 'p5'] });

    expect(opcionesDisponibles(p7, [p4, p5, p7])).toHaveLength(1);
  });

  /*
   * Volver atras y desmarcar deja de ofrecer esa opcion, pero NO borra lo que
   * ya se clasifico: por eso `clasificacionesDe` sigue devolviendola y es el
   * motor quien decide que es huerfana. Volver a marcarla la restaura.
   */
  it('desmarcar arriba deja de ofrecerla abajo', () => {
    const p5 = punto({ id: 'p5', options: CATALOGO, selections: [] });
    const p7 = punto({
      id: 'p7',
      sourceRunItemIds: ['p5'],
      selections: [{ id: 'precio', value: 'indispensable' }],
    });

    expect(opcionesDisponibles(p7, [p5, p7])).toEqual([]);
    expect(clasificacionesDe(p7).get('precio')).toBe('indispensable');
  });
});

describe('clasificacionesDe', () => {
  it('lee los tres estados y descarta lo que no lo es', () => {
    const item = punto({
      id: 'p7',
      selections: [
        { id: 'a', value: 'indispensable' },
        { id: 'b', value: 'flexible' },
        { id: 'c', value: 'prescindible' },
        { id: 'd', value: 'si' },
      ],
    });

    const mapa = clasificacionesDe(item);
    expect([...mapa.entries()]).toEqual([
      ['a', 'indispensable'],
      ['b', 'flexible'],
      ['c', 'prescindible'],
    ]);
  });
});

describe('resolverEntrada', () => {
  const p5 = punto({
    id: 'p5',
    intentRole: 'mejorar' as PlaybookIntentRole,
    options: CATALOGO,
    selections: si('precio', 'hosp', 'red'),
  });
  const p14 = punto({
    id: 'p14',
    intentRole: 'prioridad' as PlaybookIntentRole,
    sourceRunItemIds: ['p5'],
    options: CATALOGO,
    selections: si('hosp'),
  });
  const p7 = punto({
    id: 'p7',
    intentRole: 'importancia' as PlaybookIntentRole,
    sourceRunItemIds: ['p5'],
    selections: [{ id: 'hosp', value: 'indispensable' }],
  });

  it('la prioridad no crea bucket: pone lo elegido primero', () => {
    const cp = punto({ id: 'cp', sourceRunItemIds: ['p5', 'p14', 'p7'] });
    const entrada = resolverEntrada(cp, [p5, p14, p7, cp]);

    expect(entrada?.mejorar.map((o) => o.id)).toEqual(['hosp', 'precio', 'red']);
  });

  it('trae lo clasificable y lo clasificado', () => {
    const cp = punto({ id: 'cp', sourceRunItemIds: ['p5', 'p14', 'p7'] });
    const entrada = resolverEntrada(cp, [p5, p14, p7, cp]);

    expect(entrada?.clasificables.map((o) => o.id)).toEqual(['precio', 'hosp', 'red']);
    expect(entrada?.importancia.get('hosp')).toBe('indispensable');
  });

  /*
   * Sin los roles que hacen falta se devuelve null y la pantalla pinta "todavia
   * falta responder", en vez de una frase a medias.
   */
  it('sin fuentes con rol devuelve null', () => {
    const suelto = punto({ id: 'x' });
    const cp = punto({ id: 'cp', sourceRunItemIds: ['x'] });

    expect(resolverEntrada(cp, [suelto, cp])).toBeNull();
  });

  it('un checkpoint sin fuentes declaradas tambien devuelve null', () => {
    const cp = punto({ id: 'cp' });
    expect(resolverEntrada(cp, [p5, cp])).toBeNull();
  });
});
