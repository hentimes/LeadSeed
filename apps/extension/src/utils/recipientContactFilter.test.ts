import { describe, it, expect } from 'vitest';
import {
  CONTACTOS_DESTINATARIO,
  filtrarPorContacto,
  recibioMensaje,
} from './recipientContactFilter';
import type { LeadSendSummary } from '../services/historyService';

function resumen(templateIds: string[], total = templateIds.length || 1): LeadSendSummary {
  return {
    total,
    lastSentAt: '2026-09-01T10:00:00Z',
    lastTemplateId: templateIds[templateIds.length - 1] ?? null,
    lastTemplateName: null,
    lastTemplateType: 'whatsapp',
    templateIds,
  };
}

const ANA = { id: 'a', name: 'Ana' };
const BRUNO = { id: 'b', name: 'Bruno' };
const ZOE = { id: 'z', name: 'Zoe' };

/** Ana recibio la primera; Bruno la primera y la segunda; Zoe nada. */
const RESUMEN = new Map<string, LeadSendSummary>([
  ['a', resumen(['t1'])],
  ['b', resumen(['t1', 't2'])],
]);

describe('recibioMensaje', () => {
  it('sin resumen no recibio nada', () => {
    expect(recibioMensaje(undefined, null)).toBe(false);
    expect(recibioMensaje(undefined, 't1')).toBe(false);
  });

  it('un resumen en cero no cuenta como contacto', () => {
    expect(recibioMensaje(resumen([], 0), null)).toBe(false);
  });

  it('con plantilla nula alcanza con haber recibido algo', () => {
    expect(recibioMensaje(resumen(['t9']), null)).toBe(true);
  });

  it('mira TODAS las plantillas, no solo la ultima', () => {
    const dos = resumen(['t1', 't2']);

    expect(recibioMensaje(dos, 't1')).toBe(true);
    expect(recibioMensaje(dos, 't2')).toBe(true);
    expect(recibioMensaje(dos, 't3')).toBe(false);
  });
});

describe('filtrarPorContacto', () => {
  const leads = [ANA, BRUNO, ZOE];

  it('"todos" devuelve el mismo arreglo sin tocarlo', () => {
    expect(filtrarPorContacto(leads, 'todos', null, RESUMEN)).toEqual(leads);
  });

  it('separa contactados de no contactados', () => {
    expect(filtrarPorContacto(leads, 'contactados', null, RESUMEN).map((l) => l.name)).toEqual([
      'Ana',
      'Bruno',
    ]);
    expect(filtrarPorContacto(leads, 'sin-contactar', null, RESUMEN).map((l) => l.name)).toEqual([
      'Zoe',
    ]);
  });

  it('con una plantilla elegida, "sin escribir" son los que no la recibieron', () => {
    // Bruno ya recibio t2; Ana y Zoe no, aunque Ana ya recibio otra cosa.
    expect(filtrarPorContacto(leads, 'sin-contactar', 't2', RESUMEN).map((l) => l.name)).toEqual([
      'Ana',
      'Zoe',
    ]);
  });

  it('con una plantilla elegida, "ya escritos" son solo los que la recibieron', () => {
    expect(filtrarPorContacto(leads, 'contactados', 't1', RESUMEN).map((l) => l.name)).toEqual([
      'Ana',
      'Bruno',
    ]);
    expect(filtrarPorContacto(leads, 'contactados', 't2', RESUMEN).map((l) => l.name)).toEqual([
      'Bruno',
    ]);
  });

  it('un lead sin id nunca cuenta como contactado', () => {
    const anonimo = { id: undefined, name: 'Sin id' };

    expect(filtrarPorContacto([anonimo], 'contactados', null, RESUMEN)).toEqual([]);
    expect(filtrarPorContacto([anonimo], 'sin-contactar', null, RESUMEN)).toEqual([anonimo]);
  });

  it('no muta el arreglo original', () => {
    const original = [...leads];
    filtrarPorContacto(leads, 'contactados', null, RESUMEN);

    expect(leads).toEqual(original);
  });
});

describe('CONTACTOS_DESTINATARIO', () => {
  it('empieza por "todos", que es el valor por defecto', () => {
    expect(CONTACTOS_DESTINATARIO[0]?.value).toBe('todos');
  });
});
