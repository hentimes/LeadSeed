import { describe, it, expect } from 'vitest';
import { indexarPuntos, ofertaParaLead, venceAlRetomar, type PuntoDeRetoma } from './flowResume';

const PUNTO = (ultimoPasoHecho: number, ultimoEnvioAt = '2026-09-01T10:00:00Z'): PuntoDeRetoma => ({
  leadId: 'lead-1',
  ultimoPasoHecho,
  ultimoEnvioAt,
});

describe('ofertaParaLead', () => {
  it('sin ningun envio del flujo, se inscribe desde el principio', () => {
    expect(ofertaParaLead(undefined, 3)).toEqual({ tipo: 'desde-el-inicio' });
  });

  it('con el paso 1 ya recibido, retoma desde el 2', () => {
    // El caso que motiva todo: el flujo se arma despues de haber escrito a
    // mano, asi que media agenda ya recibio el primer mensaje.
    expect(ofertaParaLead(PUNTO(1), 3)).toEqual({
      tipo: 'retomar',
      ultimoPasoHecho: 1,
      siguientePaso: 2,
      desde: '2026-09-01T10:00:00Z',
    });
  });

  it('con el ultimo paso ya recibido, no hay nada que retomar', () => {
    // Inscribirlo "por donde va" lo cerraria como completado en el acto: una
    // inscripcion que no manda nada. Repetir el flujo entero es otra decision,
    // y la tiene que pedir el usuario.
    expect(ofertaParaLead(PUNTO(3), 3)).toEqual({
      tipo: 'ya-los-recibio-todos',
      desde: '2026-09-01T10:00:00Z',
    });
  });

  it('el total lo pone el flujo, no el punto de retoma', () => {
    // Mismo lead, mismo dato: terminado en un flujo de dos, a medias en uno de
    // cuatro.
    expect(ofertaParaLead(PUNTO(2), 2).tipo).toBe('ya-los-recibio-todos');
    expect(ofertaParaLead(PUNTO(2), 4).tipo).toBe('retomar');
  });

  it('un paso cero o negativo se trata como sin envios', () => {
    // No deberia llegar de la base, pero un cero silencioso que se leyera como
    // "retomar desde el paso 1" saltearia el primer mensaje sin motivo.
    expect(ofertaParaLead(PUNTO(0), 3)).toEqual({ tipo: 'desde-el-inicio' });
    expect(ofertaParaLead(PUNTO(-1), 3)).toEqual({ tipo: 'desde-el-inicio' });
  });
});

describe('venceAlRetomar', () => {
  it('cuenta la espera desde el ultimo envio, no desde hoy', () => {
    const vence = venceAlRetomar('2026-09-01T10:00:00Z', 3);

    expect(vence.toISOString()).toBe('2026-09-04T10:00:00.000Z');
  });

  it('con espera cero, vence en el momento del ultimo envio', () => {
    expect(venceAlRetomar('2026-09-01T10:00:00Z', 0).toISOString()).toBe(
      '2026-09-01T10:00:00.000Z',
    );
  });

  it('puede quedar en el pasado, y esta bien', () => {
    // A quien le escribiste hace cinco dias en un flujo que espera tres, el
    // paso siguiente le toca YA. Contar desde la inscripcion lo castigaria con
    // una espera que ya paso.
    const vence = venceAlRetomar('2026-09-01T10:00:00Z', 3);

    expect(vence.getTime()).toBeLessThan(new Date('2026-09-06T10:00:00Z').getTime());
  });

  it('cruza el cambio de mes sin ayuda', () => {
    expect(venceAlRetomar('2026-08-30T10:00:00Z', 3).toISOString()).toBe(
      '2026-09-02T10:00:00.000Z',
    );
  });
});

describe('indexarPuntos', () => {
  it('deja buscar por lead', () => {
    const puntos = [
      { leadId: 'a', ultimoPasoHecho: 1, ultimoEnvioAt: '2026-09-01T10:00:00Z' },
      { leadId: 'b', ultimoPasoHecho: 2, ultimoEnvioAt: '2026-09-02T10:00:00Z' },
    ];

    const indice = indexarPuntos(puntos);

    expect(indice.get('a')?.ultimoPasoHecho).toBe(1);
    expect(indice.get('z')).toBeUndefined();
  });
});
