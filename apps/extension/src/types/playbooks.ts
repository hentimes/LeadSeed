/**
 * PLAYBOOKS: guiones de conversacion con seguimiento por lead.
 *
 * El vocabulario importa y esta fijado en la migracion 148:
 *
 *   Playbook  El PROCESO. "Asesoria PlanesPro". No tiene canal ni lead.
 *   Fase      Un MOMENTO del proceso. "Fase 1 - Primera reunion".
 *   Item      Un PUNTO QUE ABORDAR: titulo, pregunta y soporte.
 *   Recorrido Ese proceso APLICADO A UN LEAD. Dura semanas y abarca varias
 *             citas: NO es una reunion.
 *
 * Que un recorrido no sea una reunion es lo que decide casi todo lo demas. La
 * segunda reunion con el mismo lead CONTINUA el recorrido, no abre otro.
 */

/**
 * COMO se responde un punto. Lo lee la interfaz, nunca el motor.
 *
 * `texto` es el valor por defecto y lo que eran los diecisiete puntos antes de
 * que esto existiera.
 */
export type PlaybookAnswerType =
  | 'texto'
  | 'opciones_una'
  | 'opciones_multi'
  | 'criterios'
  | 'checkpoint';

/**
 * PARA QUE sirve la respuesta. Lo lee el motor, nunca la interfaz.
 *
 * Esta separacion es lo que mantiene el motor generico: no sabe que es una
 * isapre ni que significa "hospitalario", lee roles y etiquetas. Las opciones
 * concretas son contenido del playbook.
 */
export type PlaybookIntentRole = 'mejorar' | 'prioridad' | 'importancia';

/** Los tres estados con que se clasifica un criterio. */
export type EstadoDeImportancia = 'indispensable' | 'flexible' | 'prescindible';

export interface PlaybookOption {
  /**
   * Se acuña una vez y NO cambia nunca, aunque se reescriba la etiqueta: es la
   * clave por la que los puntos posteriores heredan y clasifican.
   */
  id: string;
  label: string;
}

/**
 * Una respuesta: que opcion y que se dijo de ella.
 *
 * Una sola forma para los cuatro tipos -la seleccion unica es esta misma con
 * un elemento- para no acabar con dos analisis y dos validaciones.
 */
export interface PlaybookSelection {
  id: string;
  /** `'si'` en las selecciones; uno de `EstadoDeImportancia` en la clasificacion. */
  value: string;
  /**
   * Solo en las entradas ad-hoc del "Otro: ___", cuyo `id` no esta en el
   * catalogo. Una frase de confirmacion que omite justo lo que el cliente dijo
   * con sus palabras es peor que no tener frase.
   */
  label?: string;
}

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PlaybookSection {
  id: string;
  playbookId: string;
  position: number;
  title: string;
}

export interface PlaybookItem {
  id: string;
  sectionId: string;
  position: number;
  title: string;
  question: string;
  support?: string;
  answerType: PlaybookAnswerType;
  intentRole?: PlaybookIntentRole;
  options: PlaybookOption[];
  /** De que puntos hereda sus opciones. El checkpoint declara aqui que resume. */
  sourceItemIds: string[];
}

/** El contenido completo de un playbook: sus fases y sus items. */
export interface PlaybookContent {
  sections: PlaybookSection[];
  items: PlaybookItem[];
}

export type PlaybookRunStatus = 'en_curso' | 'finalizado' | 'abandonado';

/**
 * Los tres estados de un punto del guion.
 *
 * `hecho` significa "ya lo converse", NO "respondio que si". La diferencia no
 * es una sutileza: es lo que impide que esto se convierta en un formulario de
 * respuestas y lo que deja fuera, por ahora, cualquier ramificacion.
 */
export type PlaybookRunItemState = 'pendiente' | 'hecho' | 'no_aplica';

export interface PlaybookRun {
  id: string;
  playbookId: string;
  playbookName?: string;
  leadId: string;
  leadName?: string;
  originAppointmentId?: string;
  status: PlaybookRunStatus;
  abandonNote?: string;
  startedAt: string;
  endedAt?: string;
}

export interface PlaybookRunItem {
  id: string;
  runId: string;
  position: number;
  /** Copia historica: lo que se pregunto ese dia, no lo que dice hoy la definicion. */
  title: string;
  question: string;
  support?: string;
  sectionTitle: string;
  sectionPosition: number;
  state: PlaybookRunItemState;
  note?: string;
  /** Cuando quedo resuelto el punto. Lo sella la base, nunca el cliente. */
  answeredAt?: string;

  /** Copia historica: de estas etiquetas se deriva la frase que se le lee al cliente. */
  answerType: PlaybookAnswerType;
  intentRole?: PlaybookIntentRole;
  options: PlaybookOption[];
  sourceRunItemIds: string[];

  selections: PlaybookSelection[];
  /**
   * La frase de confirmacion EDITADA a mano.
   *
   * `undefined` significa "usa la derivada"; cadena vacia significa "se borro
   * a proposito". Por eso no vive en `note`: alli las dos serian lo mismo y la
   * frase quedaria indeleble.
   */
  checkpointText?: string;
}

export interface PlaybookRunNote {
  id: string;
  runId: string;
  kind: 'nota' | 'cierre';
  body: string;
  createdAt: string;
}

/**
 * El avance, contado POR FASE y no por recorrido.
 *
 * Con cuatro fases y sesenta y dos items, "8 de 62" no informa de nada: lo que
 * se conduce en una reunion es una fase.
 */
export interface PlaybookRunProgress {
  /** Resueltos: hechos mas no aplica. Es el numerador de "8 de 17". */
  resueltos: number;
  total: number;
  hechos: number;
  noAplica: number;
  pendientes: number;
}
