import { describe, expect, test } from 'vitest';
import {
  applySupportMessageUpdate,
  reconcileIncomingSupportMessage,
  type SupportMessage,
} from './supportService';

function message(overrides: Partial<SupportMessage> = {}): SupportMessage {
  return {
    id: 'm1',
    sender_id: 'user-a',
    receiver_id: 'user-b',
    message: 'hola',
    created_at: '2026-08-12T10:00:00.000Z',
    ...overrides,
  };
}

describe('reconcileIncomingSupportMessage', () => {
  test('agrega un mensaje nuevo al final', () => {
    const actual = reconcileIncomingSupportMessage([message({ id: 'm1' })], message({ id: 'm2' }));

    expect(actual.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  test('sustituye el optimista en su posicion, sin duplicar', () => {
    // El caso que evita el "mensaje fantasma": al enviar se pinta una fila
    // temporal y realtime devuelve la real. Sin esto se verian las dos.
    const current = [
      message({ id: 'm1', message: 'anterior' }),
      message({ id: 'temp-123', message: 'hola' }),
    ];

    const actual = reconcileIncomingSupportMessage(current, message({ id: 'real-1', message: 'hola' }));

    expect(actual).toHaveLength(2);
    expect(actual[1]?.id).toBe('real-1');
  });

  test('respeta el orden al sustituir un optimista que no es el ultimo', () => {
    const current = [
      message({ id: 'temp-1', message: 'primero' }),
      message({ id: 'm2', message: 'segundo' }),
    ];

    const actual = reconcileIncomingSupportMessage(current, message({ id: 'real-1', message: 'primero' }));

    expect(actual.map((m) => m.id)).toEqual(['real-1', 'm2']);
  });

  test('ignora un mensaje que ya esta en la lista', () => {
    // Realtime puede reentregar el mismo evento.
    const current = [message({ id: 'm1' })];

    expect(reconcileIncomingSupportMessage(current, message({ id: 'm1' }))).toEqual(current);
  });

  test('no confunde un mensaje ya confirmado con uno optimista', () => {
    // Mismo texto, pero el existente no es temporal: debe agregarse, no
    // sustituirse. Es lo que pasa cuando alguien escribe dos veces lo mismo.
    const current = [message({ id: 'real-1', message: 'hola' })];

    const actual = reconcileIncomingSupportMessage(current, message({ id: 'real-2', message: 'hola' }));

    expect(actual.map((m) => m.id)).toEqual(['real-1', 'real-2']);
  });

  test('sustituye solo el primer optimista cuando hay dos con el mismo texto', () => {
    const current = [
      message({ id: 'temp-1', message: 'hola' }),
      message({ id: 'temp-2', message: 'hola' }),
    ];

    const actual = reconcileIncomingSupportMessage(current, message({ id: 'real-1', message: 'hola' }));

    expect(actual.map((m) => m.id)).toEqual(['real-1', 'temp-2']);
  });

  test('no muta la lista recibida', () => {
    const current = [message({ id: 'm1' })];
    const copia = [...current];

    reconcileIncomingSupportMessage(current, message({ id: 'm2' }));

    expect(current).toEqual(copia);
  });

  test('funciona sobre una lista vacia', () => {
    expect(reconcileIncomingSupportMessage([], message({ id: 'm1' }))).toHaveLength(1);
  });
});

describe('applySupportMessageUpdate', () => {
  test('reemplaza por id', () => {
    const current = [message({ id: 'm1', is_read: false }), message({ id: 'm2' })];

    const actual = applySupportMessageUpdate(current, message({ id: 'm1', is_read: true }));

    expect(actual[0]?.is_read).toBe(true);
    expect(actual[1]?.id).toBe('m2');
  });

  test('deja la lista igual si el id no esta', () => {
    const current = [message({ id: 'm1' })];

    expect(applySupportMessageUpdate(current, message({ id: 'otro' }))).toEqual(current);
  });

  test('no muta la lista recibida', () => {
    const current = [message({ id: 'm1', is_read: false })];

    applySupportMessageUpdate(current, message({ id: 'm1', is_read: true }));

    expect(current[0]?.is_read).toBe(false);
  });
});
