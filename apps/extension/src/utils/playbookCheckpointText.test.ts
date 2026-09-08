import { describe, it, expect } from 'vitest';
import { componerConfirmacion, enMinuscula, unirEnEspanol } from './playbookCheckpointText';
import type { Deduccion, Bucket } from './playbookBuckets';
import type { PlaybookOption } from '../types';

function op(label: string): PlaybookOption {
  return { id: label.toLowerCase().replace(/\s+/g, '-'), label };
}

function deduccion(over: Partial<Record<Bucket, PlaybookOption[]>> = {}): Deduccion {
  return {
    buckets: {
      mantener: [],
      flexible: [],
      prescindible: [],
      mejorar: [],
      mejorar_sin_perder: [],
      mejorar_con_margen: [],
      ...over,
    },
    contradicciones: [],
    huerfanas: [],
  };
}

describe('enMinuscula', () => {
  /*
   * Las opciones se escriben con mayuscula porque son fichas de una lista, pero
   * dentro de la frase quedaban como "quiere mejorar Precio", que suena a
   * formulario y no a alguien hablando.
   */
  it('baja la inicial de una categoria', () => {
    expect(enMinuscula('Precio')).toBe('precio');
    expect(enMinuscula('Red de clínicas')).toBe('red de clínicas');
  });

  /*
   * Si una palabra posterior lleva mayuscula, es un nombre y no una categoria.
   * La regla es imperfecta a proposito y falla del lado prudente: ante la duda,
   * conserva lo que escribio el usuario.
   */
  it('respeta los nombres propios', () => {
    expect(enMinuscula('Clínica Alemana')).toBe('Clínica Alemana');
    expect(enMinuscula('RedSalud Vitacura')).toBe('RedSalud Vitacura');
  });

  it('no toca una sigla', () => {
    expect(enMinuscula('AUGE')).toBe('AUGE');
  });

  it('lo que ya viene en minuscula se queda igual', () => {
    expect(enMinuscula('libre elección')).toBe('libre elección');
  });

  it('una etiqueta vacia no revienta', () => {
    expect(enMinuscula('')).toBe('');
  });
});

describe('unirEnEspanol', () => {
  it('sin elementos no produce nada', () => {
    expect(unirEnEspanol([])).toBe('');
  });

  it('uno solo va tal cual', () => {
    expect(unirEnEspanol(['el precio'])).toBe('el precio');
  });

  it('dos van con y', () => {
    expect(unirEnEspanol(['el precio', 'la red'])).toBe('el precio y la red');
  });

  it('tres llevan coma y solo una y', () => {
    expect(unirEnEspanol(['a', 'b', 'c'])).toBe('a, b y c');
  });

  /*
   * "y" pasa a "e" ante el sonido /i/. Es lo que separa un texto redactado de
   * uno que parece generado.
   */
  it('ante palabra que empieza por i, la y pasa a e', () => {
    expect(unirEnEspanol(['la red', 'integración'])).toBe('la red e integración');
  });

  it('tambien con hi-, que suena igual', () => {
    expect(unirEnEspanol(['padre', 'hijos'])).toBe('padre e hijos');
  });

  /*
   * La excepcion: en `hie-` suena /je/ y la y se queda. "Agua y hielo", nunca
   * "agua e hielo".
   */
  it('pero NO ante hie-, que suena distinto', () => {
    expect(unirEnEspanol(['agua', 'hielo'])).toBe('agua y hielo');
  });

  it('el acento no despista', () => {
    expect(unirEnEspanol(['costo', 'Índices'])).toBe('costo e Índices');
  });

  it('una etiqueta que empieza por numero no rompe nada', () => {
    expect(unirEnEspanol(['costo', '7% legal'])).toBe('costo y 7% legal');
  });
});

describe('componerConfirmacion · las ocho combinaciones', () => {
  it('sin ninguna señal no se inventa una frase', () => {
    expect(componerConfirmacion(deduccion()).texto).toBe('');
  });

  it('solo mejorar', () => {
    expect(componerConfirmacion(deduccion({ mejorar: [op('el precio')] })).texto).toBe(
      'Entonces, si entendí bien, quiere mejorar el precio. ¿Correcto?',
    );
  });

  /*
   * Las etiquetas llegan como las escribio el usuario -en mayuscula, porque son
   * fichas- y la frase las baja al meterlas en la oracion.
   */
  it('baja la inicial de las etiquetas al componerlas', () => {
    expect(componerConfirmacion(deduccion({ mejorar: [op('Precio')] })).texto).toBe(
      'Entonces, si entendí bien, quiere mejorar precio. ¿Correcto?',
    );
  });

  it('solo mantener', () => {
    expect(componerConfirmacion(deduccion({ mantener: [op('la libre elección')] })).texto).toBe(
      'Entonces, si entendí bien, mantener la libre elección. ¿Correcto?',
    );
  });

  it('solo prescindible', () => {
    expect(componerConfirmacion(deduccion({ prescindible: [op('los excedentes')] })).texto).toBe(
      'Entonces, si entendí bien, los excedentes no es indispensable. ¿Correcto?',
    );
  });

  it('mejorar y mantener', () => {
    const f = componerConfirmacion(
      deduccion({ mejorar: [op('el precio')], mantener: [op('la red')] }),
    );
    expect(f.texto).toBe(
      'Entonces, si entendí bien, quiere mejorar el precio y mantener la red. ¿Correcto?',
    );
  });

  it('las tres a la vez', () => {
    const f = componerConfirmacion(
      deduccion({
        mejorar: [op('el precio')],
        mantener: [op('la red')],
        prescindible: [op('los excedentes')],
      }),
    );
    expect(f.texto).toBe(
      'Entonces, si entendí bien, quiere mejorar el precio, mantener la red y los excedentes no es indispensable. ¿Correcto?',
    );
  });
});

describe('componerConfirmacion · mejorar sin perder', () => {
  /*
   * Decir "quiere mejorar la cobertura hospitalaria" y "quiere mantener la
   * cobertura hospitalaria" en la misma frase suena a que no le entendiste.
   */
  it('va primero y en clausula propia', () => {
    expect(
      componerConfirmacion(deduccion({ mejorar_sin_perder: [op('la cobertura hospitalaria')] }))
        .texto,
    ).toBe(
      'Entonces, si entendí bien, quiere mejorar la cobertura hospitalaria sin perder el nivel que ya tiene. ¿Correcto?',
    );
  });

  it('lo demas se encadena detras sin repetir "quiere"', () => {
    const f = componerConfirmacion(
      deduccion({ mejorar_sin_perder: [op('lo hospitalario')], mejorar: [op('la red')] }),
    );

    expect(f.texto).toContain('sin perder el nivel que ya tiene y además mejorar la red');
  });

  it('lo que se puede ceder en parte entra como mejora normal', () => {
    const f = componerConfirmacion(deduccion({ mejorar_con_margen: [op('el precio')] }));
    expect(f.texto).toContain('quiere mejorar el precio');
  });
});

describe('componerConfirmacion · el tope de tres', () => {
  it('corta en tres y cuenta lo que dejo fuera', () => {
    const f = componerConfirmacion(
      deduccion({
        mejorar: [op('uno'), op('dos'), op('tres'), op('cuatro'), op('cinco')],
      }),
    );

    expect(f.texto).toContain('uno, dos y tres');
    expect(f.texto).not.toContain('cuatro');
    expect(f.omitidos).toBe(2);
  });

  it('suma lo omitido de todas las clausulas', () => {
    const f = componerConfirmacion(
      deduccion({
        mejorar: [op('a'), op('b'), op('c'), op('d')],
        mantener: [op('e'), op('f'), op('g'), op('h'), op('i')],
      }),
    );

    expect(f.omitidos).toBe(3);
  });
});
