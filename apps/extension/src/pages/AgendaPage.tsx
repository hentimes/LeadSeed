import { useState } from 'react';
import LoadingOverlay from '../components/LoadingOverlay';
import type { Page } from '../types';
import { Icon } from '../utils/icons';
import { useAgenda } from '../hooks/useAgenda';
import AgendaAppointmentCard from '../components/agenda/AgendaAppointmentCard';
import AgendaCancelledRow from '../components/agenda/AgendaCancelledRow';
import { AgendaCalendar, type VistaDeCalendario } from '../components/agenda/AgendaCalendar';
import { Button, IconButton, SegmentedControl } from '../design';

/** Los dias que mira la agenda. Sale de `getDefaultAgendaRange(60)` en el hook. */
const DIAS_DEL_RANGO = 60;

/**
 * Las tres vistas del calendario.
 *
 * "Lista" no esta entre ellas, y eso es el punto: la lista no es una vista mas,
 * es el sitio donde se trabaja -es la unica donde se reprograma, se cancela y se
 * suman participantes-. El calendario contesta otra pregunta, "cuando estoy
 * ocupado", y por eso vive detras de un icono que se abre y se cierra en vez de
 * competir por un cuarto de una barra permanente.
 *
 * Los rotulos van siempre visibles -sin `collapseLabels`- porque "Dia", "Semana"
 * y "Mes" no tienen iconos que se distingan entre si: tres cuadraditos de
 * calendario obligarian a tocarlos para saber cual es cual.
 */
const VISTAS: { value: VistaDeCalendario; label: string }[] = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
];

interface AgendaPageProps {
  onNavigate: (page: Page) => void;
}

export default function AgendaPage({ onNavigate }: AgendaPageProps) {
  const agenda = useAgenda();
  /** `null` es la lista. El calendario esta cerrado hasta que se lo pide. */
  const [vista, setVista] = useState<VistaDeCalendario | null>(null);

  const openLead = (leadId?: string) => {
    if (!leadId) return;
    window.location.hash = `#leads?lead=${leadId}`;
    onNavigate('leads');
  };

  if (agenda.loading) {
    return <LoadingOverlay message="Cargando agenda..." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/*
        La cabecera en una fila. "Configurar" tenia su propia franja con 16px de
        margen -unos 50px de alto para un enlace que se toca una vez por
        instalacion- y ocupaba la esquina reservada a la accion principal.
      */}
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-meta font-semibold text-ink-secondary">
          Citas activas{' '}
          <span className="tabular-nums text-ink-muted">{agenda.activeAppointments.length}</span>
        </h2>
        {/*
          El calendario, detras de un interruptor.

          `aria-pressed` y no solo el color: es un boton que se queda encendido,
          y sin el atributo un lector de pantalla lo anuncia igual abierto que
          cerrado. Al apagarlo se vuelve a la lista, que es el estado por
          defecto.
        */}
        <IconButton
          icon={Icon.Calendar()}
          label={vista ? 'Cerrar el calendario' : 'Ver el calendario'}
          size="sm"
          variant={vista ? 'primary' : 'ghost'}
          aria-pressed={vista !== null}
          onClick={() => setVista((actual) => (actual ? null : 'semana'))}
        />
        <IconButton
          icon={Icon.Settings()}
          label="Configurar la agenda"
          size="sm"
          onClick={() => onNavigate('settings')}
        />
      </div>

      {/*
        El aviso: el TEXTO va en tinta normal, no en el color del estado.
 
        Antes eran seis literales de Tailwind en una linea
        (`bg-green-50 text-green-700` / `bg-red-50 text-red-700`), que no siguen
        al tema: en oscuro daban 1.05:1, o sea una franja blanca. Y el mensaje de
        exito llega a 110 caracteres -es prosa, no una etiqueta-, asi que el
        verde sobre su propio tinte, que da 2.18:1, no era negociable.
 
        El color lo lleva el fondo; el texto se lee en 16.6:1.
      */}
      {(agenda.message || agenda.error) && (
        <p
          role={agenda.error ? 'alert' : 'status'}
          className={`rounded-md px-3 py-2 text-meta text-ink ${
            agenda.error ? 'bg-state-danger-soft' : 'bg-state-success-soft'
          }`}
        >
          {agenda.error || agenda.message}
        </p>
      )}

      {vista !== null && (
        <div className="flex flex-col gap-2">
          {/* El selector solo existe con el calendario abierto: con el cerrado
              nombraria tres vistas que no se estan viendo. */}
          <SegmentedControl
            options={VISTAS}
            value={vista}
            onChange={setVista}
            label="Cómo ver el calendario"
            className="w-full [&>button]:flex-1"
          />

          <AgendaCalendar
            vista={vista}
            /*
              Solo las activas. Una cita cancelada dibujada en la rejilla
              ocuparia un horario que en realidad esta libre, que es justo lo
              contrario de para que sirve un calendario. Siguen visibles en su
              bloque de abajo.
            */
            appointments={agenda.activeAppointments}
            onCambiarPeriodo={(desde, hasta) => agenda.setRangoVisible({ desde, hasta })}
            onAbrirCita={(appointmentId) => {
              // Tocar una cita cierra el calendario y lleva a la lista, que es
              // donde se la puede tocar de verdad: la rejilla no reprograma ni
              // cancela.
              setVista(null);
              agenda.openFocusedAppointment(appointmentId);
            }}
          />
        </div>
      )}

      <div className={`flex flex-col gap-3 ${vista === null ? '' : 'hidden'}`}>
        {agenda.activeAppointments.length === 0 ? (
          /*
            "En el rango revisado" nombraba un limite que el usuario nunca vio.
            Son sesenta dias, fijos en el hook. Y se dice donde se crean las
            citas: hoy solo se pueden crear desde la ficha de un lead, asi que un
            vacio que no lo aclara parece que las perdio.
          */
          <div className="rounded-md border border-line bg-surface px-4 py-6 text-center">
            <p className="text-body text-ink-secondary">
              No hay citas en los próximos {DIAS_DEL_RANGO} días
            </p>
            <p className="mt-1 text-micro text-ink-secondary">
              Las citas se agendan desde la ficha de un lead.
            </p>
            <Button size="sm" className="mt-2" onClick={() => onNavigate('leads')}>
              Ver mis leads
            </Button>
          </div>
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

      {/* Las canceladas no acompanan al calendario: la rejilla no las dibuja
          -ocuparian un horario libre-, asi que un desplegable que promete
          canceladas debajo de una vista que no las tiene solo confunde. */}
      <div className={`border-y border-line py-3 ${vista === null ? '' : 'hidden'}`}>
        <button
          type="button"
          onClick={() => agenda.setShowCancelled((current) => !current)}
          className="flex w-full items-center justify-between text-meta font-semibold text-ink-secondary"
        >
          <span>Canceladas ({agenda.cancelledAppointments.length})</span>
          <span>{agenda.showCancelled ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
        </button>

        {agenda.showCancelled && (
          <div className="mt-3 flex flex-col gap-2">
            {agenda.cancelledAppointments.length === 0 ? (
              <p className="text-micro text-ink-secondary">Todavía no cancelaste ninguna cita.</p>
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
