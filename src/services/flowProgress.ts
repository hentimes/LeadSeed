import type { FlowStepStatus, MessageFlowProgress, MessageFlowStep } from '../types';

/**
 * Lo que la interfaz necesita saber de un lead dentro de un flujo.
 */
export interface FlowLeadProgress {
  /** Pasos con algo registrado, omitido o fallido. */
  completados: number;
  total: number;
  /** El paso que toca ahora, si hay alguno. Nulo si termino o si nada vence aun. */
  siguiente: MessageFlowStep | null;
  /** Estado del paso siguiente, para poder distinguir "toca" de "aun no". */
  estadoSiguiente: FlowStepStatus | null;
  /** Cuando vence el siguiente. Nulo si no esta calculado. */
  venceAt: string | null;
  /** No queda nada por hacer: todos los pasos salieron de `pendiente`/`toca`. */
  terminado: boolean;
}

/** Un paso deja de estar por hacer cuando se registro, se omitio o fallo. */
const RESUELTOS: ReadonlySet<FlowStepStatus> = new Set<FlowStepStatus>([
  'registrado',
  'omitido',
  'fallido',
]);

/**
 * Resume donde va un lead dentro de un flujo.
 *
 * Vive aparte y sin tocar la base de datos porque es la unica parte del flujo
 * con reglas de negocio de verdad, y porque los casos que la rompen son los
 * raros: pasos reordenados despues de inscribir, un paso sin fila de progreso,
 * una inscripcion cerrada a mitad. Todos se pueden escribir como test.
 *
 * **Que decide esta funcion y que no.** Aqui se resume el estado que la base ya
 * escribio; no se decide si un paso vence ni se avanza nada. Eso pasa en la
 * base, que es donde puede ser atomico. Si esta funcion empezara a inferir
 * estados, habria dos autoridades sobre lo mismo y acabarian discrepando.
 *
 * Los pasos se ordenan por `stepOrder` y no se confia en el orden de llegada:
 * un flujo se puede reordenar despues de haber inscrito gente.
 */
export function computeFlowProgress(
  pasos: MessageFlowStep[],
  progreso: MessageFlowProgress[]
): FlowLeadProgress {
  const ordenados = [...pasos].sort((a, b) => a.stepOrder - b.stepOrder);
  const porPaso = new Map(progreso.map((p) => [p.stepId, p]));

  let completados = 0;
  let siguiente: MessageFlowStep | null = null;
  let filaSiguiente: MessageFlowProgress | undefined;

  for (const paso of ordenados) {
    const fila = porPaso.get(paso.id);

    // Un paso sin fila de progreso cuenta como pendiente, no como hecho. Pasa
    // cuando se agrega un paso a un flujo que ya tiene gente inscrita.
    if (fila && RESUELTOS.has(fila.status)) {
      completados++;
      continue;
    }

    if (siguiente === null) {
      siguiente = paso;
      filaSiguiente = fila;
    }
  }

  return {
    completados,
    total: ordenados.length,
    siguiente,
    estadoSiguiente: siguiente === null ? null : (filaSiguiente?.status ?? 'pendiente'),
    venceAt: filaSiguiente?.dueAt ?? null,
    terminado: ordenados.length > 0 && siguiente === null,
  };
}

/**
 * Si el paso siguiente ya se puede enviar.
 *
 * Se compara contra un `ahora` que se recibe en vez de leer el reloj dentro:
 * asi la funcion es determinista y el test no depende de la hora a la que se
 * ejecute.
 */
export function tocaAhora(progreso: FlowLeadProgress, ahora: Date): boolean {
  if (progreso.siguiente === null) return false;
  if (progreso.estadoSiguiente === 'toca') return true;
  if (progreso.estadoSiguiente !== 'pendiente') return false;
  // Sin fecha de vencimiento no se puede afirmar que toque.
  if (progreso.venceAt === null) return false;
  return new Date(progreso.venceAt).getTime() <= ahora.getTime();
}

/**
 * Estado de cada paso, en orden, para pintar el riel de progreso.
 *
 * Un paso sin fila de progreso sale como `pendiente`, no se omite: si se
 * saltara, el riel tendria menos segmentos que pasos y el lead pareceria ir
 * mas adelantado de lo que va.
 */
export function estadosDePasos(
  pasos: MessageFlowStep[],
  progreso: MessageFlowProgress[]
): FlowStepStatus[] {
  const porPaso = new Map(progreso.map((p) => [p.stepId, p]));
  return [...pasos]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((paso) => porPaso.get(paso.id)?.status ?? 'pendiente');
}
