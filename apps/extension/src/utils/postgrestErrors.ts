/**
 * Codigos de PostgREST y de Postgres que la aplicacion tiene que saber leer.
 *
 * Estaban dentro de `appointmentOutcomeService`, que era el unico sitio desde
 * el que se consultaban. Al aparecer el segundo -los playbooks tienen su
 * propia RPC y su propio choque de indice- copiarlos habria sido empezar a
 * mantener dos listas del mismo vocabulario.
 */

function codigoDe(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  return String((err as { code?: unknown }).code ?? '');
}

function mensajeDe(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  return String((err as { message?: unknown }).message ?? '');
}

/**
 * PostgREST devuelve PGRST202 cuando la funcion no existe en el esquema.
 *
 * Pasa con una migracion sin aplicar: el codigo ya la llama y la base todavia
 * no la tiene. El mensaje crudo -"Could not find the function..."- no le dice
 * nada a quien lo lee desde la pantalla, y sin explicacion el sintoma parece
 * que el boton no hace nada.
 */
export function esFuncionInexistente(err: unknown): boolean {
  return codigoDe(err) === 'PGRST202' || mensajeDe(err).includes('Could not find the function');
}

/**
 * 23505: violacion de una restriccion unica.
 *
 * En los playbooks no es un error sino una regla de negocio: el indice unico
 * parcial es lo unico que garantiza "un recorrido activo por lead y playbook",
 * y la RPC lo deja hablar a proposito en vez de comprobar antes, porque entre
 * la comprobacion y la insercion cabe otro toque.
 */
export function esDuplicado(err: unknown): boolean {
  return codigoDe(err) === '23505';
}

/**
 * 23503: violacion de clave foranea.
 *
 * En esta app significa casi siempre lo mismo: se intento borrar algo que otra
 * cosa sigue usando, y la base lo impide con un `on delete restrict` puesto a
 * proposito -la plantilla de un paso de flujo, el playbook de un recorrido-.
 *
 * No es un fallo tecnico sino una regla de negocio, y por eso hay que
 * traducirla en vez de tragarla: sin traduccion, el boton de borrar no hace
 * nada y no dice por que.
 */
export function esReferenciaEnUso(err: unknown): boolean {
  return codigoDe(err) === '23503';
}
