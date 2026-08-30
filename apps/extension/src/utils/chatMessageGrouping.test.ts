import { describe, expect, it } from 'vitest';
import { agruparMensajes, etiquetaDeDia, MINUTOS_DE_RACHA } from './chatMessageGrouping';
import type { ChatMessage } from '../types';

const AHORA = new Date('2026-08-25T12:00:00');

function mensaje(parcial: Partial<ChatMessage> & { id: string }): ChatMessage {
  return {
    room_id: 'sala',
    user_id: 'ana',
    content: 'hola',
    created_at: '2026-08-25T10:00:00',
    ...parcial,
  };
}

/** Estrecha el tipo del indice: el test falla con un mensaje util si no hay dia. */
function unicoDia(dias: ReturnType<typeof agruparMensajes>) {
  expect(dias).toHaveLength(1);
  const dia = dias[0];
  if (!dia) throw new Error('se esperaba un dia');
  return dia;
}

/** Minutos despues de las 10:00 del 25, en hora local. */
function alMinuto(minutos: number): string {
  const base = new Date('2026-08-25T10:00:00');
  base.setMinutes(base.getMinutes() + minutos);
  return base.toISOString();
}

describe('etiquetaDeDia', () => {
  it('dice "Hoy" para una fecha del mismo dia calendario', () => {
    expect(etiquetaDeDia('2026-08-25T08:30:00', AHORA)).toBe('Hoy');
  });

  it('dice "Ayer" para el dia anterior', () => {
    expect(etiquetaDeDia('2026-08-24T23:59:00', AHORA)).toBe('Ayer');
  });

  it('usa la fecha larga a partir de dos dias atras', () => {
    expect(etiquetaDeDia('2026-08-23T10:00:00', AHORA)).toBe('23 ago 2026');
  });

  it('cruza el cambio de mes sin romperse', () => {
    const primeroDeSeptiembre = new Date('2026-09-01T09:00:00');
    expect(etiquetaDeDia('2026-08-31T22:00:00', primeroDeSeptiembre)).toBe('Ayer');
  });

  it('devuelve vacio si la fecha no es valida', () => {
    expect(etiquetaDeDia('no-es-una-fecha', AHORA)).toBe('');
  });
});

describe('agruparMensajes', () => {
  it('no devuelve ningun dia para una lista vacia', () => {
    expect(agruparMensajes([], AHORA)).toEqual([]);
  });

  it('junta mensajes seguidos del mismo autor en un grupo', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', created_at: alMinuto(0) }),
        mensaje({ id: '2', created_at: alMinuto(1) }),
        mensaje({ id: '3', created_at: alMinuto(2) }),
      ],
      AHORA
    );

    const dia = unicoDia(dias);
    expect(dia.grupos).toHaveLength(1);
    expect(dia.grupos[0]?.mensajes.map((m) => m.id)).toEqual(['1', '2', '3']);
  });

  it('abre un grupo nuevo cuando cambia el autor', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', user_id: 'ana', created_at: alMinuto(0) }),
        mensaje({ id: '2', user_id: 'beto', created_at: alMinuto(1) }),
        mensaje({ id: '3', user_id: 'ana', created_at: alMinuto(2) }),
      ],
      AHORA
    );

    expect(unicoDia(dias).grupos.map((g) => g.userId)).toEqual(['ana', 'beto', 'ana']);
  });

  it('corta la racha cuando pasan mas minutos de los permitidos', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', created_at: alMinuto(0) }),
        mensaje({ id: '2', created_at: alMinuto(MINUTOS_DE_RACHA + 1) }),
      ],
      AHORA
    );

    expect(unicoDia(dias).grupos).toHaveLength(2);
  });

  it('mantiene la racha justo en el limite', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', created_at: alMinuto(0) }),
        mensaje({ id: '2', created_at: alMinuto(MINUTOS_DE_RACHA) }),
      ],
      AHORA
    );

    expect(unicoDia(dias).grupos).toHaveLength(1);
  });

  it('separa por dia calendario', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', created_at: '2026-08-24T23:58:00' }),
        mensaje({ id: '2', created_at: '2026-08-25T00:01:00' }),
      ],
      AHORA
    );

    expect(dias).toHaveLength(2);
    expect(dias.map((d) => d.etiqueta)).toEqual(['Ayer', 'Hoy']);
  });

  it('deja el anuncio en su propio grupo y no absorbe al siguiente', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', created_at: alMinuto(0) }),
        mensaje({ id: '2', is_announcement: true, created_at: alMinuto(1) }),
        mensaje({ id: '3', created_at: alMinuto(2) }),
      ],
      AHORA
    );

    expect(unicoDia(dias).grupos.map((g) => g.mensajes.map((m) => m.id))).toEqual([
      ['1'],
      ['2'],
      ['3'],
    ]);
  });

  it('deja el aviso del sistema en su propio grupo', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', created_at: alMinuto(0) }),
        mensaje({ id: '2', is_system: true, is_announcement: true, created_at: alMinuto(1) }),
        mensaje({ id: '3', created_at: alMinuto(2) }),
      ],
      AHORA
    );

    expect(unicoDia(dias).grupos.map((g) => g.mensajes.map((m) => m.id))).toEqual([
      ['1'],
      ['2'],
      ['3'],
    ]);
  });

  it('deja el mensaje eliminado en su propio grupo', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: '1', created_at: alMinuto(0) }),
        mensaje({ id: '2', deleted_at: alMinuto(1), created_at: alMinuto(1) }),
        mensaje({ id: '3', created_at: alMinuto(2) }),
      ],
      AHORA
    );

    expect(unicoDia(dias).grupos).toHaveLength(3);
  });

  it('conserva el orden de entrada sin reordenar', () => {
    const dias = agruparMensajes(
      [
        mensaje({ id: 'b', created_at: alMinuto(10) }),
        mensaje({ id: 'a', created_at: alMinuto(0) }),
      ],
      AHORA
    );

    const ids = dias.flatMap((d) => d.grupos.flatMap((g) => g.mensajes.map((m) => m.id)));
    expect(ids).toEqual(['b', 'a']);
  });

  it('identifica cada grupo con el id de su primer mensaje', () => {
    const dias = agruparMensajes([mensaje({ id: 'primero' })], AHORA);
    expect(unicoDia(dias).grupos[0]?.id).toBe('primero');
  });
});
