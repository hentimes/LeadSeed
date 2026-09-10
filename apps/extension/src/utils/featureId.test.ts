import { describe, it, expect } from 'vitest';
import { validarFeatureId, sugerirFeatureId } from './featureId';

describe('validarFeatureId', () => {
  it('acepta el formato con punto', () => {
    expect(validarFeatureId('contactos.importar').valido).toBe(true);
    expect(validarFeatureId('mensajes.cupo_diario').valido).toBe(true);
  });

  /* Las claves antiguas siguen vivas en la base y en el codigo. Rechazarlas
     obligaria a renombrarlas, y renombrar una clave quita la funcionalidad a
     quien la tiene. */
  it('acepta las claves antiguas con dos puntos', () => {
    expect(validarFeatureId('module:leads').valido).toBe(true);
    expect(validarFeatureId('pro:unlimited_leads').valido).toBe(true);
  });

  it('exige una categoria', () => {
    const r = validarFeatureId('importar');
    expect(r.valido).toBe(false);
    expect(r.motivo).toContain('categoria');
  });

  it('rechaza espacios, mayusculas y tildes', () => {
    expect(validarFeatureId('contactos.importar leads').valido).toBe(false);
    expect(validarFeatureId('Contactos.Importar').valido).toBe(false);
    expect(validarFeatureId('gestion.importacion').valido).toBe(true);
    expect(validarFeatureId('gesti\u00f3n.importar').valido).toBe(false);
  });

  it('dice que sobra un espacio al principio o al final', () => {
    expect(validarFeatureId(' contactos.importar').motivo).toContain('espacio');
  });

  it('rechaza el vacio', () => {
    expect(validarFeatureId('').valido).toBe(false);
  });

  it('rechaza un punto suelto o un tramo vacio', () => {
    expect(validarFeatureId('contactos.').valido).toBe(false);
    expect(validarFeatureId('.importar').valido).toBe(false);
    expect(validarFeatureId('contactos..importar').valido).toBe(false);
  });
});

describe('sugerirFeatureId', () => {
  it('quita tildes y espacios del nombre visible', () => {
    expect(sugerirFeatureId('contactos', 'Importar desde Excel')).toBe('contactos.importar_desde_excel');
    expect(sugerirFeatureId('mensajes', 'Env\u00edo en tanda')).toBe('mensajes.envio_en_tanda');
  });

  it('sin categoria devuelve solo el tramo', () => {
    expect(sugerirFeatureId('', 'Importar')).toBe('importar');
  });

  it('con un nombre sin letras devuelve vacio, no un punto suelto', () => {
    expect(sugerirFeatureId('contactos', '   ')).toBe('');
    expect(sugerirFeatureId('contactos', '---')).toBe('');
  });
});
