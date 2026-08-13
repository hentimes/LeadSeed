import type { AgendaAppointment, AppointmentAuditEvent, AppointmentParticipant } from '../../types';
import { getGoogleSyncBadgeLabel, getGoogleSyncPendingSummary } from '../../utils/appointmentStatusCopy';
import { Icon } from '../../utils/icons';
import type { ParticipantFormState, RescheduleFormState } from '../../hooks/useAgenda';
import { EVENT_TYPE_LABELS, formatAuditEventSummary, formatDateTime, getAppointmentNotice, openMeetLink } from './agendaFormat';
import { Button } from '../../design';

interface Props {
  appointment: AgendaAppointment;
  participants: AppointmentParticipant[];
  auditEvents: AppointmentAuditEvent[];
  participantForm: ParticipantFormState;
  rescheduleForm: RescheduleFormState;
  isBusy: boolean;
  participantsOpen: boolean;
  historyOpen: boolean;
  isFocused: boolean;
  participantActionId: string;
  setRef: (node: HTMLDivElement | null) => void;
  onOpenLead: (leadId?: string) => void;
  onToggleParticipants: () => void;
  onToggleHistory: () => void;
  onUpdateRescheduleForm: (patch: Partial<RescheduleFormState>) => void;
  onUpdateParticipantForm: (patch: Partial<ParticipantFormState>) => void;
  onReschedule: () => void;
  onCancel: () => void;
  onAddParticipant: () => void;
  onDeleteParticipant: (participantId: string) => void;
}

export default function AgendaAppointmentCard({
  appointment,
  participants,
  auditEvents,
  participantForm,
  rescheduleForm,
  isBusy,
  participantsOpen,
  historyOpen,
  isFocused,
  participantActionId,
  setRef,
  onOpenLead,
  onToggleParticipants,
  onToggleHistory,
  onUpdateRescheduleForm,
  onUpdateParticipantForm,
  onReschedule,
  onCancel,
  onAddParticipant,
  onDeleteParticipant,
}: Props) {
  const notice = getAppointmentNotice(appointment);
  const googleSyncBadgeLabel = getGoogleSyncBadgeLabel(appointment);
  const googlePendingSummary = getGoogleSyncPendingSummary(appointment);

  return (
    <div
      ref={setRef}
      className={`border-l-2 pl-3 py-2 rounded-r bg-surface-muted ${isFocused ? 'bg-surface ring-1 ring-line' : ''} ${notice ? 'border-l-amber-500' : 'border-l-[var(--color-primary)]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenLead(appointment.leadId)}
          className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate hover:text-blue-700 text-left"
        >
          {appointment.leadName}
        </button>
        <div className="flex items-center gap-1">
          {isFocused && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Seleccionada</span>}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{appointment.status}</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        {formatDateTime(appointment.startsAt)} - {appointment.sourceChannel}
      </p>

      {(notice || appointment.meetLink || googleSyncBadgeLabel) && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {notice && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
              {notice}
            </span>
          )}
          {googleSyncBadgeLabel && (
            <span
              className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded"
              title={appointment.googleSyncError || googlePendingSummary}
            >
              {googleSyncBadgeLabel}
            </span>
          )}
          {appointment.meetLink && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openMeetLink(appointment.meetLink as string)}
            >
              Abrir Meet
            </Button>
          )}
        </div>
      )}

      {googlePendingSummary && <p className="mt-1 text-[10px] leading-4 text-amber-800">{googlePendingSummary}</p>}

      <div className="mt-2 grid grid-cols-[1fr_0.8fr] sm:grid-cols-[1fr_0.8fr_92px_72px] gap-1.5">
        <input
          type="date"
          value={rescheduleForm.date}
          onChange={(event) => onUpdateRescheduleForm({ date: event.target.value })}
          className="border border-line rounded-sm px-2 py-1 text-[11px] bg-surface-muted"
        />
        <input
          type="time"
          value={rescheduleForm.time}
          onChange={(event) => onUpdateRescheduleForm({ time: event.target.value })}
          className="border border-line rounded-sm px-2 py-1 text-[11px] bg-surface-muted"
        />
        <Button type="button" variant="ghost" size="sm" onClick={onReschedule} disabled={isBusy}>
          Reprogramar
        </Button>
        <Button type="button" variant="ghost-danger" size="sm" onClick={onCancel} disabled={isBusy}>
          Cancelar
        </Button>
      </div>

      <div className="mt-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onToggleParticipants} className="text-[11px] font-semibold text-slate-500 hover:text-blue-700">
            Participantes ({participants.length})
          </button>
          <button type="button" onClick={onToggleHistory} className="text-[11px] font-semibold text-slate-500 hover:text-blue-700">
            Historial ({auditEvents.length})
          </button>
        </div>

        {participantsOpen && (
          <div className="mt-2 border-t border-line pt-2">
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {participants.map((participant) => (
                  <span
                    key={participant.id}
                    className="inline-flex items-center gap-1 text-[10px] border border-line px-1.5 py-0.5 rounded-sm text-[var(--color-text)]"
                    title={participant.googleSyncError || participant.invitationStatus}
                  >
                    <span>{participant.name || participant.email}</span>
                    <span className="text-[9px] uppercase tracking-wide text-slate-400">{participant.invitationStatus}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteParticipant(participant.id)}
                      disabled={participantActionId === participant.id}
                      className="text-slate-400 hover:text-red-600 disabled:opacity-40"
                      title="Quitar participante"
                    >
                      <Icon.Close />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[0.8fr_1fr_72px] gap-1.5">
              <input
                value={participantForm.name}
                onChange={(event) => onUpdateParticipantForm({ name: event.target.value })}
                placeholder="Nombre"
                className="border border-line rounded-sm px-2 py-1 text-[11px] bg-surface-muted"
              />
              <input
                value={participantForm.email}
                onChange={(event) => onUpdateParticipantForm({ email: event.target.value })}
                placeholder="email@dominio.cl"
                className="border border-line rounded-sm px-2 py-1 text-[11px] bg-surface-muted"
              />
              <Button type="button" variant="ghost" size="sm" onClick={onAddParticipant} disabled={participantActionId === appointment.id}>
                Agregar
              </Button>
            </div>
          </div>
        )}

        {historyOpen && (
          <div className="mt-2 border-t border-line pt-2">
            {auditEvents.length === 0 ? (
              <p className="text-[11px] text-slate-400">Sin cambios registrados todavia.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {auditEvents.map((event) => (
                  <div key={event.id} className="border-l-2 border-l-slate-200 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {EVENT_TYPE_LABELS[event.eventType]}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDateTime(event.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{formatAuditEventSummary(event)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
