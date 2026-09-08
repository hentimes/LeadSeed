import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cerrarCita, estaPendienteDeCierre, mensajeDeCierre } from './appointmentOutcomeService';
import type { AgendaAppointment } from '../types';

const repo = vi.hoisted(() => ({ closeMyAppointmentRow: vi.fn() }));

vi.mock('../repositories/agendaRepository', () => repo);

const AYER = '2026-08-31T15:00:00.000Z';
const MANANA = '2026-09-02T15:00:00.000Z';

function cita(overrides: Partial<AgendaAppointment> = {}): AgendaAppointment {
  return {
    id: 'cita-1',
    leadId: 'lead-1',
    leadName: 'Angel Largo',
    startsAt: AYER,
    endsAt: AYER,
    status: 'agendada',
    sourceChannel: 'general',
    notes: '',
    outcomeNotes: '',
    createdAt: AYER,
    updatedAt: AYER,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.closeMyAppointmentRow.mockResolvedValue({
    appointment_id: 'cita-1',
    status: 'completada',
    outcome_recorded_at: '2026-09-01T10:00:00.000Z',
    note_created: false,
    tasks_created: 0,
  });
});

describe('estaPendienteDeCierre', () => {
  const ahora = new Date('2026-09-01T12:00:00.000Z');

  it('una cita que ya termino y nadie registro esta pendiente', () => {
    expect(estaPendienteDeCierre(cita(), ahora)).toBe(true);
  });

  it('una cita que todavia no ocurrio no lo esta', () => {
    expect(estaPendienteDeCierre(cita({ startsAt: MANANA, endsAt: MANANA }), ahora)).toBe(false);
  });

  /*
   * Lo que marca el pendiente es la falta de registro, no el estado: una cita
   * pasada en 'agendada' no dice que no ocurriera, dice que nadie conto como fue.
   */
  it('deja de estarlo en cuanto se registra', () => {
    const registrada = cita({ outcomeRecordedAt: '2026-09-01T09:00:00.000Z' });
    expect(estaPendienteDeCierre(registrada, ahora)).toBe(false);
  });

  it('una cita cancelada no tiene nada que registrar', () => {
    expect(estaPendienteDeCierre(cita({ status: 'cancelada' }), ahora)).toBe(false);
  });
});

describe('cerrarCita', () => {
  /*
   * Una sola llamada, no tres. Las tres escrituras -cierre, nota y tareas-
   * ocurren en una transaccion del servidor: si algo falla no se guarda nada y
   * la cita sigue pendiente, en vez de quedar cerrada con el seguimiento a
   * medias y sin forma de reintentarlo.
   */
  it('manda las tres escrituras en una sola llamada', async () => {
    await cerrarCita(cita(), {
      appointmentId: 'cita-1',
      attended: true,
      outcomeNotes: '  Quedó en revisar la propuesta  ',
      tambienComoNotaDelLead: true,
      tareas: [{ title: 'Llamar', dueDateIso: '2026-09-03T12:00:00.000Z' }],
    });

    expect(repo.closeMyAppointmentRow).toHaveBeenCalledTimes(1);
    expect(repo.closeMyAppointmentRow).toHaveBeenCalledWith({
      appointmentId: 'cita-1',
      attended: true,
      outcomeNotes: 'Quedó en revisar la propuesta',
      alsoLeadNote: true,
      tasks: [{ title: 'Llamar', dueDate: '2026-09-03T12:00:00.000Z' }],
    });
  });

  it('sin minuta no manda una cadena vacia', async () => {
    await cerrarCita(cita(), { appointmentId: 'cita-1', attended: false });

    expect(repo.closeMyAppointmentRow).toHaveBeenCalledWith(
      expect.objectContaining({ attended: false, outcomeNotes: undefined }),
    );
  });

  it('sin minuta no pide copiarla al lead aunque se haya marcado', async () => {
    await cerrarCita(cita(), {
      appointmentId: 'cita-1',
      attended: false,
      tambienComoNotaDelLead: true,
    });

    expect(repo.closeMyAppointmentRow).toHaveBeenCalledWith(
      expect.objectContaining({ alsoLeadNote: false }),
    );
  });

  it('una cita sin lead no puede llevar nota al lead', async () => {
    await cerrarCita(cita({ leadId: undefined }), {
      appointmentId: 'cita-1',
      attended: true,
      outcomeNotes: 'algo',
      tambienComoNotaDelLead: true,
    });

    expect(repo.closeMyAppointmentRow).toHaveBeenCalledWith(
      expect.objectContaining({ alsoLeadNote: false }),
    );
  });

  it('descarta las tareas sin titulo antes de mandarlas', async () => {
    await cerrarCita(cita(), {
      appointmentId: 'cita-1',
      attended: true,
      tareas: [{ title: '   ' }, { title: 'Escribir' }],
    });

    expect(repo.closeMyAppointmentRow).toHaveBeenCalledWith(
      expect.objectContaining({ tasks: [{ title: 'Escribir', dueDate: null }] }),
    );
  });

  it('devuelve lo que conto el servidor, no lo que se pidio', async () => {
    repo.closeMyAppointmentRow.mockResolvedValue({
      appointment_id: 'cita-1',
      status: 'no_asistio',
      outcome_recorded_at: '2026-09-01T10:00:00.000Z',
      note_created: true,
      tasks_created: 2,
    });

    const resultado = await cerrarCita(cita(), { appointmentId: 'cita-1', attended: false });

    expect(resultado).toEqual({
      cita: {
        id: 'cita-1',
        status: 'no_asistio',
        outcomeRecordedAt: '2026-09-01T10:00:00.000Z',
      },
      notaCreada: true,
      tareasCreadas: 2,
    });
  });

  it('propaga el fallo sin inventar un cierre a medias', async () => {
    repo.closeMyAppointmentRow.mockRejectedValue(new Error('sin conexión'));

    await expect(
      cerrarCita(cita(), { appointmentId: 'cita-1', attended: true }),
    ).rejects.toThrow('sin conexión');
  });
});

describe('mensajeDeCierre', () => {
  /*
   * Con la migracion sin aplicar, la RPC no existe y PostgREST responde
   * PGRST202. El mensaje crudo habla de un esquema y una firma; desde la
   * agenda eso se lee como que el boton no hace nada.
   */
  it('explica que falta aplicar la migracion cuando la funcion no existe', () => {
    const err = {
      code: 'PGRST202',
      message: 'Could not find the function public.close_my_appointment',
    };

    expect(mensajeDeCierre(err)).toContain('migración');
  });

  it('deja pasar el resto de errores tal como llegan', () => {
    expect(mensajeDeCierre(new Error('sin conexión'))).toBe('sin conexión');
  });

  it('cae a una frase legible cuando el error no dice nada', () => {
    expect(mensajeDeCierre({})).toBe('No se pudo registrar cómo fue la reunión');
  });
});
