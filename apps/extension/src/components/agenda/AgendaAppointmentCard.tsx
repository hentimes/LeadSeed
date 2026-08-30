import { useRef, useState } from 'react';
import type { AgendaAppointment, AppointmentAuditEvent, AppointmentParticipant } from '../../types';
import { getGoogleSyncBadgeLabel, getGoogleSyncPendingSummary } from '../../utils/appointmentStatusCopy';
import { Icon } from '../../utils/icons';
import type { ParticipantFormState, RescheduleFormState } from '../../hooks/useAgenda';
import {
  EVENT_TYPE_LABELS,
  ESTADO_DE_CITA,
  ESTADO_DE_INVITACION,
  formatAuditEventSummary,
  formatDateTime,
  getAppointmentNotice,
  openMeetLink,
} from './agendaFormat';
import { Button, IconButton, Input } from '../../design';

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

/**
 * UNA CITA
 *
 * ## Que se compacto, y cuanto
 *
 * La tarjeta medía unos 150px. El reprogramador estaba SIEMPRE desplegado: dos
 * campos a ancho completo, permanentes en cada cita, para una accion que se usa
 * de vez en cuando. Con cuatro citas eran unos 230px de los 600 visibles
 * dedicados a formularios que nadie estaba usando.
 *
 * Peor: la grilla decia `grid-cols-[1fr_0.8fr] sm:grid-cols-[...4 columnas]`, y
 * como el `sm:` de Tailwind arranca en 640px y aca hay 336, **la maquetacion de
 * cuatro columnas que su autor diseño no se vio nunca**. Siempre cayeron en dos
 * filas.
 *
 * Ahora la fecha es un chip que dispara el selector nativo, y la tarjeta baja a
 * unos 87px.
 *
 * ## El estado, con tres portadores
 *
 * Punto de color + relleno del punto + la palabra. El color es el tercero: si lo
 * quitas, la fila sigue diciendo todo. Y `agendada` no se dibuja: es el caso por
 * defecto, y pintar veinte pastillas que dicen lo mismo no informa.
 *
 * ## El filete solo aparece cuando hay algo que decir
 *
 * Antes lo llevaban TODAS las tarjetas -moradas o ambar- asi que dejaba de
 * leerse. Ahora codifica urgencia, no estado: si la cita empieza pronto o si
 * Google fallo. El estado ya lo dice el punto, y decirlo dos veces es lo que
 * hacia que "VENCIDA" apareciera cuatro veces en las tareas.
 */
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
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [agregandoPersona, setAgregandoPersona] = useState(false);
  const fechaRef = useRef<HTMLInputElement>(null);

  const notice = getAppointmentNotice(appointment);
  const googleBadge = getGoogleSyncBadgeLabel(appointment);
  const googleResumen = getGoogleSyncPendingSummary(appointment);
  const estado = ESTADO_DE_CITA[appointment.status] ?? null;

  const googleFallo = appointment.googleSyncStatus === 'error';
  const filete = googleFallo
    ? 'bg-state-danger'
    : notice
      ? 'bg-state-warning-ink'
      : 'bg-transparent';

  /** Lo que hay en los dos campos, como un solo valor para el selector nativo. */
  const valorLocal =
    rescheduleForm.date && rescheduleForm.time ? `${rescheduleForm.date}T${rescheduleForm.time}` : '';

  const hayCambio =
    valorLocal !== '' && new Date(valorLocal).getTime() !== new Date(appointment.startsAt).getTime();

  return (
    <div
      ref={setRef}
      className={`relative overflow-hidden rounded-md border bg-surface px-3 py-2 ${
        isFocused ? 'border-primary ring-1 ring-focus' : 'border-line'
      }`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${filete}`} />

      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onOpenLead(appointment.leadId)}
          className="min-w-0 flex-1 truncate text-left text-card-title font-semibold text-ink transition-colors hover:text-primary-ink"
        >
          {appointment.leadName || 'Sin nombre'}
        </button>

        {/*
          `agendada` no se pinta: es el estado por defecto. Lo que ocupa ese
          sitio es la proximidad, que si varia y si se consulta.
        */}
        {estado && (
          <span className="flex shrink-0 items-center gap-1 text-micro font-semibold text-ink-secondary">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${estado.relleno ? estado.color : `border ${estado.borde}`}`}
            />
            {estado.rotulo}
          </span>
        )}
      </div>

      <p className="mt-0.5 truncate text-meta text-ink-secondary">
        {notice || formatDateTime(appointment.startsAt)}
        {googleBadge ? ' · ' : ''}
        {googleBadge && (
          <span className={googleFallo ? 'text-state-danger-ink' : 'text-state-warning-ink'}>
            {googleBadge}
          </span>
        )}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/*
          El selector NATIVO, disparado por el chip. No se dibuja uno propio: el
          del navegador se pinta fuera del arbol del documento, asi que ningun
          `overflow` puede recortarlo, y trae teclado. `datetime-local` y no dos
          campos: dos son dos aperturas y dos chances de dejar una a medias, que
          es justo lo que la validacion de "completá fecha y hora" atajaba.
        */}
        <button
          type="button"
          onClick={() => {
            const campo = fechaRef.current;
            if (!campo) return;
            if (typeof campo.showPicker === 'function') campo.showPicker();
            else campo.focus();
          }}
          className={`flex h-control-sm items-center gap-1.5 rounded-full px-2.5 text-meta transition-colors ${
            hayCambio
              ? 'bg-primary-soft font-semibold text-primary-ink'
              : 'bg-surface-sunken text-ink-secondary hover:text-ink'
          }`}
        >
          <span className="[&_svg]:h-2.5 [&_svg]:w-2.5">{Icon.Calendar()}</span>
          {hayCambio ? formatDateTime(valorLocal) : formatDateTime(appointment.startsAt)}
        </button>

        <input
          ref={fechaRef}
          type="datetime-local"
          value={valorLocal}
          onChange={(evento) => {
            const [fecha, hora] = evento.target.value.split('T');
            onUpdateRescheduleForm({ date: fecha ?? '', time: hora ?? '' });
          }}
          aria-hidden="true"
          tabIndex={-1}
          className="h-0 w-0 border-0 p-0"
        />

        {appointment.meetLink && (
          <button
            type="button"
            onClick={() => openMeetLink(appointment.meetLink!)}
            className="flex h-control-sm items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 text-meta text-ink-secondary transition-colors hover:text-ink"
          >
            Meet
          </button>
        )}

        {/* Con cero participantes no hay nada que abrir: no es un boton. */}
        {participants.length > 0 && (
          <button
            type="button"
            onClick={onToggleParticipants}
            aria-expanded={participantsOpen}
            className="flex h-control-sm items-center gap-1 rounded-full bg-surface-sunken px-2.5 text-meta tabular-nums text-ink-secondary transition-colors hover:text-ink"
          >
            <span className="[&_svg]:h-2.5 [&_svg]:w-2.5">{Icon.Users()}</span>
            {participants.length}
          </button>
        )}

        <span className="min-w-0 flex-1" />

        <IconButton
          icon={<Icon.More />}
          label={`Más acciones para la cita de ${appointment.leadName || 'este lead'}`}
          size="sm"
          onClick={() => setMenuAbierto((estaba) => !estaba)}
          aria-expanded={menuAbierto}
        />
      </div>

      {/*
        Reprogramar pide confirmacion explicita, al reves que la fecha de una
        tarea, que se guarda sola. La diferencia importa: esto escribe en Google
        Calendar y le llega un correo a otra persona.

        Y el boton NO existe hasta que hay algo que confirmar, en vez de estar
        deshabilitado: un primario apagado deja el rotulo en 1.04:1.
      */}
      {hayCambio && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-primary-soft px-2.5 py-1.5">
          <span className="min-w-0 flex-1 text-micro text-ink">
            Antes: {formatDateTime(appointment.startsAt)}
          </span>
          <Button size="sm" onClick={() => onUpdateRescheduleForm({ date: '', time: '' })}>
            Descartar
          </Button>
          <Button variant="primary" size="sm" onClick={onReschedule} disabled={isBusy}>
            Reprogramar
          </Button>
        </div>
      )}

      {menuAbierto && (
        <div className="mt-2 flex flex-col rounded-md border border-line bg-surface-sunken p-1">
          {auditEvents.length > 0 && (
            <button
              type="button"
              onClick={() => { onToggleHistory(); setMenuAbierto(false); }}
              className="flex min-h-[28px] items-center rounded px-2 text-left text-meta text-ink transition-colors hover:bg-surface-hover"
            >
              Ver el historial ({auditEvents.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => { setAgregandoPersona(true); setMenuAbierto(false); }}
            className="flex min-h-[28px] items-center rounded px-2 text-left text-meta text-ink transition-colors hover:bg-surface-hover"
          >
            Agregar a alguien
          </button>
          <button
            type="button"
            onClick={() => { onCancel(); setMenuAbierto(false); }}
            disabled={isBusy}
            className="flex min-h-[28px] items-center rounded px-2 text-left text-meta text-state-danger-ink transition-colors hover:bg-state-danger-soft"
          >
            Cancelar la cita
          </button>
        </div>
      )}

      {googleResumen && (
        <p className="mt-1.5 text-micro text-ink-secondary" title={appointment.googleSyncError || undefined}>
          {googleResumen}
        </p>
      )}

      {participantsOpen && participants.length > 0 && (
        <div className="mt-2 divide-y divide-line-soft rounded-md bg-surface-sunken px-2.5">
          {participants.map((persona) => {
            const invitacion = ESTADO_DE_INVITACION[persona.invitationStatus];
            return (
              <div key={persona.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta text-ink">{persona.name || persona.email}</span>
                  <span className="block truncate text-micro text-ink-secondary">
                    {persona.email}
                    {invitacion ? ` · ${invitacion}` : ''}
                  </span>
                </span>
                <IconButton
                  icon={<Icon.Close />}
                  label={`Quitar a ${persona.name || persona.email}`}
                  size="sm"
                  variant="ghost-danger"
                  disabled={participantActionId === persona.id}
                  onClick={() => onDeleteParticipant(persona.id)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/*
        El formulario de invitar tambien se pliega. Dos campos permanentes para
        algo que casi nunca se usa es el mismo problema que tenia el
        reprogramador.
      */}
      {agregandoPersona && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-md bg-surface-sunken p-2">
          <Input
            value={participantForm.name}
            onChange={(evento) => onUpdateParticipantForm({ name: evento.target.value })}
            placeholder="Nombre"
            aria-label="Nombre de la persona"
          />
          <Input
            type="email"
            value={participantForm.email}
            onChange={(evento) => onUpdateParticipantForm({ email: evento.target.value })}
            placeholder="correo@ejemplo.cl"
            aria-label="Correo de la persona"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setAgregandoPersona(false)}>
              Cerrar
            </Button>
            <Button variant="primary" size="sm" onClick={onAddParticipant} disabled={isBusy}>
              Invitar
            </Button>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="mt-2 flex flex-col gap-1.5 border-l border-line pl-2.5">
          {auditEvents.length === 0 ? (
            <p className="text-micro text-ink-secondary">Sin cambios registrados todavía.</p>
          ) : (
            auditEvents.map((evento) => (
              <div key={evento.id}>
                <p className="text-meta font-semibold text-ink-secondary">
                  {EVENT_TYPE_LABELS[evento.eventType] ?? evento.eventType}
                </p>
                <p className="text-micro text-ink-secondary">{formatAuditEventSummary(evento)}</p>
                <p className="text-micro tabular-nums text-ink-muted">
                  {formatDateTime(evento.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
