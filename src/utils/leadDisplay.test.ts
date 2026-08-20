import { describe, it, expect } from 'vitest';
import {
  SIN_NOMBRE,
  nombreVisible,
  nombreCorto,
  telefonoEnmascarado,
  telefonoVisible,
} from './leadDisplay';

describe('nombreVisible', () => {
  it('devuelve el nombre cuando lo hay', () => {
    expect(nombreVisible('Henry Farias')).toBe('Henry Farias');
  });

  it('recorta los espacios de los bordes', () => {
    expect(nombreVisible('  Henry Farias  ')).toBe('Henry Farias');
  });

  it('trata la cadena vacia como sin nombre', () => {
    expect(nombreVisible('')).toBe(SIN_NOMBRE);
  });

  /* En la base hay leads importados cuyo nombre es un espacio. Sin esto la fila
     se pinta vacia y parece rota, en vez de declarar que falta el dato. */
  it('trata una cadena de solo espacios como sin nombre', () => {
    expect(nombreVisible('   ')).toBe(SIN_NOMBRE);
  });

  it('tolera nulo e indefinido', () => {
    expect(nombreVisible(null)).toBe(SIN_NOMBRE);
    expect(nombreVisible(undefined)).toBe(SIN_NOMBRE);
  });

  it('no lleva parentesis: un lector de pantalla los verbaliza', () => {
    expect(SIN_NOMBRE).toBe('Sin nombre');
  });
});

describe('nombreCorto', () => {
  it('deja intacto un nombre de una sola palabra', () => {
    expect(nombreCorto('Betzabeth')).toBe('Betzabeth');
  });

  it('deja intacto nombre y un apellido', () => {
    expect(nombreCorto('Ana Soto')).toBe('Ana Soto');
  });

  it('con tres partes toma el nombre y el apellido paterno', () => {
    expect(nombreCorto('Juan Perez Soto')).toBe('Juan Perez');
  });

  /*
   * El caso que decidio cual de las dos reglas en conflicto se conservaba.
   * Con cuatro partes -dos nombres de pila y dos apellidos- el paterno es la
   * tercera palabra. La regla que se retiro tomaba la ultima y devolvia
   * "Juan Soto", que es el apellido materno: nadie llama asi a nadie.
   */
  it('con cuatro partes toma el apellido paterno, no el materno', () => {
    expect(nombreCorto('Juan Carlos Perez Soto')).toBe('Juan Perez');
  });

  it('aplica la misma regla con cinco partes o mas', () => {
    expect(nombreCorto('Maria Jose Rebolledo Kehr Diaz')).toBe('Maria Rebolledo');
  });

  it('normaliza los espacios repetidos', () => {
    expect(nombreCorto('Juan   Perez    Soto')).toBe('Juan Perez');
  });

  it('devuelve cadena vacia si no hay nombre, sin inventar respaldo', () => {
    expect(nombreCorto('')).toBe('');
    expect(nombreCorto('   ')).toBe('');
  });

  it('se compone con nombreVisible para obtener el respaldo', () => {
    expect(nombreVisible(nombreCorto(''))).toBe(SIN_NOMBRE);
  });
});

describe('telefonoEnmascarado', () => {
  it('deja ver los ultimos cuatro digitos', () => {
    expect(telefonoEnmascarado('+56981377026')).toBe('...7026');
  });

  it('funciona igual sin prefijo internacional', () => {
    expect(telefonoEnmascarado('998765874')).toBe('...5874');
  });

  /* Anteponer puntos a un numero que ya se ve entero sugeriria que se oculta
     algo. */
  it('devuelve entero un numero de cuatro digitos o menos', () => {
    expect(telefonoEnmascarado('1234')).toBe('1234');
    expect(telefonoEnmascarado('12')).toBe('12');
  });

  it('tolera la cadena vacia', () => {
    expect(telefonoEnmascarado('')).toBe('');
  });

  it('recorta espacios antes de contar', () => {
    expect(telefonoEnmascarado('  +56981377026  ')).toBe('...7026');
  });
});

describe('telefonoVisible', () => {
  it('enmascara por defecto', () => {
    expect(telefonoVisible('+56981377026')).toBe('...7026');
  });

  it('revela el numero completo cuando se le pide', () => {
    expect(telefonoVisible('+56981377026', true)).toBe('+56981377026');
  });

  /*
   * Las dos conductas que ya existian en el producto, expresadas con el mismo
   * parametro: la tabla de leads revela al seleccionar la fila, el pipeline
   * enmascara siempre.
   */
  it('cubre las dos conductas que ya existian', () => {
    const telefono = '+56987548082';
    expect(telefonoVisible(telefono, false)).toBe('...8082');
    expect(telefonoVisible(telefono, true)).toBe(telefono);
  });
});
