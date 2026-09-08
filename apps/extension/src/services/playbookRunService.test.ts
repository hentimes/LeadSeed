import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  iniciarRecorrido,
  cerrarRecorrido,
  marcarItem,
  mensajeDeInicio,
  mensajeDeCierreDeRecorrido,
} from './playbookRunService';

const repo = vi.hoisted(() => ({
  callStartMyPlaybookRun: vi.fn(),
  callFinishMyPlaybookRun: vi.fn(),
  updatePlaybookRunItemRow: vi.fn(),
  fetchPlaybookRunRows: vi.fn(),
  fetchPlaybookRunRow: vi.fn(),
  fetchPlaybookRunItemRows: vi.fn(),
  fetchPlaybookRunNoteRows: vi.fn(),
  insertPlaybookRunNoteRow: vi.fn(),
}));

vi.mock('../repositories/playbookRunsRepository', () => repo);

beforeEach(() => {
  vi.clearAllMocks();
  repo.callStartMyPlaybookRun.mockResolvedValue('run-1');
  repo.callFinishMyPlaybookRun.mockResolvedValue({
    run_id: 'run-1',
    status: 'finalizado',
    ended_at: '2026-09-03T18:00:00.000Z',
    note_created: false,
  });
});

describe('iniciarRecorrido', () => {
  it('manda la cita de origen cuando se arranca desde una', async () => {
    await iniciarRecorrido({ playbookId: 'pb-1', leadId: 'lead-1', originAppointmentId: 'cita-3' });

    expect(repo.callStartMyPlaybookRun).toHaveBeenCalledWith({
      playbookId: 'pb-1',
      leadId: 'lead-1',
      originAppointmentId: 'cita-3',
    });
  });

  it('sin cita de origen manda null, no undefined', async () => {
    await iniciarRecorrido({ playbookId: 'pb-1', leadId: 'lead-1' });

    expect(repo.callStartMyPlaybookRun).toHaveBeenCalledWith(
      expect.objectContaining({ originAppointmentId: null }),
    );
  });
});

describe('cerrarRecorrido', () => {
  it('recorta la nota antes de mandarla', async () => {
    await cerrarRecorrido({ runId: 'run-1', status: 'finalizado', nota: '  Contrató  ' });

    expect(repo.callFinishMyPlaybookRun).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'Contrató' }),
    );
  });

  it('sin nota no manda una cadena vacia', async () => {
    await cerrarRecorrido({ runId: 'run-1', status: 'abandonado' });

    expect(repo.callFinishMyPlaybookRun).toHaveBeenCalledWith(
      expect.objectContaining({ note: null }),
    );
  });

  /*
   * Marcar "copiar al lead" sin escribir nada no puede crear una nota vacia en
   * la ficha. Es la misma regla que en el cierre de una cita.
   */
  it('sin nota no pide copiarla al lead aunque se haya marcado', async () => {
    await cerrarRecorrido({
      runId: 'run-1',
      status: 'finalizado',
      tambienComoNotaDelLead: true,
    });

    expect(repo.callFinishMyPlaybookRun).toHaveBeenCalledWith(
      expect.objectContaining({ alsoLeadNote: false }),
    );
  });

  it('devuelve lo que conto el servidor, no lo que se pidio', async () => {
    repo.callFinishMyPlaybookRun.mockResolvedValue({
      run_id: 'run-1',
      status: 'abandonado',
      ended_at: '2026-09-03T18:00:00.000Z',
      note_created: true,
    });

    const resultado = await cerrarRecorrido({ runId: 'run-1', status: 'finalizado' });

    expect(resultado).toEqual({
      recorrido: { id: 'run-1', status: 'abandonado', endedAt: '2026-09-03T18:00:00.000Z' },
      notaCreada: true,
    });
  });
});

describe('marcarItem', () => {
  beforeEach(() => {
    repo.updatePlaybookRunItemRow.mockResolvedValue({
      id: 'i-1',
      run_id: 'run-1',
      position: 1,
      title: 'Motivo de la reunión',
      question: '¿Qué te llevó a revisar tu plan?',
      support: null,
      section_title: 'Fase 1',
      section_position: 1,
      state: 'hecho',
      note: null,
      answered_at: '2026-09-03T17:00:00.000Z',
    });
  });

  /*
   * `answered_at` lo sella un trigger y `updated_at` tambien. Mandarlos desde
   * el cliente rompe el unico dato del que podran derivarse las sesiones.
   */
  it('nunca manda answered_at', async () => {
    await marcarItem('i-1', 'hecho');

    expect(repo.updatePlaybookRunItemRow).toHaveBeenCalledWith('i-1', { state: 'hecho' });
  });

  it('sin nota no toca el campo de nota', async () => {
    await marcarItem('i-1', 'no_aplica');

    expect(repo.updatePlaybookRunItemRow).toHaveBeenCalledWith('i-1', { state: 'no_aplica' });
  });

  it('una nota en blanco se guarda como null y no como espacios', async () => {
    await marcarItem('i-1', 'hecho', '   ');

    expect(repo.updatePlaybookRunItemRow).toHaveBeenCalledWith('i-1', {
      state: 'hecho',
      note: null,
    });
  });

  it('devuelve el sello que puso el servidor', async () => {
    const item = await marcarItem('i-1', 'hecho');
    expect(item.answeredAt).toBe('2026-09-03T17:00:00.000Z');
  });
});

describe('mensajeDeInicio', () => {
  /*
   * El choque del indice unico no es un fallo del programa: es que ese lead ya
   * esta recorriendo este guion. Crudo se lee "duplicate key value violates
   * unique constraint", que suena a error y no dice que hacer.
   */
  it('traduce el choque del indice a la regla que representa', () => {
    expect(mensajeDeInicio({ code: '23505', message: 'duplicate key value...' })).toBe(
      'Ya hay un recorrido en curso para este lead con este guion.',
    );
  });

  it('explica que falta la migracion cuando la funcion no existe', () => {
    const err = { code: 'PGRST202', message: 'Could not find the function' };
    expect(mensajeDeInicio(err)).toContain('migración');
  });

  it('deja pasar el resto de errores tal como llegan', () => {
    expect(mensajeDeInicio(new Error('sin conexión'))).toBe('sin conexión');
  });

  it('cae a una frase legible cuando el error no dice nada', () => {
    expect(mensajeDeInicio({})).toBe('No se pudo empezar el guion');
  });
});

describe('mensajeDeCierreDeRecorrido', () => {
  it('explica que falta la migracion cuando la funcion no existe', () => {
    expect(mensajeDeCierreDeRecorrido({ code: 'PGRST202' })).toContain('migración');
  });

  it('cae a una frase legible', () => {
    expect(mensajeDeCierreDeRecorrido({})).toBe('No se pudo cerrar el guion');
  });
});
