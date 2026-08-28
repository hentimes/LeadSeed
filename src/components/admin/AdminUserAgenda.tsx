import { useEffect, useMemo, useState } from 'react';
import type { AgendaAppointment, Profile } from '../../types';
import { loadAdminUserAgenda } from '../../services/adminService';
import { getDefaultAgendaRange } from '../../services/agendaService';
import { getGoogleSyncPendingSummary } from '../../utils/appointmentStatusCopy';
import { getErrorMessage } from '../../utils/errorMessage';
import { formatearFechaHora } from '../../utils/date';
import { Badge, Button, EmptyState, ListPanel, ListRow, Notice } from '../../design';
import AdminSkeleton from './AdminSkeleton';

const ESTADOS_CERRADOS = new Set(['cancelada', 'rechazada', 'completada', 'no_asistio']);

/**
 * La agenda del usuario observado, solo lectura.
 *
 * Era una pestana propia con su cabecera, su fila de tres contadores y dos
 * secciones de tarjetas de cuatro campos cada una. En un panel estrecho eso
 * son varias pantallas de scroll para una lista de citas que casi siempre
 * tiene menos de diez.
 *
 * Ahora es una lista mas dentro de "Datos", con las cerradas plegadas: lo que
 * importa de una agenda ajena es lo que todavia esta por pasar.
 */
export default function AdminUserAgenda({ selectedUser }: { selectedUser: Profile }) {
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarCerradas, setMostrarCerradas] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function cargar(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        const rango = getDefaultAgendaRange(30);
        const siguientes = await loadAdminUserAgenda(selectedUser.id, rango.from, rango.to);
        if (!cancelled) setAppointments(siguientes);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'No se pudo cargar la agenda observada'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void cargar();
    return () => {
      cancelled = true;
    };
  }, [selectedUser.id]);

  const activas = useMemo(
    () => appointments.filter((cita) => !ESTADOS_CERRADOS.has(cita.status)),
    [appointments],
  );
  const cerradas = useMemo(
    () => appointments.filter((cita) => ESTADOS_CERRADOS.has(cita.status)),
    [appointments],
  );

  const visibles = mostrarCerradas ? cerradas : activas;

  if (loading) return <AdminSkeleton rows={2} />;
  if (error) return <Notice>{error}</Notice>;

  return (
    <ListPanel
      title="Agenda"
      count={`${activas.length} activas`}
      maxHeight="max-h-[280px]"
      headerActions={
        cerradas.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setMostrarCerradas((visible) => !visible)}>
            {mostrarCerradas ? 'Ver activas' : `Cerradas (${cerradas.length})`}
          </Button>
        ) : undefined
      }
      empty={
        <EmptyState
          title={mostrarCerradas ? 'Sin citas cerradas' : 'Sin citas activas'}
          description="En los próximos 30 días."
        />
      }
    >
      {visibles.length === 0
        ? null
        : visibles.map((cita) => {
            const googlePendiente = cita.googleSyncStatus === 'error';
            return (
              <ListRow key={cita.id} density="compact" className="items-start">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-micro font-medium text-ink">{cita.leadName}</p>
                  <p className="truncate text-micro text-ink-muted">
                    {formatearFechaHora(cita.startsAt)} · {cita.sourceChannel}
                  </p>
                  {googlePendiente && (
                    <p
                      className="mt-1 text-micro text-state-warning"
                      title={cita.googleSyncError || getGoogleSyncPendingSummary(cita)}
                    >
                      Google pendiente
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge tone={mostrarCerradas ? 'neutral' : 'info'}>{cita.status}</Badge>
                  {cita.meetLink && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(cita.meetLink, '_blank', 'noopener,noreferrer')}
                    >
                      Meet
                    </Button>
                  )}
                </div>
              </ListRow>
            );
          })}
    </ListPanel>
  );
}
