import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AppointmentOutcomeModal from './AppointmentOutcomeModal';
import type { AgendaAppointment } from '../../types';

afterEach(cleanup);

const CITA: AgendaAppointment = {
  id: 'cita-1',
  leadId: 'lead-1',
  leadName: 'Angel Largo',
  startsAt: '2026-08-31T18:30:00.000Z',
  endsAt: '2026-08-31T19:00:00.000Z',
  status: 'agendada',
  sourceChannel: 'general',
  notes: '',
  outcomeNotes: '',
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

function montar(props: Partial<Parameters<typeof AppointmentOutcomeModal>[0]> = {}) {
  const onGuardar = vi.fn();
  render(
    <AppointmentOutcomeModal
      cita={CITA}
      guardando={false}
      onGuardar={onGuardar}
      onClose={vi.fn()}
      {...props}
    />,
  );
  return { onGuardar };
}

const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

describe('AppointmentOutcomeModal', () => {
  /*
   * El estado de la cita sale de esta respuesta, asi que sin ella no hay nada
   * que registrar.
   */
  it('no deja guardar sin decir si el contacto se conecto', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Guardar' }).hasAttribute('disabled')).toBe(true);
  });

  it('registra la asistencia y la minuta', () => {
    const { onGuardar } = montar();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, se conectó' }));
    fireEvent.change(screen.getByPlaceholderText('Escribí lo que pasó en la reunión...'), {
      target: { value: 'Pide propuesta el lunes' },
    });
    guardar();

    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ attended: true, outcomeNotes: 'Pide propuesta el lunes' }),
      expect.anything(),
    );
  });

  it('arma una tarea por cada seguimiento marcado', () => {
    const { onGuardar } = montar();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, se conectó' }));
    fireEvent.click(screen.getByLabelText('Programar llamado'));
    fireEvent.click(screen.getByLabelText('Enviar mensaje'));
    guardar();

    const cierre = onGuardar.mock.calls[0]?.[0];
    expect(cierre.tareas).toHaveLength(2);
    expect(cierre.tareas[0].title).toContain('Angel Largo');
  });

  /*
   * Desde la agenda no se puede crear una cita: la unica via es la ficha del
   * lead. Sin este aviso, marcar "Agendar otra cita" dejaba un recordatorio y
   * nada mas.
   */
  it('avisa que hay que ir a agendar cuando se marca esa opcion', () => {
    const { onGuardar } = montar();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, se conectó' }));
    fireEvent.click(screen.getByLabelText('Agendar otra cita'));
    guardar();

    expect(onGuardar).toHaveBeenCalledWith(expect.anything(), { agendarAhora: true });
  });

  it('sin esa opcion no manda a ninguna parte', () => {
    const { onGuardar } = montar();

    fireEvent.click(screen.getByRole('button', { name: 'No asistió' }));
    guardar();

    expect(onGuardar).toHaveBeenCalledWith(expect.anything(), { agendarAhora: false });
  });

  it('una cita sin lead no puede llevar a agendar', () => {
    const { onGuardar } = montar({ cita: { ...CITA, leadId: undefined } });

    fireEvent.click(screen.getByRole('button', { name: 'Sí, se conectó' }));
    fireEvent.click(screen.getByLabelText('Agendar otra cita'));
    guardar();

    expect(onGuardar).toHaveBeenCalledWith(expect.anything(), { agendarAhora: false });
  });

  it('muestra el fallo dentro del modal, sin cerrarlo', () => {
    montar({ error: 'Falta aplicar la migración 139 en la base de datos.' });

    expect(screen.getByRole('alert').textContent).toContain('migración 139');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });
});
