import type { EstadoDeImportancia, PlaybookOption, PlaybookRunItem } from '../types';
import type { EntradaDeDeduccion, Resolucion } from './playbookBuckets';

/**
 * EL RESOLVEDOR: lo unico de esta familia que sabe que es un `PlaybookRunItem`.
 *
 * Traduce el estado del recorrido a la entrada que necesita el motor. Los otros
 * dos archivos -deduccion y redaccion- no conocen la forma de un punto, y por
 * eso se pueden probar con objetos de tres campos.
 */

/** Lo elegido en un punto: lo marcado con "si", en el orden en que se guardo. */
export function marcadasDe(item: PlaybookRunItem): PlaybookOption[] {
  const porId = new Map(item.options.map((o) => [o.id, o]));

  return item.selections
    .filter((s) => s.value === 'si')
    .map((s) => porId.get(s.id) ?? (s.label ? { id: s.id, label: s.label } : null))
    .filter((o): o is PlaybookOption => o !== null);
}

/**
 * Las opciones que un punto ofrece ahora mismo.
 *
 * Si tiene catalogo propio, ese. Si hereda, la union de lo que este marcado en
 * sus origenes **en este momento**: no se guarda, se deriva. Guardarlo seria
 * una tercera copia de la misma verdad, y el dia que discrepe de sus origenes
 * nadie sabria cual manda.
 */
export function opcionesDisponibles(
  item: PlaybookRunItem,
  todos: readonly PlaybookRunItem[],
): PlaybookOption[] {
  if (item.sourceRunItemIds.length === 0) return item.options;

  const origenes = todos.filter((candidato) => item.sourceRunItemIds.includes(candidato.id));
  const vistas = new Set<string>();
  const resultado: PlaybookOption[] = [];

  for (const origen of origenes) {
    for (const opcion of marcadasDe(origen)) {
      if (vistas.has(opcion.id)) continue;
      vistas.add(opcion.id);
      resultado.push(opcion);
    }
  }

  return resultado;
}

/** Lo clasificado en un punto de criterios, por id. */
export function clasificacionesDe(item: PlaybookRunItem): Map<string, EstadoDeImportancia> {
  const mapa = new Map<string, EstadoDeImportancia>();

  for (const seleccion of item.selections) {
    if (
      seleccion.value === 'indispensable' ||
      seleccion.value === 'flexible' ||
      seleccion.value === 'prescindible'
    ) {
      mapa.set(seleccion.id, seleccion.value);
    }
  }

  return mapa;
}

/**
 * Lo que se contesto al preguntar por una contradiccion.
 *
 * Vive en las `selections` DEL CHECKPOINT, no en el punto de origen. Corregir
 * el origen -desmarcar arriba o reclasificar- borraria que el cliente dijo las
 * dos cosas, y eso es un dato: aqui queda que las dijo y que, preguntado,
 * eligio una.
 */
export function resolucionesDe(checkpoint: PlaybookRunItem): Map<string, Resolucion> {
  const mapa = new Map<string, Resolucion>();

  for (const seleccion of checkpoint.selections) {
    if (seleccion.value === 'mejorar' || seleccion.value === 'prescindible') {
      mapa.set(seleccion.id, seleccion.value);
    }
  }

  return mapa;
}

/**
 * Arma la entrada del motor a partir de los puntos que alimentan un checkpoint.
 *
 * Devuelve `null` cuando el checkpoint no tiene fuentes con los roles que hacen
 * falta: la pantalla pinta el aviso de "todavia falta responder" en vez de una
 * frase a medias, y nada revienta.
 */
export function resolverEntrada(
  checkpoint: PlaybookRunItem,
  todos: readonly PlaybookRunItem[],
): EntradaDeDeduccion | null {
  const fuentes = todos.filter((item) => checkpoint.sourceRunItemIds.includes(item.id));

  const deMejora = fuentes.find((item) => item.intentRole === 'mejorar');
  const deImportancia = fuentes.find((item) => item.intentRole === 'importancia');
  const dePrioridad = fuentes.find((item) => item.intentRole === 'prioridad');

  if (!deMejora && !deImportancia) return null;

  const marcadas = deMejora ? marcadasDe(deMejora) : [];

  /*
   * La prioridad no crea bucket: ORDENA. Lo elegido va primero y el resto
   * conserva su orden. Es lo unico que hace ese punto.
   */
  const prioritarias = new Set(dePrioridad ? marcadasDe(dePrioridad).map((o) => o.id) : []);
  const mejorar = [
    ...marcadas.filter((o) => prioritarias.has(o.id)),
    ...marcadas.filter((o) => !prioritarias.has(o.id)),
  ];

  const clasificables = deImportancia ? opcionesDisponibles(deImportancia, todos) : [];
  const importancia = deImportancia ? clasificacionesDe(deImportancia) : new Map();

  // Todo lo nombrable, para poder rotular lo huerfano: lo que se clasifico un
  // dia y hoy ya no esta marcado arriba.
  const catalogo = new Map<string, PlaybookOption>();
  for (const fuente of fuentes) {
    for (const opcion of fuente.options) catalogo.set(opcion.id, opcion);
  }

  return {
    mejorar,
    clasificables,
    importancia,
    catalogo: [...catalogo.values()],
    resoluciones: resolucionesDe(checkpoint),
  };
}
