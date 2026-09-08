import type { LeadSendSummary } from '../services/historyService';

/**
 * FILTRO DE CONTACTO DE LA LISTA DE DESTINATARIOS
 *
 * Contesta la pregunta con la que se arma cada tanda: a quien ya le escribi y a
 * quien no. Puro -leads y resumen entran, leads salen-, sin DOM y sin red, asi
 * que se prueba solo y sirve igual en la app movil.
 *
 * ## Un solo control, no dos
 *
 * El filtro por plantilla no es una segunda casilla independiente: ACOTA lo que
 * significa "ya escrito". Con "cualquier mensaje", escrito es haber recibido
 * algo; con una plantilla elegida, escrito es haber recibido ESA.
 *
 * Asi los tres casos reales salen de combinar dos selectores en vez de cuatro:
 *
 * - sin escribir + cualquier mensaje  -> a quien nunca contacte
 * - ya escritos  + cualquier mensaje  -> a quien toca el segundo mensaje
 * - sin escribir + "Primer contacto"  -> a quien le falta ESA plantilla,
 *   aunque ya haya recibido otras
 *
 * El tercero es el que no se podia pedir de ninguna forma antes, y es el que
 * evita mandar dos veces el mismo mensaje.
 */

export type CriterioContacto = 'todos' | 'contactados' | 'sin-contactar';

export interface LeadFiltrable {
  id?: string;
}

/**
 * Si al lead se le envio lo que el filtro pregunta.
 *
 * `plantillaId` nulo significa "cualquier mensaje". Se compara como texto
 * porque el id de una plantilla es `string | number` segun de donde venga, y en
 * la base es uuid.
 */
export function recibioMensaje(
  resumen: LeadSendSummary | undefined,
  plantillaId: string | null,
): boolean {
  if (!resumen || resumen.total === 0) return false;
  if (!plantillaId) return true;
  return resumen.templateIds.includes(plantillaId);
}

/** Filtra una copia; no muta el arreglo que recibe. */
export function filtrarPorContacto<T extends LeadFiltrable>(
  leads: T[],
  criterio: CriterioContacto,
  plantillaId: string | null,
  resumen: Map<string, LeadSendSummary>,
): T[] {
  if (criterio === 'todos') return leads;

  return leads.filter((lead) => {
    const escrito = recibioMensaje(lead.id ? resumen.get(lead.id) : undefined, plantillaId);
    return criterio === 'contactados' ? escrito : !escrito;
  });
}

/** Los rotulos del selector, en el orden en que se ofrecen. */
export const CONTACTOS_DESTINATARIO: { value: CriterioContacto; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'contactados', label: 'Ya escritos' },
  { value: 'sin-contactar', label: 'Sin escribir' },
];
