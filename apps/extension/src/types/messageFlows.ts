/** Canal de un flujo. Un flujo es de un solo canal, nunca mixto. */
export type FlowChannel = 'whatsapp' | 'email' | 'call';

/**
 * Estado de un paso para un lead concreto.
 *
 * `registrado` **no significa entregado**. Con WhatsApp la aplicacion abre una
 * URL y no sabe si el mensaje salio, llego o se leyo; solo consta que se abrio
 * el chat. En pantalla eso se dice "Abierto en WhatsApp", nunca "Enviado".
 */
export type FlowStepStatus = 'pendiente' | 'toca' | 'registrado' | 'omitido' | 'fallido';

export type EnrollmentStatus = 'activa' | 'completada' | 'salida';

/**
 * Por que salio un lead del flujo. Nulo mientras siga dentro.
 *
 * Los dos ultimos no son formas de decir `manual`: marcan a la PERSONA, no a
 * esta inscripcion, y por eso impiden volver a inscribirla. Ver la migracion
 * 184.
 *
 *   `sin_whatsapp`  su numero no esta en WhatsApp. Cierra sus flujos de ese
 *                   canal y deja el correo y las llamadas intactos.
 *   `no_contactar`  pidio no recibir mas mensajes. Cierra todos sus flujos, de
 *                   todos los canales.
 */
export type ExitReason =
  | 'convertido'
  | 'descartado'
  | 'fin_secuencia'
  | 'respondio'
  | 'manual'
  | 'otro_flujo'
  | 'sin_whatsapp'
  | 'no_contactar';

/** Lo mas largo que puede ser el detalle de una salida. Lo exige la base. */
export const LARGO_MAXIMO_NOTA_DE_SALIDA = 50;

export interface MessageFlow {
  id: string;
  channel: FlowChannel;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MessageFlowStep {
  id: number;
  flowId: string;
  /** Posicion dentro de la secuencia, empezando en 1. Unica por flujo. */
  stepOrder: number;
  templateId: string;
  /** Dias de espera desde que se registro el paso anterior. Cero = enseguida. */
  waitDays: number;
}

export interface MessageFlowEnrollment {
  id: number;
  flowId: string;
  leadId: string;
  channel: FlowChannel;
  status: EnrollmentStatus;
  enrolledAt: string;
  exitedAt?: string;
  exitReason?: ExitReason;
  /**
   * El detalle escrito al sacarlo, hasta 50 caracteres.
   *
   * Es lo que convierte una salida en contexto: dentro de tres meses, "pidio
   * que lo llame en marzo" y "se enojo" son la misma `salida` sin esto.
   */
  exitNote?: string;
  /** Nombre del lead, resuelto en la consulta. */
  leadName?: string;
}

export interface MessageFlowProgress {
  id: number;
  enrollmentId: number;
  stepId: number;
  status: FlowStepStatus;
  /** Cuando le toca a este paso. Nulo si todavia no se pudo calcular. */
  dueAt?: string;
  dispatchedAt?: string;
  /** Apunta al registro de envio; el flujo no guarda copia de lo enviado. */
  sendLogId?: number;
}

/**
 * Una fila de la vista "Hoy": un paso que toca enviar.
 *
 * Trae ya resuelto lo que la pantalla necesita mostrar, para no pedir el lead y
 * la plantilla por separado en el cliente.
 */
export interface PendingFlowStep {
  progressId: number;
  enrollmentId: number;
  leadId: string;
  leadName: string;
  flowId: string;
  flowName: string;
  channel: FlowChannel;
  stepOrder: number;
  /** Cuantos pasos tiene el flujo, para poder decir "2 de 4". */
  totalSteps: number;
  templateId: string;
  templateName: string;
  dueAt?: string;
}
