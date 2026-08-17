import type { AgendaAppointment } from '../../types';
import { formatDateTime } from './agendaFormat';
import { Button } from '../../design';

interface Props {
  appointment: AgendaAppointment;
  isFocused: boolean;
  setRef: (node: HTMLDivElement | null) => void;
  onOpenLead: (leadId?: string) => void;
  onView: (appointmentId: string) => void;
}

export default function AgendaCancelledRow({ appointment, isFocused, setRef, onOpenLead, onView }: Props) {
  return (
    <div
      ref={setRef}
      className={`border-l-2 border-line pl-3 py-1 rounded-r ${isFocused ? 'bg-surface ring-1 ring-line' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenLead(appointment.leadId)}
          className="text-xs font-semibold text-ink truncate hover:text-blue-700 text-left"
        >
          {appointment.leadName}
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            onClick={() => onView(appointment.id)}
            variant="ghost"
            size="sm"
          >
            Ver
          </Button>
          <Button
            type="button"
            onClick={() => onOpenLead(appointment.leadId)}
            variant="ghost"
            size="sm"
          >
            Agendar
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-ink-muted">Creada: {formatDateTime(appointment.createdAt)}</p>
      <p className="text-[11px] text-ink-muted">Cancelada: {formatDateTime(appointment.updatedAt)}</p>
    </div>
  );
}
