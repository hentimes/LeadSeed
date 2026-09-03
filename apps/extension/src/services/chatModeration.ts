/**
 * Reglas anti-spam del chat y de los mensajes directos.
 *
 * Es una barrera de uso, no de seguridad: corre en el cliente para dar aviso
 * inmediato y evitar el flood accidental. Las reglas duras (quien puede
 * escribir, en que sala) siguen siendo las politicas RLS.
 */

/** Ventana de control de frecuencia. */
const RATE_WINDOW_MS = 60_000;
const MAX_MESSAGES_PER_WINDOW = 10;
/** Intervalo minimo entre dos envios seguidos. */
const MIN_INTERVAL_MS = 1_500;

const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|ar|es|mx|cl|link|xyz)\b)/i;

/**
 * Lista corta y explicita. No pretende cubrir todo el idioma: apunta a los
 * terminos que aparecen en el spam comercial que llega a estas salas.
 */
const BANNED_WORDS = [
  'viagra',
  'casino',
  'porno',
  'xxx',
  'bitcoin gratis',
  'crypto gratis',
  'prestamo urgente',
  'dinero facil',
  'gana dinero',
  'clic aqui',
  'click aqui',
];

export interface ModerationContext {
  /** Momentos de los envios recientes, en milisegundos. */
  recentTimestamps: number[];
  /** Ultimo texto enviado, para detectar repeticion. */
  lastMessage?: string;
}

export interface ModerationResult {
  ok: boolean;
  reason?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Quita las tildes para que "préstamo" y "prestamo" den lo mismo.
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkMessage(content: string, context: ModerationContext): ModerationResult {
  const text = content.trim();
  if (!text) return { ok: false, reason: 'El mensaje está vacío.' };

  const normalized = normalize(text);
  const now = Date.now();

  const recent = context.recentTimestamps.filter((time) => now - time < RATE_WINDOW_MS);

  if (recent.length >= MAX_MESSAGES_PER_WINDOW) {
    return {
      ok: false,
      reason: `Estás enviando demasiados mensajes. Esperá un momento (máximo ${MAX_MESSAGES_PER_WINDOW} por minuto).`,
    };
  }

  const lastSent = recent[recent.length - 1];
  if (lastSent && now - lastSent < MIN_INTERVAL_MS) {
    return { ok: false, reason: 'Escribís demasiado rápido. Esperá un segundo.' };
  }

  if (context.lastMessage && normalize(context.lastMessage) === normalized) {
    return { ok: false, reason: 'Ya enviaste ese mismo mensaje.' };
  }

  if (URL_PATTERN.test(text)) {
    return { ok: false, reason: 'No se permiten enlaces en el chat.' };
  }

  const banned = BANNED_WORDS.find((word) => normalized.includes(word));
  if (banned) {
    return { ok: false, reason: 'El mensaje contiene contenido no permitido.' };
  }

  return { ok: true };
}

/** Registra un envio aceptado, descartando lo que ya salio de la ventana. */
export function registerSend(timestamps: number[], now = Date.now()): number[] {
  return [...timestamps.filter((time) => now - time < RATE_WINDOW_MS), now];
}
