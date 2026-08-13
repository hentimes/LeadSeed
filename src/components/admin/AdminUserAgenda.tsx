import { useEffect, useMemo, useState } from 'react';
import type { AgendaAppointment, Profile } from '../../types';
import { loadAdminUserAgenda } from '../../services/adminService';
import { getDefaultAgendaRange } from '../../services/agendaService';
import { getGoogleSyncPendingSummary } from '../../utils/appointmentStatusCopy';
import { getErrorMessage } from '../../utils/errorMessage';

interface Props {
  selectedUser: Profile;
}

const CLOSED_STATUSES = new Set(['cancelada', 'rechazada', 'completada', 'no_asistio']);

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function openMeetLink(meetLink?: string): void {
  if (!meetLink) return;
  window.open(meetLink, '_blank', 'noopener,noreferrer');
}

export default function AdminUserAgenda({ selectedUser }: Props) {
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        const range = getDefaultAgendaRange(30);
        const nextAppointments = await loadAdminUserAgenda(selectedUser.id, range.from, range.to);
        if (!cancelled) setAppointments(nextAppointments);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'No se pudo cargar la agenda observada'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedUser.id]);

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => !CLOSED_STATUSES.has(appointment.status)),
    [appointments]
  );
  const closedAppointments = useMemo(
    () => appointments.filter((appointment) => CLOSED_STATUSES.has(appointment.status)),
    [appointments]
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500 animate-pulse">Cargando agenda observada...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800/80">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Agenda observada</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Vista de solo lectura de la agenda de {selectedUser.full_name || selectedUser.email}. No modifica la agenda principal del superadmin.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Total</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{appointments.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Activas</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{activeAppointments.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Cerradas</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{closedAppointments.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Activas</h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{activeAppointments.length}</span>
          </div>
          {activeAppointments.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin citas activas en el rango observado.</p>
          ) : (
            activeAppointments.map((appointment) => {
              const googlePendingSummary = getGoogleSyncPendingSummary(appointment);
              return (
                <article
                  key={appointment.id}
                  className="border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-3 bg-white dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{appointment.leadName}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        {formatDateTime(appointment.startsAt)} • {appointment.sourceChannel}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-blue-50 text-blue-700 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                      {appointment.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Canal</span>
                      <span>{appointment.sourceChannel}</span>
                    </div>
                    <div>
                      <span className="block uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Capture ref</span>
                      <span>{appointment.captureRef || '-'}</span>
                    </div>
                  </div>

                  {appointment.notes && (
                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{appointment.notes}</p>
                  )}

                  {(appointment.meetLink || appointment.googleSyncStatus === 'error') && (
                    <div className="mt-3 flex items-center gap-2">
                      {appointment.meetLink && (
                        <button
                          type="button"
                          onClick={() => openMeetLink(appointment.meetLink)}
                          className="px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold"
                        >
                          Abrir Meet
                        </button>
                      )}
                      {appointment.googleSyncStatus === 'error' && (
                        <span
                          className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md"
                          title={appointment.googleSyncError || googlePendingSummary}
                        >
                          Google pendiente
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cerradas</h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{closedAppointments.length}</span>
          </div>
          {closedAppointments.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin citas cerradas en el rango observado.</p>
          ) : (
            closedAppointments.map((appointment) => (
              <article
                key={appointment.id}
                className="border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-3 bg-slate-50/80 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{appointment.leadName}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Creada: {formatDateTime(appointment.createdAt)}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Cerrada: {formatDateTime(appointment.updatedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-200 text-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                    {appointment.status}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
