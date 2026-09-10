import { describe, it, expect } from 'vitest';
import { mensajeDeRechazoAlInscribir } from './flowEnrollErrors';

describe('mensajeDeRechazoAlInscribir', () => {
  it('reconoce el canal ya ocupado por el codigo', () => {
    expect(mensajeDeRechazoAlInscribir({ code: '23505', message: 'duplicate key' })).toContain(
      'ya está en otro flujo',
    );
  });

  it('reconoce el canal ya ocupado por el nombre del indice', () => {
    const error = new Error(
      'duplicate key value violates unique constraint "message_flow_enrollments_una_activa_por_canal_idx"',
    );
    expect(mensajeDeRechazoAlInscribir(error)).toContain('ya está en otro flujo');
  });

  /*
   * El caso que motiva el modulo: sin traducir, esto llegaba a pantalla con el
   * identificador del lead dentro y sin tildes.
   */
  it('traduce el lead que pidio no recibir mas mensajes', () => {
    const error = {
      code: 'LS001',
      message: 'el lead 3f2a91c4-0000-0000-0000-000000008b21 pidio no recibir mas mensajes',
    };
    const mensaje = mensajeDeRechazoAlInscribir(error);
    expect(mensaje).toContain('No contactar');
    expect(mensaje).not.toContain('3f2a91c4');
  });

  it('traduce el numero que no esta en WhatsApp', () => {
    const error = {
      code: 'LS001',
      message: 'el numero del lead 3f2a91c4-0000-0000-0000-000000008b21 no esta en WhatsApp',
    };
    expect(mensajeDeRechazoAlInscribir(error)).toContain('Sin WhatsApp');
  });

  /* La 184 marca con prefijo en el texto y la 185 con SQLSTATE: los dos
     caminos existen y los dos tienen que entenderse. */
  it('entiende tambien el prefijo en el texto, sin codigo', () => {
    expect(
      mensajeDeRechazoAlInscribir(new Error('no_contactar: el lead X pidio no recibir mas mensajes')),
    ).toContain('No contactar');
    expect(
      mensajeDeRechazoAlInscribir(new Error('sin_whatsapp: el numero del lead X no esta en WhatsApp')),
    ).toContain('Sin WhatsApp');
  });

  /*
   * Devolver null y no un texto generico es lo que deja subir los fallos de
   * verdad en vez de disfrazarlos de rechazo esperado.
   */
  it('devuelve null para lo que no sabe explicar', () => {
    expect(mensajeDeRechazoAlInscribir(new Error('connection terminated'))).toBeNull();
    expect(mensajeDeRechazoAlInscribir(null)).toBeNull();
    expect(mensajeDeRechazoAlInscribir(undefined)).toBeNull();
  });

  it('no se cae con un error que no es un Error', () => {
    expect(mensajeDeRechazoAlInscribir('algo raro')).toBeNull();
    expect(mensajeDeRechazoAlInscribir(42)).toBeNull();
  });
});
