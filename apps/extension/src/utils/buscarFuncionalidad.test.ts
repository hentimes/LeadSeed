import { describe, it, expect } from 'vitest';
import { buscarFuncionalidades } from './buscarFuncionalidad';
import type { Feature } from '../types';

function f(id: string, name: string, description = '', category = ''): Feature {
  return { id, name, description, category, is_active: true, trial_days: 0, created_at: '' };
}

const CATALOGO: Feature[] = [
  f('module:dashboard', 'Panel', 'Metricas y ventanas de tiempo.', 'analisis'),
  f('analisis.reportes', 'Reportes', 'Adquisicion, embudo y calidad por fuente.', 'analisis'),
  f('contactos.importar', 'Importar', 'Cargar contactos desde Excel o CSV.', 'contactos'),
  f('mensajes.flujos', 'Flujos', 'Secuencias de mensajes.', 'mensajes'),
];

describe('buscarFuncionalidades', () => {
  /*
   * El caso que lo motiva: la funcionalidad se llama "Panel" y su clave es
   * `module:dashboard`. Quien escribe "dashboard" -que es como se llama la
   * seccion en el rail- no encontraba nada y concluia que no estaba.
   */
  it('encuentra por identificador aunque el nombre sea otro', () => {
    const r = buscarFuncionalidades(CATALOGO, 'dashboard');
    expect(r).toHaveLength(1);
    expect(r[0]?.id).toBe('module:dashboard');
  });

  it('encuentra por nombre', () => {
    expect(buscarFuncionalidades(CATALOGO, 'flujos')[0]?.id).toBe('mensajes.flujos');
  });

  it('encuentra por descripcion', () => {
    expect(buscarFuncionalidades(CATALOGO, 'embudo')[0]?.id).toBe('analisis.reportes');
  });

  it('encuentra por categoria', () => {
    expect(buscarFuncionalidades(CATALOGO, 'contactos')).toHaveLength(1);
  });

  it('no exige la tilde para encontrar algo escrito con tilde', () => {
    const conTilde = [f('analisis.x', 'Análisis avanzado', '', 'analisis')];
    expect(buscarFuncionalidades(conTilde, 'analisis')).toHaveLength(1);
    expect(buscarFuncionalidades(conTilde, 'análisis')).toHaveLength(1);
  });

  it('ignora mayusculas', () => {
    expect(buscarFuncionalidades(CATALOGO, 'DASHBOARD')).toHaveLength(1);
  });

  /* Cada palabra puede aparecer en un sitio distinto: asi se busca cuando no
     recuerdas el nombre exacto. */
  it('exige todas las palabras, pero no en el mismo campo', () => {
    expect(buscarFuncionalidades(CATALOGO, 'panel analisis')).toHaveLength(1);
    expect(buscarFuncionalidades(CATALOGO, 'panel contactos')).toHaveLength(0);
  });

  it('con la busqueda vacia devuelve todo', () => {
    expect(buscarFuncionalidades(CATALOGO, '')).toHaveLength(4);
    expect(buscarFuncionalidades(CATALOGO, '   ')).toHaveLength(4);
  });

  it('sin coincidencias devuelve vacio, no todo', () => {
    expect(buscarFuncionalidades(CATALOGO, 'facturacion')).toHaveLength(0);
  });
});
