/**
 * Decide si hay que impedir que un archivo soltado escriba en un campo de texto.
 *
 * El navegador, al soltar archivos sobre un `input` o un `textarea`, inserta sus
 * **rutas** como texto. Nadie lo pide y nadie lo nota hasta que ya esta guardado:
 * la descripcion de la sala `# General` acabo con
 * `C:\Users\henti\Downloads\iconos` repetido ocho veces, que es exactamente lo
 * que ocurre al arrastrar ocho archivos de una carpeta sobre el campo.
 *
 * Se decide aqui, fuera del DOM, para poder probarlo sin navegador.
 */

/** Campos donde el navegador escribe la ruta al soltar un archivo. */
const CAMPOS_DE_TEXTO = ['input', 'textarea'];

export interface DestinoDelSoltar {
  /** Etiqueta HTML del elemento sobre el que se solto, en minusculas. */
  etiqueta: string;
  /** `true` si el elemento es editable por contenido (`contenteditable`). */
  editable?: boolean;
  /** `true` si el elemento, o alguno por encima, maneja archivos a proposito. */
  dentroDeZonaDeArchivos?: boolean;
}

/**
 * `true` cuando el soltar debe cancelarse.
 *
 * No basta con mirar la etiqueta: `ImportModal` recibe archivos a proposito, y
 * cancelar ahi romperia la importacion. Por eso la zona legitima manda sobre
 * todo lo demas.
 */
export function debeBloquearSoltar(traeArchivos: boolean, destino: DestinoDelSoltar): boolean {
  if (!traeArchivos) return false;
  if (destino.dentroDeZonaDeArchivos) return false;
  if (destino.editable) return true;
  return CAMPOS_DE_TEXTO.includes(destino.etiqueta.toLowerCase());
}
