import { describe, it, expect } from 'vitest';
import { calcularTendencia } from './trend';

describe('calcularTendencia', () => {
  it('calcula el porcentaje de subida sin signo, porque el signo lo lleva la flecha', () => {
    expect(calcularTendencia(12, 10, 'vs ayer')).toEqual({
      value: '20%',
      label: 'vs ayer',
      direction: 'up',
    });
  });

  it('calcula la bajada en valor absoluto y la marca hacia abajo', () => {
    expect(calcularTendencia(8, 10, 'vs ayer')).toEqual({
      value: '20%',
      label: 'vs ayer',
      direction: 'down',
    });
  });

  it('no inventa un porcentaje cuando no hay con que comparar', () => {
    // Este era el error viejo: devolvia 0% con flecha verde, que se lee como
    // "igual que ayer" cuando ayer no hubo nada.
    expect(calcularTendencia(12, 0, 'vs ayer')).toEqual({
      value: '+12',
      label: 'vs ayer',
      direction: 'up',
    });
  });

  it('dice "sin cambios" en vez de 0% con flecha verde', () => {
    expect(calcularTendencia(10, 10, 'vs ayer')).toEqual({
      value: 'sin cambios',
      label: 'vs ayer',
      direction: 'flat',
    });
  });

  it('trata el doble cero como sin cambios, no como caida', () => {
    expect(calcularTendencia(0, 0, 'vs ayer')).toEqual({
      value: 'sin cambios',
      label: 'vs ayer',
      direction: 'flat',
    });
  });

  it('marca hacia abajo cuando se cae a cero', () => {
    expect(calcularTendencia(0, 4, 'vs ayer')).toEqual({
      value: '100%',
      label: 'vs ayer',
      direction: 'down',
    });
  });

  it('conserva la etiqueta del periodo elegido, no siempre "vs ayer"', () => {
    expect(calcularTendencia(5, 4, 'vs mes pasado').label).toBe('vs mes pasado');
  });

  it('redondea el porcentaje a entero', () => {
    expect(calcularTendencia(10, 3, 'vs ayer').value).toBe('233%');
  });
});
