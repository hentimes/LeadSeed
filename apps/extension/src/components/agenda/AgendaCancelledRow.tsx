import type { AgendaAppointment } from '../../types';
import { ESTADO_DE_CITA, formatDateTime } from './agendaFormat';

interface Props {
  appointment: AgendaAppointment;
  isFocused: boolean;
  setRef: (node: HTMLDivElement | null) => void;
  onOpenLead: (leadId?: string) => void;
  onView: (appointmentId: string) => void;
}

/**
 * UNA CITA CERRADA
 *
 * Fila plana, sin tarjeta: un elemento muerto no merece la misma superficie que
 * uno vivo.
 *
 * ## El boton "Agendar" que no agendaba
 *
 * Habia uno, y lo que hacia era `onOpenLead`: te sacaba de la Agenda y te
 * llevaba a la ficha del lead. El rotulo prometia crear una cita y hacia una
 * navegacion.
 *
 * Sobrevivio porque desde esta seccion NO SE PUEDE crear una cita -la unica via
 * es la ficha del lead-, asi que alguien ya habia sentido la falta y puso el
 * atajo con el nombre de lo que queria hacer. Se renombra a lo que de verdad
 * hace; crear desde aca es una funcion que todavia no existe.
 *
 * ## Las dos fechas, en una linea
 *
 * Eran dos parrafos de `text-[11px]` -tamaño escrito a mano, fuera de la
 * escala-. Van juntas: la que importa es cuando se cancelo, y la de creacion es
 * contexto.
 */
export default function AgendaCancelledRow({ appointment, isFocused, setRef, onOpenLead, onView }: Props) {
  const estado = ESTADO_DE_CITA[appointment.status] ?? null;

  return (
    <div
      ref={setRef}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
        isFocused ? 'bg-surface ring-1 ring-focus' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onView(appointment.id)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-meta font-medium text-ink">
            {appointment.leadName || 'Sin nombre'}
          </span>
          {estado && (
            <span className="shrink-0 text-micro text-ink-secondary">{estado.rotulo}</span>
          )}
        </span>
        <span className="block truncate text-micro text-ink-secondary">
          {formatDateTime(appointment.updatedAt)} · creada {formatDateTime(appointment.createdAt)}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpenLead(appointment.leadId)}
        className="shrink-0 rounded px-2 py-1 text-micro font-medium text-primary-ink transition-colors hover:underline"
      >
        Ver el lead
      </button>
    </div>
  );
}
