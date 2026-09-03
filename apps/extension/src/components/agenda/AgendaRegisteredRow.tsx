import { useState } from 'react';
import { Badge, Button } from '../../design';
import { Icon } from '../../utils/icons';
import type { AgendaAppointment } from '../../types';
import { formatDateTime } from './agendaFormat';

interface Props {
  appointment: AgendaAppointment;
  onOpenLead: (leadId?: string) => void;
  /** Agendar la siguiente cita con este lead. */
  onAgendar: (cita: AgendaAppointment) => void;
  /** Sacar una tarea de esta reunion, despues de haberla cerrado. */
  onCrearTarea: (cita: AgendaAppointment) => void;
}

/**
 * UNA CITA YA REGISTRADA
 *
 * Se pintaba con la fila de las canceladas: nombre, estado y un enlace al
 * lead. Con eso no se podia responder la unica pregunta que se le hace a una
 * reunion pasada -que se hablo- porque la minuta no se veia en ninguna parte
 * de la aplicacion despues de escribirla.
 *
 * La fila se abre y muestra lo que se registro. El estado se pinta como
 * `Badge` y no como texto suelto: "Realizada" y "No asistio" son el dato por
 * el que se mira esta lista, y en gris junto al nombre se perdian.
 */
export default function AgendaRegisteredRow({
  appointment,
  onOpenLead,
  onAgendar,
  onCrearTarea,
}: Props) {
  const [abierta, setAbierta] = useState(false);

  const asistio = appointment.status === 'completada';
  const detalleId = `cita-registrada-${appointment.id}`;

  return (
    <div className="rounded-md border border-line bg-surface">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setAbierta((actual) => !actual)}
          aria-expanded={abierta}
          aria-controls={detalleId}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left focus:outline-none focus-visible:underline"
        >
          <span className={`shrink-0 text-ink-muted transition-transform ${abierta ? 'rotate-90' : ''}`}>
            <Icon.ChevronRight />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-meta font-medium text-ink">
              {appointment.leadName || 'Sin nombre'}
            </span>
            <span className="block truncate text-micro text-ink-secondary">
              {formatDateTime(appointment.startsAt)}
            </span>
          </span>
        </button>

        <Badge tone={asistio ? 'success' : 'warning'} className="shrink-0">
          {asistio ? 'Realizada' : 'No asistió'}
        </Badge>
      </div>

      {abierta && (
        <div id={detalleId} className="border-t border-line-soft px-2.5 py-2">
          {appointment.notes && (
            <div className="mb-2">
              <p className="text-micro font-semibold text-ink-secondary">Se agendó para</p>
              <p className="mt-0.5 whitespace-pre-wrap text-micro text-ink-muted">{appointment.notes}</p>
            </div>
          )}

          <p className="text-micro font-semibold text-ink-secondary">Minuta</p>
          <p className="mt-0.5 whitespace-pre-wrap text-micro text-ink">
            {appointment.outcomeNotes || (
              <span className="text-ink-muted">Se registró sin escribir minuta.</span>
            )}
          </p>

          {appointment.outcomeRecordedAt && (
            <p className="mt-2 text-micro text-ink-muted">
              Registrada el {formatDateTime(appointment.outcomeRecordedAt)}
            </p>
          )}

          {/*
            Lo que se puede hacer con una reunion ya cerrada.
 
            Estas dos acciones solo existian DENTRO del momento de registrar:
            si no se marcaba la casilla entonces, la reunion quedaba cerrada y
            no se le podia sacar nada mas. Aca siguen disponibles despues.
          */}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
            {appointment.leadId && (
              <>
                <Button size="sm" variant="ghost" onClick={() => onAgendar(appointment)}>
                  Agendar otra
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onCrearTarea(appointment)}>
                  Crear tarea
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenLead(appointment.leadId)}
              className="rounded px-2 py-1 text-micro font-medium text-primary transition-colors hover:underline"
            >
              Ver el lead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
