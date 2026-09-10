/**
 * El identificador de una funcionalidad del catalogo.
 *
 * Es la clave que el codigo consulta -`hasFeature('contactos.importar')`-, no
 * un texto para leer. Por eso se valida: un identificador con un espacio, una
 * mayuscula o una tilde compila igual, se guarda igual, y falla en silencio
 * meses despues cuando alguien escribe la comprobacion sin la tilde.
 *
 * ## Por que un formato con punto
 *
 * `categoria.funcionalidad` ordena solo al listarlo y dice a que grupo
 * pertenece sin necesitar el nombre visible. Las claves antiguas usan dos
 * puntos (`module:leads`, `pro:unlimited_leads`) y se aceptan tal cual: estan
 * vivas en la base y en el codigo, y renombrarlas quitaria la funcionalidad a
 * quien la tiene.
 */

/** Minusculas, digitos y guion bajo, en tramos separados por `.` o `:`. */
const FORMATO = /^[a-z][a-z0-9_]*([.:][a-z][a-z0-9_]*)+$/;

export interface ResultadoDeValidacion {
  valido: boolean;
  /** Que hacer para arreglarlo. Vacio cuando es valido. */
  motivo: string;
}

export function validarFeatureId(valor: string): ResultadoDeValidacion {
  const limpio = valor.trim();

  if (!limpio) {
    return { valido: false, motivo: 'Escribe un identificador.' };
  }

  if (limpio !== valor) {
    return { valido: false, motivo: 'Sobra un espacio al principio o al final.' };
  }

  if (/\s/.test(limpio)) {
    return { valido: false, motivo: 'No puede llevar espacios. Usa un punto o un guion bajo.' };
  }

  if (/[A-Z]/.test(limpio)) {
    return { valido: false, motivo: 'Todo en minusculas.' };
  }

  if (/[áéíóúñü]/i.test(limpio)) {
    return { valido: false, motivo: 'Sin tildes ni eñes: es una clave, no un texto.' };
  }

  if (!limpio.includes('.') && !limpio.includes(':')) {
    return { valido: false, motivo: 'Falta la categoria. Por ejemplo: contactos.importar' };
  }

  if (!FORMATO.test(limpio)) {
    return {
      valido: false,
      motivo: 'Formato: categoria.funcionalidad, con letras, numeros y guion bajo.',
    };
  }

  return { valido: true, motivo: '' };
}

/**
 * Propone un identificador a partir del nombre visible.
 *
 * Es una ayuda para el alta, no una regla: quien lo escribe puede cambiarlo. Al
 * editar NO se recalcula, porque el identificador es inmutable -cambiarlo
 * romperia todas las comprobaciones del codigo que lo nombran-.
 */
export function sugerirFeatureId(categoria: string, nombre: string): string {
  const tramo = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!tramo) return '';
  return categoria ? `${categoria}.${tramo}` : tramo;
}
