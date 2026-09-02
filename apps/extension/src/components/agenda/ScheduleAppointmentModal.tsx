import { useState } from 'react';
import { Button, Field, Input, Modal, Panel, Textarea } from '../../design';
import { createAppointmentFromLead } from '../../services/agendaService';
import { getAppointmentSuccessMessage } from '../../utils/appointmentStatusCopy';
import { getErrorMessage } from '../../utils/errorMessage';
import { dateInDays, toIsoLocal } from '../../utils/appointmentDateTime';

interface Props {
  leadId: string;
  leadName: string;
  /** Arranca en esta fecha. Al cerrar una reunion se propone dentro de una semana. */
  fechaSugerida?: string;
  onAgendada: (mensaje: string) => void;
  onClose: () => void;
}

/**
 * Agendar una cita sin salir de donde se esta.
 *
 * Hasta ahora la unica via era el formulario de la ficha del lead, asi que al
 * cerrar una reunion y pedir "agendar otra cita" habia que sacar a la persona
 * de la agenda y llevarla al lead. Eso no es agendar, es navegar: obliga a
 * perder de vista lo que se estaba haciendo para volver despues.
 *
 * Reusa `createAppointmentFromLead`, la misma que usa la ficha, con su misma
 * sincronizacion con Google.
 */
export default function ScheduleAppointmentModal({
  leadId,
  leadName,
  fechaSugerida,
  onAgendada,
  onClose,
}: Props) {
  const [fecha, setFecha] = useState(fechaSugerida ?? dateInDays(7));
  const [hora, setHora] = useState('09:00');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const agendar = async () => {
    if (!fecha || !hora) {
      setError('Completa fecha y hora para agendar');
      return;
    }

    const startsAt = toIsoLocal(fecha, hora);
    // La comprobacion tambien la hace el servidor; aca evita el viaje y da el
    // aviso al lado del campo que hay que corregir.
    if (new Date(startsAt) <= new Date()) {
      setError('La cita debe ser futura');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      const resultado = await createAppointmentFromLead({ leadId, startsAt, note: nota });
      onAgendada(getAppointmentSuccessMessage('create', resultado.googleSyncStatus));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agendar la cita'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="340px" label={`Agendar cita con ${leadName}`}>
      <div className="flex flex-col">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-section-title font-semibold text-ink">Agendar otra cita</h2>
          <p className="mt-0.5 truncate text-micro text-ink-muted">{leadName}</p>
        </header>

        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Fecha">
              <Input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} />
            </Field>
            <Field label="Hora">
              <Input type="time" value={hora} onChange={(evento) => setHora(evento.target.value)} />
            </Field>
          </div>

          <Field label="Nota" hint="Para qué es la reunión. Se ve al preparar la cita.">
            <Textarea
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
              rows={2}
              placeholder="Ej: revisar la propuesta que quedó pendiente"
            />
          </Field>

          {error && (
            <Panel tone="danger">
              <p role="alert" className="text-micro">
                {error}
              </p>
            </Panel>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={() => void agendar()} disabled={guardando}>
            {guardando ? 'Agendando...' : 'Agendar'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
