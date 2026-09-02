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
  it('marca la cita de quien tiene una por delante', async () => {
    repo.fetchLeadIdsWithUpcomingAppointment.mockResolvedValue(['lead-1']);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-1']).toEqual({ cita: true, tarea: false });
  });

  it('marca la tarea de quien tiene una sin cerrar', async () => {
    repo.fetchLeadIdsWithPendingTask.mockResolvedValue(['lead-2']);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-2']).toEqual({ cita: false, tarea: true });
  });

  /*
   * El caso que motiva el mapa: las dos fuentes son consultas distintas y el
   * mismo lead puede estar en ambas. La segunda no debe pisar a la primera.
   */
  it('marca las dos cuando el lead tiene cita y tarea', async () => {
    repo.fetchLeadIdsWithUpcomingAppointment.mockResolvedValue(['lead-3']);
    repo.fetchLeadIdsWithPendingTask.mockResolvedValue(['lead-3']);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(flags['lead-3']).toEqual({ cita: true, tarea: true });
  });

  it('un lead con varias tareas se marca una sola vez', async () => {
    repo.fetchLeadIdsWithPendingTask.mockResolvedValue(['lead-4', 'lead-4', 'lead-4']);

    const flags = await fetchLeadPendingFlags('user-1');

    expect(Object.keys(flags)).toEqual(['lead-4']);
    expect(flags['lead-4']).toEqual({ cita: false, tarea: true });
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
