import LoadingOverlay from '../components/LoadingOverlay';
import type { Page } from '../types';
import { Icon } from '../utils/icons';
import { useAgenda } from '../hooks/useAgenda';
import AgendaAppointmentCard from '../components/agenda/AgendaAppointmentCard';
import AgendaCancelledRow from '../components/agenda/AgendaCancelledRow';

interface AgendaPageProps {
  onNavigate: (page: Page) => void;
}

export default function AgendaPage({ onNavigate }: AgendaPageProps) {
  const agenda = useAgenda();

  const openLead = (leadId?: string) => {
    if (!leadId) return;
    window.location.hash = `#leads?lead=${leadId}`;
    onNavigate('leads');
  };

  if (agenda.loading) {
    return <LoadingOverlay message="Cargando agenda..." />;
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in p-3 flex flex-col gap-3">
      <div className="flex justify-end mb-4">
        <button type="button" onClick={() => onNavigate('settings')} className="btn btn-ghost btn-sm">
          Configurar
        </button>
      </div>

      {(agenda.message || agenda.error) && (
        <div
          className={`text-xs p-2 rounded-[var(--radius-md)] border ${agenda.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}
        >
          {agenda.error || agenda.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Citas activas</h3>
        <span className="text-[11px] text-slate-400">{agenda.activeAppointments.length} activas</span>
      </div>

      <div className="flex flex-col gap-3">
        {agenda.activeAppointments.length === 0 ? (
          <p className="text-xs text-slate-400 border-y border-[var(--color-border)] py-4">No hay citas activas en el rango revisado.</p>
        ) : (
          agenda.activeAppointments.map((appointment) => (
            <AgendaAppointmentCard
              key={appointment.id}
              appointment={appointment}
              participants={agenda.getParticipantsForAppointment(appointment.id)}
              auditEvents={agenda.getAuditEventsForAppointment(appointment.id)}
              participantForm={agenda.getParticipantForm(appointment.id)}
              rescheduleForm={agenda.getRescheduleForm(appointment)}
              isBusy={agenda.appointmentActionId === appointment.id}
              participantsOpen={agenda.expandedParticipants[appointment.id] === true}
              historyOpen={agenda.expandedHistory[appointment.id] === true}
              isFocused={agenda.focusedAppointmentId === appointment.id}
              participantActionId={agenda.participantActionId}
              setRef={(node) => {
                agenda.appointmentRefs.current[appointment.id] = node;
              }}
              onOpenLead={openLead}
              onToggleParticipants={() =>
                agenda.setExpandedParticipants((current) => ({
                  ...current,
                  [appointment.id]: !(current[appointment.id] === true),
                }))
              }
              onToggleHistory={() =>
                agenda.setExpandedHistory((current) => ({
                  ...current,
                  [appointment.id]: !(current[appointment.id] === true),
                }))
              }
              onUpdateRescheduleForm={(patch) => agenda.updateRescheduleForm(appointment, patch)}
              onUpdateParticipantForm={(patch) => agenda.updateParticipantForm(appointment.id, patch)}
              onReschedule={() => void agenda.handleRescheduleAppointment(appointment)}
              onCancel={() => void agenda.handleCancelAppointment(appointment)}
              onAddParticipant={() => void agenda.handleAddParticipant(appointment)}
              onDeleteParticipant={(participantId) => void agenda.handleDeleteParticipant(appointment.id, participantId)}
            />
          ))
        )}
      </div>

      <div className="border-y border-[var(--color-border)] py-3">
        <button
          type="button"
          onClick={() => agenda.setShowCancelled((current) => !current)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500"
        >
          <span>Canceladas ({agenda.cancelledAppointments.length})</span>
          <span>{agenda.showCancelled ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
        </button>

        {agenda.showCancelled && (
          <div className="mt-3 flex flex-col gap-2">
            {agenda.cancelledAppointments.length === 0 ? (
              <p className="text-xs text-slate-400">No hay citas canceladas en el rango revisado.</p>
            ) : (
              agenda.cancelledAppointments.map((appointment) => (
                <AgendaCancelledRow
                  key={appointment.id}
                  appointment={appointment}
                  isFocused={agenda.focusedAppointmentId === appointment.id}
                  setRef={(node) => {
                    agenda.appointmentRefs.current[appointment.id] = node;
                  }}
                  onOpenLead={openLead}
                  onView={agenda.openFocusedAppointment}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
