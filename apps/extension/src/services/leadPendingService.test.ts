import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLeadPendingFlags } from './leadPendingService';

const repo = vi.hoisted(() => ({
  fetchLeadIdsWithUpcomingAppointment: vi.fn(),
  fetchLeadIdsWithPendingTask: vi.fn(),
}));

vi.mock('../repositories/leadPendingRepository', () => repo);

beforeEach(() => {
  vi.clearAllMocks();
  repo.fetchLeadIdsWithUpcomingAppointment.mockResolvedValue([]);
  repo.fetchLeadIdsWithPendingTask.mockResolvedValue([]);
});

describe('fetchLeadPendingFlags', () => {
  it('guarda la cita de quien tiene una por delante', async () => {
    repo.fetchLeadIdsWithUpcomingAppointment.mockResolvedValue([
      { leadId: 'lead-1', id: 'cita-1' },
    ]);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-1']).toEqual({ citaId: 'cita-1' });
  });

  it('guarda la tarea de quien tiene una sin cerrar', async () => {
    repo.fetchLeadIdsWithPendingTask.mockResolvedValue([{ leadId: 'lead-2', id: 'tarea-2' }]);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-2']).toEqual({ tareaId: 'tarea-2' });
  });

  /*
   * Las dos fuentes son consultas distintas y el mismo lead puede estar en
   * ambas: la segunda no debe pisar lo que dejo la primera.
   */
  it('guarda las dos cuando el lead tiene cita y tarea', async () => {
    repo.fetchLeadIdsWithUpcomingAppointment.mockResolvedValue([
      { leadId: 'lead-3', id: 'cita-3' },
    ]);
    repo.fetchLeadIdsWithPendingTask.mockResolvedValue([{ leadId: 'lead-3', id: 'tarea-3' }]);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-3']).toEqual({ citaId: 'cita-3', tareaId: 'tarea-3' });
  });

  /*
   * Las consultas llegan ordenadas -la cita mas proxima y la tarea que vence
   * antes van primeras-, asi que con varias se queda la primera. Es a la que
   * lleva el distintivo al pulsarlo.
   */
  it('con varias citas se queda con la mas proxima', async () => {
    repo.fetchLeadIdsWithUpcomingAppointment.mockResolvedValue([
      { leadId: 'lead-4', id: 'cita-manana' },
      { leadId: 'lead-4', id: 'cita-el-mes-que-viene' },
    ]);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-4']).toEqual({ citaId: 'cita-manana' });
  });

  it('con varias tareas se queda con la que vence antes', async () => {
    repo.fetchLeadIdsWithPendingTask.mockResolvedValue([
      { leadId: 'lead-5', id: 'tarea-hoy' },
      { leadId: 'lead-5', id: 'tarea-sin-fecha' },
    ]);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-5']).toEqual({ tareaId: 'tarea-hoy' });
  });

  it('sin nada pendiente devuelve un mapa vacio', async () => {
    expect(await fetchLeadPendingFlags('user-1')).toEqual({});
  });

  it('pregunta por las dos cosas a la vez', async () => {
    await fetchLeadPendingFlags('user-9');

    expect(repo.fetchLeadIdsWithUpcomingAppointment).toHaveBeenCalledWith('user-9');
    expect(repo.fetchLeadIdsWithPendingTask).toHaveBeenCalledWith('user-9');
  });
});
