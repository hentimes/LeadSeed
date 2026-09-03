import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cerrarCita, estaPendienteDeCierre, mensajeDeCierre } from './appointmentOutcomeService';
import type { AgendaAppointment } from '../types';

const repo = vi.hoisted(() => ({ recordMyAppointmentOutcomeRow: vi.fn() }));
const tareas = vi.hoisted(() => ({ createTaskRow: vi.fn() }));
const notas = vi.hoisted(() => ({ createLeadNote: vi.fn() }));

vi.mock('../repositories/agendaRepository', () => repo);
vi.mock('../repositories/tasksRepository', () => tareas);
vi.mock('./leadDetailService', () => notas);

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
  repo.recordMyAppointmentOutcomeRow.mockResolvedValue({
    id: 'cita-1',
    status: 'completada',
    outcome_recorded_at: '2026-09-01T10:00:00.000Z',
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
  it('marca la asistencia y guarda la minuta', async () => {
    await cerrarCita('user-1', cita(), {
      appointmentId: 'cita-1',
      attended: true,
      outcomeNotes: '  Quedó en revisar la propuesta  ',
    });

    expect(repo.recordMyAppointmentOutcomeRow).toHaveBeenCalledWith(
      'cita-1',
      true,
      'Quedó en revisar la propuesta',
    );
  });

  it('sin minuta no manda una cadena vacia', async () => {
    await cerrarCita('user-1', cita(), { appointmentId: 'cita-1', attended: false });

    expect(repo.recordMyAppointmentOutcomeRow).toHaveBeenCalledWith('cita-1', false, undefined);
  });

  it('copia la minuta a la ficha del lead cuando se pide', async () => {
    const resultado = await cerrarCita('user-1', cita(), {
      appointmentId: 'cita-1',
      attended: true,
      outcomeNotes: 'Pide llamar el lunes',
      tambienComoNotaDelLead: true,
    });

    expect(notas.createLeadNote).toHaveBeenCalledWith('lead-1', 'user-1', 'Pide llamar el lunes');
    expect(resultado.notaCreada).toBe(true);
  });

  it('sin minuta no crea una nota vacia en el lead', async () => {
    const resultado = await cerrarCita('user-1', cita(), {
      appointmentId: 'cita-1',
      attended: false,
      tambienComoNotaDelLead: true,
    });

    expect(notas.createLeadNote).not.toHaveBeenCalled();
    expect(resultado.notaCreada).toBe(false);
  });

  it('crea las tareas de seguimiento apuntando al lead de la cita', async () => {
    const resultado = await cerrarCita('user-1', cita(), {
      appointmentId: 'cita-1',
      attended: true,
      tareas: [
        { title: 'Llamar a Angel Largo', dueDateIso: '2026-09-03T12:00:00.000Z' },
        { title: 'Agendar nueva cita', dueDateIso: null },
      ],
    });

    expect(tareas.createTaskRow).toHaveBeenCalledTimes(2);
    expect(tareas.createTaskRow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Llamar a Angel Largo',
        lead_id: 'lead-1',
        status: 'pendiente',
        user_id: 'user-1',
      }),
    );
    expect(resultado.tareasCreadas).toBe(2);
  });

  it('descarta las tareas sin titulo', async () => {
    const resultado = await cerrarCita('user-1', cita(), {
      appointmentId: 'cita-1',
      attended: true,
      tareas: [{ title: '   ' }],
    });

    expect(tareas.createTaskRow).not.toHaveBeenCalled();
    expect(resultado.tareasCreadas).toBe(0);
  });

  /*
   * El cierre va primero. Si fallara antes que la nota y las tareas, quedarian
   * colgando de una reunion que el sistema sigue dando por sin registrar.
   */
  it('si falla el cierre no deja notas ni tareas sueltas', async () => {
    repo.recordMyAppointmentOutcomeRow.mockRejectedValue(new Error('sin conexión'));

    await expect(
      cerrarCita('user-1', cita(), {
        appointmentId: 'cita-1',
        attended: true,
        outcomeNotes: 'algo',
        tambienComoNotaDelLead: true,
        tareas: [{ title: 'Llamar' }],
      }),
    ).rejects.toThrow('sin conexión');

    expect(notas.createLeadNote).not.toHaveBeenCalled();
    expect(tareas.createTaskRow).not.toHaveBeenCalled();
  });
});

describe('mensajeDeCierre', () => {
  /*
   * Con la migracion sin aplicar, la RPC no existe y PostgREST responde
   * PGRST202. El mensaje crudo habla de un esquema y una firma; desde la
   * agenda eso se lee como que el boton no hace nada.
   */
  it('explica que falta aplicar la migracion cuando la funcion no existe', () => {
    const err = { code: 'PGRST202', message: 'Could not find the function public.record_my_appointment_outcome' };

    expect(mensajeDeCierre(err)).toContain('migración 139');
  });

  it('reconoce el caso aunque no venga el codigo', () => {
    const err = { message: 'Could not find the function public.record_my_appointment_outcome(...)' };

    expect(mensajeDeCierre(err)).toContain('migración 139');
  });

  it('deja pasar el resto de errores tal como llegan', () => {
    expect(mensajeDeCierre(new Error('sin conexión'))).toBe('sin conexión');
  });

  it('cae a una frase legible cuando el error no dice nada', () => {
    expect(mensajeDeCierre({})).toBe('No se pudo registrar cómo fue la reunión');
  });
});
