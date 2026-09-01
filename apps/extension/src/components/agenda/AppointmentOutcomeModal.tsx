import { useState } from 'react';
import { Badge, Button, Checkbox, Field, Modal, Textarea } from '../../design';
import type { AgendaAppointment } from '../../types';
import type { CierreDeCita, TareaDeSeguimiento } from '../../services/appointmentOutcomeService';
import { formatDateTime } from './agendaFormat';

interface Props {
  cita: AgendaAppointment;
  guardando: boolean;
  onGuardar: (cierre: Omit<CierreDeCita, 'appointmentId'>) => void;
  onClose: () => void;
}

/**
 * Seguimientos que se proponen solos.
 *
 * Escribir el titulo de la tarea a mano es el paso en el que se abandona: se
 * acaba de terminar una reunion y lo ultimo que apetece es redactar. Estas
 * tres cubren lo que de verdad sale de una reunion de venta, y el texto se
 * puede editar antes de guardar.
 */
const SEGUIMIENTOS = [
  { id: 'cita', etiqueta: 'Agendar otra cita', titulo: 'Agendar nueva cita con {lead}', dias: 7 },
  { id: 'llamado', etiqueta: 'Programar llamado', titulo: 'Llamar a {lead}', dias: 2 },
  { id: 'mensaje', etiqueta: 'Enviar mensaje', titulo: 'Escribir a {lead}', dias: 1 },
] as const;

function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString();
}

/**
 * Minuta de una cita que ya paso.
 *
 * Responde tres cosas en una sola pantalla: si el contacto se conecto, que
 * paso, y que hay que hacer ahora. Antes no habia donde responder ninguna: la
 * cita se quedaba en 'agendada' para siempre y lo hablado no quedaba escrito
 * en ningun sitio.
 */
export default function AppointmentOutcomeModal({ cita, guardando, onGuardar, onClose }: Props) {
  const [asistio, setAsistio] = useState<boolean | null>(null);
  const [minuta, setMinuta] = useState('');
  const [comoNota, setComoNota] = useState(true);
  const [seguimientos, setSeguimientos] = useState<Set<string>>(new Set());

  const alternarSeguimiento = (id: string) => {
    setSeguimientos((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const tareas: TareaDeSeguimiento[] = SEGUIMIENTOS.filter((s) => seguimientos.has(s.id)).map((s) => ({
    title: s.titulo.replace('{lead}', cita.leadName),
    dueDateIso: enDias(s.dias),
  }));

  return (
    <Modal onClose={onClose} maxWidth="380px" label="Registrar cómo fue la reunión">
      <div className="flex max-h-[85vh] flex-col">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-section-title font-semibold text-ink">¿Cómo fue la reunión?</h2>
          <p className="mt-0.5 truncate text-micro text-ink-muted">
            {cita.leadName} · {formatDateTime(cita.startsAt)}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            <Field label="¿Se conectó el contacto?">
              <div className="flex gap-2">
                <Button
                  variant={asistio === true ? 'primary' : 'secondary'}
                  size="sm"
                  className="flex-1"
                  aria-pressed={asistio === true}
                  onClick={() => setAsistio(true)}
                >
                  Sí, se conectó
                </Button>
                <Button
                  variant={asistio === false ? 'danger' : 'secondary'}
                  size="sm"
                  className="flex-1"
                  aria-pressed={asistio === false}
                  onClick={() => setAsistio(false)}
                >
                  No asistió
                </Button>
              </div>
            </Field>

            {/* La nota con la que se agendo, delante: es el contexto que se
                necesita para escribir la de despues. */}
            {cita.notes && (
              <div className="rounded-md border border-line bg-surface-sunken px-2.5 py-2">
                <p className="text-micro font-semibold text-ink-secondary">Se agendó para</p>
                <p className="mt-0.5 whitespace-pre-wrap text-micro text-ink-muted">{cita.notes}</p>
              </div>
            )}

            <Field
              label="Minuta"
              hint={
                asistio === false
                  ? 'Opcional. Por ejemplo: avisó que no podía, no contestó.'
                  : 'Qué se habló, qué quedó pendiente.'
              }
            >
              <Textarea
                value={minuta}
                onChange={(evento) => setMinuta(evento.target.value)}
                rows={4}
                placeholder="Escribí lo que pasó en la reunión..."
              />
            </Field>

            {cita.leadId && (
              <Checkbox
                checked={comoNota}
                onChange={(evento) => setComoNota(evento.target.checked)}
                label="Guardar también como nota en la ficha del lead"
              />
            )}

            <Field label="Crear seguimiento" hint="Se agregan a Tareas, con fecha propuesta.">
              <div className="flex flex-col gap-1.5">
                {SEGUIMIENTOS.map((seguimiento) => (
                  <Checkbox
                    key={seguimiento.id}
                    checked={seguimientos.has(seguimiento.id)}
                    onChange={() => alternarSeguimiento(seguimiento.id)}
                    label={seguimiento.etiqueta}
                  />
                ))}
              </div>
            </Field>

            {tareas.length > 0 && (
              <Badge tone="primary" className="self-start">
                {tareas.length === 1 ? '1 tarea' : `${tareas.length} tareas`} al guardar
              </Badge>
            )}
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            // Sin responder lo primero no hay nada que registrar: el estado de
            // la cita sale justo de ahi.
            disabled={asistio === null || guardando}
            onClick={() =>
              onGuardar({
                attended: asistio === true,
                outcomeNotes: minuta,
                tambienComoNotaDelLead: comoNota,
                tareas,
              })
            }
          >
            Guardar
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
