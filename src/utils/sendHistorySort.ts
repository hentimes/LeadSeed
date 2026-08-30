/**
 * ORDEN DEL HISTORIAL DE ENVIOS
 *
 * Puro: recibe filas, devuelve filas nuevas. Sin DOM y sin red, asi que se
 * prueba sin montar nada y sirve igual en la app movil.
 *
 * ## Por que ordena el cliente y no SQL
 *
 * `fetchRecentSendLogRows` trae como mucho 100 filas. Ordenar 100 objetos en
 * memoria es instantaneo, y llevarlo a Supabase costaria una ida al servidor por
 * cada cambio de criterio -tres criterios por dos direcciones son seis viajes
 * para reordenar lo que ya esta en pantalla-. Si algun dia el limite sube a
 * miles, esto cambia; con 100, no.
 */

export type CriterioDeOrden = 'fecha' | 'lead' | 'plantilla';
export type DireccionDeOrden = 'asc' | 'desc';

/** Lo minimo que necesita una fila para poder ordenarse. */
export interface FilaOrdenable {
  sentAt: string;
  leadName: string;
  templateNombre: string;
}

/**
 * Comparador de texto sensible al castellano.
 *
 * `localeCompare` a secas y no `<`: comparando por codigo, "Ángela" cae DESPUES
 * de "Zoe" porque la A con tilde vive fuera del ASCII. En una lista de nombres
 * de leads eso no es un detalle.
 *
 * `sensitivity: 'base'` ademas iguala mayusculas y tildes, asi que "ana",
 * "Ana" y "Aná" quedan juntas en vez de en tres sitios distintos.
 */
const comparador = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/**
 * Ordena una copia. **No toca el arreglo original**: `sort` muta, y mutar un
 * arreglo que vino del estado de React hace que la lista no se repinte -React
 * compara por referencia y la referencia no cambio-.
 */
export function ordenarHistorial<T extends FilaOrdenable>(
  filas: T[],
  criterio: CriterioDeOrden,
  direccion: DireccionDeOrden,
): T[] {
  const signo = direccion === 'asc' ? 1 : -1;

  return [...filas].sort((a, b) => {
    if (criterio === 'lead') {
      const porNombre = comparador.compare(a.leadName, b.leadName);
      // Empate: dos envios al mismo lead se ordenan por fecha, del mas nuevo al
      // mas viejo. Sin este desempate el orden entre ellos es el que trajo la
      // consulta, o sea arbitrario, y cambia entre recargas sin motivo visible.
      return porNombre !== 0 ? signo * porNombre : desempatarPorFecha(a, b);
    }

    if (criterio === 'plantilla') {
      const porPlantilla = comparador.compare(a.templateNombre, b.templateNombre);
      return porPlantilla !== 0 ? signo * porPlantilla : desempatarPorFecha(a, b);
    }

    return signo * comparador.compare(a.sentAt, b.sentAt);
  });
}

/** Del mas nuevo al mas viejo, sin importar la direccion del criterio principal. */
function desempatarPorFecha(a: FilaOrdenable, b: FilaOrdenable): number {
  return b.sentAt.localeCompare(a.sentAt);
}

/**
 * Los rotulos del selector.
 *
 * Criterio y direccion van FUNDIDOS en una sola lista, y no en un selector mas
 * una flecha aparte. Dos motivos: en 336px un control es lo que hay, no dos; y
 * una flecha suelta de 10px no dice hacia donde ordena -"arriba" en fechas
 * puede significar lo mas nuevo o lo mas viejo segun a quien le preguntes-.
 *
 * Con palabras no hay ambiguedad posible: "Más recientes primero" solo se puede
 * leer de una manera.
 */
export const ORDENES: { value: string; label: string; criterio: CriterioDeOrden; direccion: DireccionDeOrden }[] = [
  { value: 'fecha-desc', label: 'Más recientes primero', criterio: 'fecha', direccion: 'desc' },
  { value: 'fecha-asc', label: 'Más antiguos primero', criterio: 'fecha', direccion: 'asc' },
  { value: 'lead-asc', label: 'Lead, de la A a la Z', criterio: 'lead', direccion: 'asc' },
  { value: 'lead-desc', label: 'Lead, de la Z a la A', criterio: 'lead', direccion: 'desc' },
  { value: 'plantilla-asc', label: 'Plantilla, de la A a la Z', criterio: 'plantilla', direccion: 'asc' },
  { value: 'plantilla-desc', label: 'Plantilla, de la Z a la A', criterio: 'plantilla', direccion: 'desc' },
];

/** El orden por defecto: lo ultimo que se mando, arriba. */
export const ORDEN_POR_DEFECTO = 'fecha-desc';

export function ordenPorValor(value: string): { criterio: CriterioDeOrden; direccion: DireccionDeOrden } {
  const encontrado = ORDENES.find((orden) => orden.value === value);

  // Un valor desconocido cae al defecto en vez de romper: puede venir de una
  // preferencia guardada por una version anterior.
  if (!encontrado) return { criterio: 'fecha', direccion: 'desc' };

  // Se reconstruye el objeto en vez de devolver `encontrado` tal cual: el
  // catalogo tambien lleva `value` y `label`, y devolverlos aca haria que los
  // llamadores pudieran depender de campos que esta funcion no promete.
  return { criterio: encontrado.criterio, direccion: encontrado.direccion };
}
