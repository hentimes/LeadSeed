import { useState } from 'react';
import { Button, Field, Input, Modal, Panel } from '../../design';
import { createQuickTask } from '../../services/tasksService';
import { getCurrentSession } from '../../services/authService';
import { getErrorMessage } from '../../utils/errorMessage';
import { dateInDays } from '../../utils/appointmentDateTime';

interface Props {
  leadId?: string;
  leadName: string;
  /** De donde sale la tarea, para que la descripcion lo diga. */
  origen: string;
  tituloSugerido: string;
  onCreada: (mensaje: string) => void;
  onClose: () => void;
}

/**
 * Crear una tarea sin salir de donde se esta.
 *
 * Las tareas de seguimiento solo se podian crear en el momento de registrar la
 * reunion. Si no se marcaba la casilla entonces, la reunion quedaba cerrada y
 * ya no habia forma de sacar nada de ella: habia que ir a Tareas y escribirla
 * a mano, volviendo a teclear de quien era y de que venia.
 *
 * Titulo y fecha, nada mas. Una tarea que nace de una reunion no necesita el
 * formulario completo -seccion, subtareas, adjuntos-; necesita existir antes
 * de que se olvide, y afinarse despues en Tareas si hace falta.
 */
export default function QuickTaskModal({
  leadId,
  leadName,
  origen,
  tituloSugerido,
  onCreada,
  onClose,
}: Props) {
  const [titulo, setTitulo] = useState(tituloSugerido);
  const [fecha, setFecha] = useState(dateInDays(2));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const crear = async () => {
    const limpio = titulo.trim();
    if (!limpio) {
      setError('Ponle un título a la tarea');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      const userId = (await getCurrentSession())?.user?.id;
      if (!userId) {
        setError('No hay sesión activa. Volvé a entrar para crear la tarea.');
        return;
      }

      await createQuickTask({
        userId,
        leadId,
        title: limpio,
        description: origen,
        // Sin fecha es una tarea suelta que no aparece en "hoy" ni en
        // "vencidas"; se deja vaciar a proposito, pero se propone una.
        dueDateIso: fecha ? new Date(`${fecha}T09:00:00`).toISOString() : null,
      });

      onCreada(`Tarea creada para ${leadName}.`);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la tarea'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="340px" label={`Crear tarea para ${leadName}`}>
      <div className="flex flex-col">
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-section-title font-semibold text-ink">Nueva tarea</h2>
          <p className="mt-0.5 truncate text-micro text-ink-muted">{leadName}</p>
        </header>

        <div className="flex flex-col gap-3 px-4 py-3">
          <Field label="Qué hay que hacer">
            <Input
              autoFocus
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder="Ej: enviar la propuesta"
            />
          </Field>

          <Field label="Para cuándo" hint="Opcional. Sin fecha no aparece en las de hoy.">
            <Input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} />
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
          <Button variant="primary" size="sm" onClick={() => void crear()} disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear tarea'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
