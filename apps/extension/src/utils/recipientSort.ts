import type { LeadSendSummary } from '../services/historyService';

/**
 * ORDEN DE LA LISTA DE DESTINATARIOS
 *
 * Puro: recibe leads y el resumen de envios, devuelve leads ordenados. Sin DOM
 * y sin red, asi que se prueba solo y sirve igual en la app movil.
 */

export type CriterioDestinatario = 'nombre' | 'ultimo-envio' | 'plantilla' | 'categoria';

export interface LeadOrdenable {
  id?: string;
  name: string;
}

const comparador = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/**
 * Los que nunca recibieron un mensaje van AL FINAL en todos los criterios que
 * no son el nombre.
 *
 * Es deliberado y va contra la intuicion de "sin fecha primero". Quien ordena
 * por ultimo envio esta buscando a quien hace mucho que no le escribe, no a
 * quien no le escribio nunca: mezclarlos empuja a los contactados fuera de la
 * primera pagina, que es justo lo que se queria ver. Los nuevos ya tienen su
 * propio sitio -la lista entera ordenada por nombre- y su propia senal, la
 * ausencia de contador.
 */
const AL_FINAL = 1;

function compararPorUltimoEnvio(
  a: LeadSendSummary | undefined,
  b: LeadSendSummary | undefined,
): number | null {
  if (!a && !b) return null;
  if (!a) return AL_FINAL;
  if (!b) return -AL_FINAL;
  // Mas reciente primero: es lo que alguien espera de "ultimo envio".
  return b.lastSentAt.localeCompare(a.lastSentAt);
}

/**
 * Ordena una copia. No muta: mutar el arreglo que vino de `useMemo` deja la
 * lista sin repintar, porque React compara por referencia.
 */
export function ordenarDestinatarios<T extends LeadOrdenable>(
  leads: T[],
  criterio: CriterioDestinatario,
  resumen: Map<string, LeadSendSummary>,
  categoriaDe: (summary: LeadSendSummary) => string,
): T[] {
  if (criterio === 'nombre') {
    return [...leads].sort((a, b) => comparador.compare(a.name, b.name));
  }

  return [...leads].sort((a, b) => {
    const ra = a.id ? resumen.get(a.id) : undefined;
    const rb = b.id ? resumen.get(b.id) : undefined;

    if (criterio === 'ultimo-envio') {
      const porFecha = compararPorUltimoEnvio(ra, rb);
      // Empate real -mismo instante, o ninguno de los dos tiene envios-: se
      // desempata por nombre para que el orden sea estable entre recargas.
      return porFecha !== null && porFecha !== 0
        ? porFecha
        : comparador.compare(a.name, b.name);
    }

    const va = ra ? (criterio === 'plantilla' ? ra.lastTemplateName ?? '' : categoriaDe(ra)) : '';
    const vb = rb ? (criterio === 'plantilla' ? rb.lastTemplateName ?? '' : categoriaDe(rb)) : '';

    // Sin valor va al final, por el mismo motivo que sin fecha.
    if (!va && !vb) return comparador.compare(a.name, b.name);
    if (!va) return AL_FINAL;
    if (!vb) return -AL_FINAL;

    const porTexto = comparador.compare(va, vb);
    return porTexto !== 0 ? porTexto : comparador.compare(a.name, b.name);
  });
}

/** Los rotulos del selector, en el orden en que se ofrecen. */
export const ORDENES_DESTINATARIO: { value: CriterioDestinatario; label: string }[] = [
  { value: 'nombre', label: 'Nombre' },
  { value: 'ultimo-envio', label: 'Último envío' },
  { value: 'plantilla', label: 'Plantilla' },
  { value: 'categoria', label: 'Categoría' },
];
