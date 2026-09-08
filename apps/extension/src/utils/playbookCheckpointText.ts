import type { PlaybookOption } from '../types';
import type { Deduccion } from './playbookBuckets';

/**
 * LA FRASE DE CONFIRMACION.
 *
 * Cuatro clausulas, todas opcionales, compuestas y no enumeradas. Escritas a
 * mano serian dieciseis plantillas -ocho combinaciones de tres clausulas, por
 * dos segun haya o no "mejorar sin perder"- y dieciseis sitios donde cambiar
 * una coma. Compuestas son estas cuarenta lineas y no puede faltar ninguna.
 *
 * Va aparte de la deduccion porque la gramatica es lo que mas tests necesita y
 * no tiene nada que ver con los buckets: `unirEnEspanol` se prueba sin
 * construir una `Deduccion` entera.
 */

/** Como mucho tres por clausula: mas no se puede leer en voz alta. */
const TOPE_POR_CLAUSULA = 3;

/**
 * "y" pasa a "e" ante palabra que empieza por el sonido /i/.
 *
 * La excepcion es `hie-`, donde suena /je/ y la "y" se queda: "agua y hielo",
 * no "agua e hielo". Las etiquetas las escribe el usuario y pueden empezar por
 * numero o por acento, asi que se normaliza antes de mirar.
 *
 * No hay una regla equivalente para "o"/"u" porque aqui nunca se une con "o".
 */
function conjuncion(siguiente: string): string {
  const limpio = siguiente
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  if (limpio.startsWith('hie')) return 'y';
  if (limpio.startsWith('i') || limpio.startsWith('hi')) return 'e';
  return 'y';
}

/**
 * Baja la inicial de una etiqueta para que quepa dentro de una oracion.
 *
 * Las opciones se escriben con mayuscula porque son fichas de una lista
 * -"Precio", "Red de clinicas"-, pero leidas en voz alta dentro de la frase
 * quedaban como "quiere mejorar Precio", que suena a formulario.
 *
 * ## Los nombres propios se respetan
 *
 * Si alguna palabra POSTERIOR a la primera lleva mayuscula, se deja tal cual:
 * "Clinica Alemana" o "RedSalud Vitacura" son nombres, no categorias. La regla
 * es imperfecta a proposito -no hay forma de saberlo con certeza- pero acierta
 * en los dos casos que importan y falla del lado prudente: ante la duda,
 * conserva lo que escribio el usuario.
 */
export function enMinuscula(etiqueta: string): string {
  const palabras = etiqueta.trim().split(/\s+/);
  const primera = palabras[0] ?? '';

  const pareceNombrePropio = palabras
    .slice(1)
    .some((palabra) => palabra.length > 0 && palabra[0] !== palabra[0]?.toLowerCase());

  if (pareceNombrePropio) return etiqueta;

  // Una sigla entera en mayusculas tampoco se toca: "AUGE", "GES".
  if (primera.length > 1 && primera === primera.toUpperCase()) return etiqueta;

  return primera.charAt(0).toLowerCase() + etiqueta.slice(1);
}

export function unirEnEspanol(etiquetas: readonly string[]): string {
  if (etiquetas.length === 0) return '';
  if (etiquetas.length === 1) return etiquetas[0] ?? '';

  const ultima = etiquetas[etiquetas.length - 1] ?? '';
  const previas = etiquetas.slice(0, -1);

  return `${previas.join(', ')} ${conjuncion(ultima)} ${ultima}`;
}

export interface FraseDeConfirmacion {
  /** Cadena vacia cuando no hay señal suficiente. Nunca "quiere mejorar .". */
  texto: string;
  /** Cuantos elementos se quedaron fuera por el tope, sumando las clausulas. */
  omitidos: number;
}

function recortar(opciones: readonly PlaybookOption[]): {
  etiquetas: string[];
  omitidos: number;
} {
  return {
    etiquetas: opciones.slice(0, TOPE_POR_CLAUSULA).map((o) => enMinuscula(o.label)),
    omitidos: Math.max(0, opciones.length - TOPE_POR_CLAUSULA),
  };
}

export function componerConfirmacion(deduccion: Deduccion): FraseDeConfirmacion {
  const { buckets } = deduccion;
  let omitidos = 0;

  const clausulas: string[] = [];

  /*
   * "Mejorar sin perder" va PRIMERO y en clausula propia.
   *
   * Decir "quiere mejorar la cobertura hospitalaria" y "quiere mantener la
   * cobertura hospitalaria" en la misma frase suena a que no le entendiste. Es
   * el caso mas frecuente en la vida real y el que se hace mal por defecto.
   */
  const sinPerder = recortar(buckets.mejorar_sin_perder);
  omitidos += sinPerder.omitidos;
  if (sinPerder.etiquetas.length > 0) {
    clausulas.push(
      `quiere mejorar ${unirEnEspanol(sinPerder.etiquetas)} sin perder el nivel que ya tiene`,
    );
  }

  // Lo que se puede ceder en parte entra como mejora normal: el matiz se
  // guarda para comparar alternativas, no para leerselo al cliente.
  const mejorar = recortar([...buckets.mejorar, ...buckets.mejorar_con_margen]);
  omitidos += mejorar.omitidos;
  if (mejorar.etiquetas.length > 0) {
    clausulas.push(
      clausulas.length > 0
        ? `además mejorar ${unirEnEspanol(mejorar.etiquetas)}`
        : `quiere mejorar ${unirEnEspanol(mejorar.etiquetas)}`,
    );
  }

  const mantener = recortar(buckets.mantener);
  omitidos += mantener.omitidos;
  if (mantener.etiquetas.length > 0) {
    clausulas.push(`mantener ${unirEnEspanol(mantener.etiquetas)}`);
  }

  const prescindible = recortar(buckets.prescindible);
  omitidos += prescindible.omitidos;
  if (prescindible.etiquetas.length > 0) {
    clausulas.push(`${unirEnEspanol(prescindible.etiquetas)} no es indispensable`);
  }

  if (clausulas.length === 0) return { texto: '', omitidos: 0 };

  const cuerpo =
    clausulas.length === 1
      ? clausulas[0]
      : `${clausulas.slice(0, -1).join(', ')} y ${clausulas[clausulas.length - 1]}`;

  return { texto: `Entonces, si entendí bien, ${cuerpo}. ¿Correcto?`, omitidos };
}
