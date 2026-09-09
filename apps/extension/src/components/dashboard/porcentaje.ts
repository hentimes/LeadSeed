/**
 * Un porcentaje que no aplasta lo poco a cero.
 *
 * `Math.round(1 / 1936 * 100)` da **0**, asi que una cuenta con un lead
 * convertido de mil novecientos leia "Tasa de conversion: 0%" mientras la
 * tabla de justo abajo, que redondea a un decimal, decia "0.1%" del mismo
 * hecho. Dos numeros distintos para la misma cuenta en la misma pantalla.
 *
 * Cero solo cuando de verdad no hubo ninguno. Por debajo del uno por ciento se
 * muestra un decimal, que es lo que hace falta para que un primer convertido
 * se note.
 */
export function porcentaje(parte: number, total: number): string {
  if (total <= 0 || parte <= 0) return '0';

  const crudo = (parte / total) * 100;
  if (crudo < 1) return String(Math.round(crudo * 10) / 10);
  return String(Math.round(crudo));
}
