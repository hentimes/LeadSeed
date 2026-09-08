import { describe, it, expect } from 'vitest';
import {
  SIN_NOMBRE,
  nombreVisible,
  nombreCorto,
  nombreDePila,
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

describe('nombreDePila', () => {
  it('devuelve solo la primera palabra', () => {
    expect(nombreDePila('Jorge Moreno')).toBe('Jorge');
    expect(nombreDePila('Henry Jose Daniel Farias Pacheco')).toBe('Henry');
  });

  it('con una sola palabra la devuelve entera', () => {
    expect(nombreDePila('Betzabeth')).toBe('Betzabeth');
  });

  /* El limite conocido: un nombre compuesto separado por espacios es
     indistinguible de un nombre mas un segundo nombre. Para ese caso esta
     `{nombresimple}`. */
  it('un nombre compuesto se queda con la primera mitad', () => {
    expect(nombreDePila('Maria Jose Rebolledo')).toBe('Maria');
  });

  it('tolera espacios de sobra y la cadena vacia', () => {
    expect(nombreDePila('   Ana   Soto  ')).toBe('Ana');
    expect(nombreDePila('   ')).toBe('');
    expect(nombreDePila('')).toBe('');
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

  /*
   * Con cinco partes -tres nombres de pila y los dos apellidos de siempre- el
   * paterno sigue siendo el penultimo. La regla vieja contaba desde el
   * principio y devolvia "Henry Daniel": el tercer nombre de pila ascendido a
   * apellido. Salio a la luz al abreviar el saludo de los WhatsApp, donde el
   * error se lee en cada mensaje.
   */
  it('con cinco partes toma el apellido paterno, no el tercer nombre', () => {
    expect(nombreCorto('Henry Jose Daniel Farias Pacheco')).toBe('Henry Farias');
    expect(nombreCorto('Maria Jose Rebolledo Kehr Diaz')).toBe('Maria Kehr');
  });

  /* El limite conocido: un apellido compuesto se ve igual que un nombre mas. */
  it('con un apellido compuesto se queda con la segunda mitad', () => {
    expect(nombreCorto('Alejandra San Martin Escobar')).toBe('Alejandra Martin');
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
