import { useEffect, useState } from 'react';
import { Button, Field, Input, Modal, Panel, Textarea } from '../../design';
import { createAppointmentFromLead } from '../../services/agendaService';
import { getAppointmentSuccessMessage } from '../../utils/appointmentStatusCopy';
import { getErrorMessage } from '../../utils/errorMessage';
import { dateInDays, toIsoLocal } from '../../utils/appointmentDateTime';
import { useLeads } from '../../hooks/useLeads';
import { nombreVisible } from '../../utils/leadDisplay';
import type { Lead } from '../../types';

interface Props {
  /** Vacio significa que todavia no se eligio: el modal lo pregunta. */
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
  const { getAll } = useLeads();
  /*
   * Con el lead ya decidido -se agenda desde una reunion concreta- no se
   * pregunta. Abriendo desde la cabecera de la agenda no hay lead todavia, y
   * elegirlo es el primer paso.
   */
  const [elegido, setElegido] = useState<{ id: string; nombre: string } | null>(
    leadId ? { id: leadId, nombre: leadName } : null,
  );
  const [busqueda, setBusqueda] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cargandoLeads, setCargandoLeads] = useState(false);
  const [fecha, setFecha] = useState(fechaSugerida ?? dateInDays(7));
  const [hora, setHora] = useState('09:00');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Los leads se piden solo si hay que elegir uno.
  useEffect(() => {
    if (leadId) return;

    let cancelado = false;
    setCargandoLeads(true);
    void (async () => {
      try {
        const todos = await getAll();
        if (!cancelado) setLeads(todos);
      } catch (err) {
        if (!cancelado) setError(getErrorMessage(err, 'No se pudieron cargar los leads'));
      } finally {
        if (!cancelado) setCargandoLeads(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [leadId, getAll]);

  const coincidencias = busqueda.trim()
    ? leads
        .filter((lead) => nombreVisible(lead.name).toLowerCase().includes(busqueda.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const agendar = async () => {
    if (!elegido) {
      setError('Elegí a quién le vas a agendar la cita');
      return;
    }

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
      const resultado = await createAppointmentFromLead({ leadId: elegido.id, startsAt, note: nota });
      onAgendada(getAppointmentSuccessMessage('create', resultado.googleSyncStatus));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo agendar la cita'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="340px" label="Agendar una cita">
      <div className="flex flex-col">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-section-title font-semibold text-ink">
            {leadId ? 'Agendar otra cita' : 'Nueva cita'}
          </h2>
          {elegido && <p className="mt-0.5 truncate text-micro text-ink-muted">{elegido.nombre}</p>}
        </header>

        <div className="flex flex-col gap-3 px-4 py-3">
          {!leadId && (
            <Field
              label="¿Con quién?"
              hint={cargandoLeads ? 'Cargando leads...' : undefined}
              action={
                elegido && (
                  <button
                    type="button"
                    onClick={() => {
                      setElegido(null);
                      setBusqueda('');
                    }}
                    className="text-micro font-medium text-primary hover:underline"
                  >
                    Cambiar
                  </button>
                )
              }
            >
              {elegido ? (
                <p className="truncate rounded-md border border-line bg-surface-sunken px-2.5 py-2 text-body text-ink">
                  {elegido.nombre}
                </p>
              ) : (
                <>
                  <Input
                    autoFocus
                    value={busqueda}
                    onChange={(evento) => setBusqueda(evento.target.value)}
                    placeholder="Buscar por nombre..."
                  />
                  {coincidencias.length > 0 && (
                    <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-line">
                      {coincidencias.map((lead) => (
                        <li key={lead.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setElegido({ id: lead.id!, nombre: nombreVisible(lead.name) })
                            }
                            className="w-full truncate border-b border-line-soft px-2.5 py-1.5 text-left text-micro text-ink transition-colors last:border-0 hover:bg-surface-muted"
                          >
                            {nombreVisible(lead.name)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {busqueda.trim() && coincidencias.length === 0 && !cargandoLeads && (
                    <p className="mt-1 text-micro text-ink-muted">Ningún lead con ese nombre.</p>
                  )}
                </>
              )}
            </Field>
          )}
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
