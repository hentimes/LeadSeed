import type { FlowChannel } from '../types';
import type { PuntoDeRetoma } from './flowResume';

/**
 * FILTRAR Y ORDENAR LA LISTA DE CANDIDATOS A UN FLUJO
 *
 * La pantalla de inscribir listaba los leads del canal por nombre y nada mas.
 * Con 1.900 leads y varios flujos en marcha eso deja sin respuesta las tres
 * preguntas con las que se decide a quien inscribir: a quien ya inscribi, en
 * cual, y por donde va.
 *
 * Puro -entra la agenda con lo que se sabe de ella, sale la agenda ordenada-,
 * sin DOM y sin red, asi que se prueba solo y sirve igual en la app movil. Es
 * el hermano de `recipientSort`, que hace lo mismo para el envio masivo.
 */

/** En que flujo esta un lead y por que paso va. Sale de `my_flow_positions`. */
export interface PosicionEnFlujo {
  leadId: string;
  flowId: string;
  flowName: string;
  channel: FlowChannel;
  /** Paso pendiente. Nulo si esta inscrito pero sin nada pendiente. */
  stepOrder: number | null;
  dueAt: string | null;
}

export type CriterioInscripcion = 'todos' | 'sin-flujo' | 'en-flujo' | 'con-envios';
export type CriterioOrdenCandidato = 'nombre' | 'flujo' | 'fase' | 'ya-recibio';

export interface CandidatoOrdenable {
  id?: string;
  name: string;
}

const comparador = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/**
 * Los que no tienen dato van AL FINAL en todos los criterios que no son el
 * nombre.
 *
 * Misma decision que en `recipientSort` y por el mismo motivo: quien ordena por
 * flujo esta buscando a los que ESTAN en uno. Si los sueltos fueran primero
 * -que son la mayoria- empujarian a los pocos que interesan fuera de la primera
 * pagina, que es justo lo que se queria mirar.
 */
const AL_FINAL = 1;

/** Todas las posiciones de un lead, indexadas para leerlas en O(1). */
export function indexarPosiciones(posiciones: PosicionEnFlujo[]): Map<string, PosicionEnFlujo[]> {
  const indice = new Map<string, PosicionEnFlujo[]>();
  for (const posicion of posiciones) {
    const previas = indice.get(posicion.leadId);
    if (previas) previas.push(posicion);
    else indice.set(posicion.leadId, [posicion]);
  }
  return indice;
}

/**
 * Si el lead ya ocupa el canal de este flujo.
 *
 * La 108 admite UNA inscripcion activa por lead y canal. Sin comprobarlo antes,
 * la base rechaza la inscripcion despues de pulsar, que es la peor forma de
 * enterarse: el error llega cuando ya decidiste.
 */
export function ocupaElCanal(
  posiciones: PosicionEnFlujo[] | undefined,
  canal: FlowChannel,
): PosicionEnFlujo | undefined {
  return posiciones?.find((posicion) => posicion.channel === canal);
}

/** La posicion que se muestra: la del canal del flujo si la hay, si no la primera. */
export function posicionVisible(
  posiciones: PosicionEnFlujo[] | undefined,
  canal: FlowChannel,
): PosicionEnFlujo | undefined {
  return ocupaElCanal(posiciones, canal) ?? posiciones?.[0];
}

/**
 * Filtra por la relacion del lead con el flujo. No muta el arreglo.
 *
 * `con-envios` es distinto de `en-flujo` y esa diferencia es la que faltaba.
 * Estar EN un flujo es tener una inscripcion; haber recibido sus mensajes es
 * otra cosa, y en este producto es el caso NORMAL: los flujos se arman despues
 * de haber estado escribiendo a mano, asi que hay gente que recibio el paso 2
 * sin haber estado inscrita nunca.
 *
 * Sin este filtro esa gente era invisible: no salia en "en algun flujo" -no lo
 * esta- y en "todos" quedaba mezclada entre mil. Justo los que hay que
 * inscribir.
 */
export function filtrarPorInscripcion<T extends CandidatoOrdenable>(
  candidatos: T[],
  criterio: CriterioInscripcion,
  posiciones: Map<string, PosicionEnFlujo[]>,
  puntos: Map<string, PuntoDeRetoma>,
): T[] {
  if (criterio === 'todos') return candidatos;

  if (criterio === 'con-envios') {
    return candidatos.filter(
      (candidato) => Boolean(candidato.id) && (puntos.get(candidato.id!)?.ultimoPasoHecho ?? 0) > 0,
    );
  }

  return candidatos.filter((candidato) => {
    const enAlguno = Boolean(candidato.id && (posiciones.get(candidato.id)?.length ?? 0) > 0);
    return criterio === 'en-flujo' ? enAlguno : !enAlguno;
  });
}

/**
 * Ordena una copia. No muta: mutar el arreglo que vino de un `useMemo` deja la
 * lista sin repintar, porque React compara por referencia.
 */
export function ordenarCandidatos<T extends CandidatoOrdenable>(
  candidatos: T[],
  criterio: CriterioOrdenCandidato,
  posiciones: Map<string, PosicionEnFlujo[]>,
  puntos: Map<string, PuntoDeRetoma>,
  canal: FlowChannel,
): T[] {
  if (criterio === 'nombre') {
    return [...candidatos].sort((a, b) => comparador.compare(a.name, b.name));
  }

  return [...candidatos].sort((a, b) => {
    const posA = a.id ? posicionVisible(posiciones.get(a.id), canal) : undefined;
    const posB = b.id ? posicionVisible(posiciones.get(b.id), canal) : undefined;

    if (criterio === 'ya-recibio') {
      // Mas avanzado primero: es a quien menos le falta, y por tanto a quien
      // conviene retomar antes.
      const a1 = (a.id ? puntos.get(a.id)?.ultimoPasoHecho : 0) ?? 0;
      const b1 = (b.id ? puntos.get(b.id)?.ultimoPasoHecho : 0) ?? 0;
      if (a1 === b1) return comparador.compare(a.name, b.name);
      if (a1 === 0) return AL_FINAL;
      if (b1 === 0) return -AL_FINAL;
      return b1 - a1;
    }

    if (!posA && !posB) return comparador.compare(a.name, b.name);
    if (!posA) return AL_FINAL;
    if (!posB) return -AL_FINAL;

    if (criterio === 'flujo') {
      const porNombre = comparador.compare(posA.flowName, posB.flowName);
      if (porNombre !== 0) return porNombre;
      // Dentro del mismo flujo, por fase: es como se lee una cohorte.
      return faseDe(posA) - faseDe(posB) || comparador.compare(a.name, b.name);
    }

    // 'fase': primero los que van mas atrasados en su flujo, que son los que
    // llevan mas tiempo sin avanzar.
    const porFase = faseDe(posA) - faseDe(posB);
    return porFase !== 0 ? porFase : comparador.compare(a.name, b.name);
  });
}

/**
 * La fase con la que se compara.
 *
 * Una inscripcion sin paso pendiente se cuenta como la fase mas alta posible:
 * no esta atrasada, esta esperando a que la base le cree el siguiente paso, y
 * ponerla primera la mezclaria con las que de verdad van retrasadas.
 */
function faseDe(posicion: PosicionEnFlujo): number {
  return posicion.stepOrder ?? Number.MAX_SAFE_INTEGER;
}

/** Los rotulos de los selectores, en el orden en que se ofrecen. */
export const INSCRIPCIONES_CANDIDATO: { value: CriterioInscripcion; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'con-envios', label: 'Ya recibió mensajes' },
  { value: 'sin-flujo', label: 'Sin flujo' },
  { value: 'en-flujo', label: 'En algún flujo' },
];

export const ORDENES_CANDIDATO: { value: CriterioOrdenCandidato; label: string }[] = [
  { value: 'nombre', label: 'Nombre' },
  { value: 'flujo', label: 'Flujo' },
  { value: 'fase', label: 'Fase' },
  { value: 'ya-recibio', label: 'Ya recibió' },
];
