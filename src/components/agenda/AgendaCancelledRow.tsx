import type { AgendaAppointment } from '../../types';
import { formatDateTime } from './agendaFormat';

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
      className={`border-l-2 border-[var(--color-border)] pl-3 py-1 rounded-r ${isFocused ? 'bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-border)]' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenLead(appointment.leadId)}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate hover:text-blue-700 text-left"
        >
          {appointment.leadName}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onView(appointment.id)}
            className="btn btn-ghost text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)]"
          >
            Ver
          </button>
          <button
            type="button"
            onClick={() => onOpenLead(appointment.leadId)}
            className="btn btn-ghost text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)]"
          >
            Agendar
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">Creada: {formatDateTime(appointment.createdAt)}</p>
      <p className="text-[11px] text-slate-400">Cancelada: {formatDateTime(appointment.updatedAt)}</p>
    </div>
  );
}
