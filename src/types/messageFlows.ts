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

/** Por que salio un lead del flujo. Nulo mientras siga dentro. */
export type ExitReason =
  | 'convertido'
  | 'descartado'
  | 'fin_secuencia'
  | 'respondio'
  | 'manual'
  | 'otro_flujo';

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
