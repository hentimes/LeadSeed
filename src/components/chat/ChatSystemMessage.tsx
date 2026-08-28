import type { ChatMessage } from '../../types';

/**
 * Aviso generado por el sistema: la sala se pauso, la sala se reabrio.
 *
 * Antes se dibujaba igual que un anuncio del staff -bloque ambar a ancho
 * completo con icono y firma- porque compartia la bandera `is_announcement`.
 * En una sala que se pausa y se reanuda un par de veces eso son cuatro bloques
 * grandes que tapan la conversacion, para decir algo que nadie escribio.
 *
 * Ahora es una linea centrada, chiquita y en cursiva, entre guiones: se lee al
 * pasar y no compite con los mensajes de las personas. Mismo tratamiento que el
 * separador de dia, con el que comparte fila visual.
 */
export default function ChatSystemMessage({ message }: { message: ChatMessage }) {
  return (
    <p className="px-4 py-0.5 text-center text-micro italic text-ink-muted">
      — {message.content} —
    </p>
  );
}
