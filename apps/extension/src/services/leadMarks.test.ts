import { describe, it, expect } from 'vitest';
import { envioQueSeDeshace } from './leadMarks';
import type { SendLog } from '../types';

function log(id: number, leadId: string, sentAt: string): SendLog {
  return {
    id,
    leadId,
    sentAt,
    templateId: 'plantilla-1',
    templateType: 'whatsapp',
    leadName: 'Alguien',
    leadPhone: '+56900000000',
  };
}

describe('envioQueSeDeshace', () => {
  /*
   * El historial que devuelve la cola es el de la PLANTILLA entera: todos los
   * destinatarios de todas las rondas. Elegir mal aqui borra el envio de otra
   * persona.
   */
  it('elige el envio de ese lead y no el de otro', () => {
    const historial = [
      log(1, 'lead-a', '2026-09-10T14:00:00Z'),
      log(2, 'lead-b', '2026-09-10T15:00:00Z'),
    ];
    expect(envioQueSeDeshace(historial, 'lead-a')).toBe(1);
  });

  it('elige el mas reciente cuando el lead tiene varios', () => {
    const historial = [
      log(1, 'lead-a', '2026-09-01T10:00:00Z'),
      log(2, 'lead-a', '2026-09-10T15:00:00Z'),
      log(3, 'lead-a', '2026-09-05T10:00:00Z'),
    ];
    expect(envioQueSeDeshace(historial, 'lead-a')).toBe(2);
  });

  /*
   * No se toma el ultimo del arreglo: el orden en que llega el historial no es
   * una promesa de nadie, y apoyarse en el rompe el dia que alguien cambie un
   * `order by` en una consulta que parece no tener nada que ver.
   */
  it('no depende del orden del arreglo', () => {
    const alReves = [
      log(2, 'lead-a', '2026-09-10T15:00:00Z'),
      log(1, 'lead-a', '2026-09-01T10:00:00Z'),
    ];
    expect(envioQueSeDeshace(alReves, 'lead-a')).toBe(2);
  });

  it('devuelve null cuando el lead no tiene ningun envio', () => {
    expect(envioQueSeDeshace([log(1, 'lead-b', '2026-09-10T15:00:00Z')], 'lead-a')).toBeNull();
  });

  it('devuelve null con el historial vacio', () => {
    expect(envioQueSeDeshace([], 'lead-a')).toBeNull();
  });

  /* Una fila sin id no se puede borrar; ignorarla es mejor que elegirla y
     mandar un `undefined` a la base. */
  it('ignora las filas sin identificador', () => {
    const sinId = { ...log(0, 'lead-a', '2026-09-10T16:00:00Z') };
    delete (sinId as { id?: number }).id;
    const historial = [sinId, log(7, 'lead-a', '2026-09-10T15:00:00Z')];
    expect(envioQueSeDeshace(historial, 'lead-a')).toBe(7);
  });
});
