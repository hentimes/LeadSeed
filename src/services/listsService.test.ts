import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/listsRepository', () => ({
  createLeadList: vi.fn(),
  deleteLeadListRow: vi.fn(),
  fetchLeadListRows: vi.fn(),
  updateLeadList: vi.fn(),
}));

import * as repo from '../repositories/listsRepository';
import { fetchLeadLists, saveLeadList } from './listsService';
import { MAX_LIST_DESCRIPTION } from '../types';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.createLeadList).mockResolvedValue(1);
  vi.mocked(repo.updateLeadList).mockResolvedValue(undefined);
});

const listaBase = { name: 'Prioritarios', color: '#6C4CF6', createdAt: '' };

describe('crear una lista', () => {
  it('guarda la descripcion recortada', async () => {
    await saveLeadList('u1', { ...listaBase, description: '  Clientes de Santiago  ' });

    expect(repo.createLeadList).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Clientes de Santiago' })
    );
  });

  // La base tiene una restriccion de 25 caracteres. Enviar mas la haria fallar
  // con un error de Postgres que no le dice nada al usuario.
  it('nunca envia mas caracteres de los que admite la base', async () => {
    const largo = 'x'.repeat(60);

    await saveLeadList('u1', { ...listaBase, description: largo });

    expect(repo.createLeadList).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'x'.repeat(MAX_LIST_DESCRIPTION) })
    );
  });

  it('guarda null cuando no hay descripcion, no cadena vacia', async () => {
    await saveLeadList('u1', { ...listaBase });

    expect(repo.createLeadList).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('tambien guarda null si solo trae espacios', async () => {
    await saveLeadList('u1', { ...listaBase, description: '   ' });

    expect(repo.createLeadList).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });
});

describe('actualizar una lista', () => {
  it('conserva nombre y color al cambiar la descripcion', async () => {
    await saveLeadList('u1', { ...listaBase, id: 7, description: 'Del sur' });

    expect(repo.updateLeadList).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: 'Prioritarios',
        color: '#6C4CF6',
        description: 'Del sur',
      })
    );
  });

  it('permite borrarla dejandola vacia', async () => {
    await saveLeadList('u1', { ...listaBase, id: 7, description: '' });

    expect(repo.updateLeadList).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ description: null })
    );
  });
});

describe('leer las listas', () => {
  it('trae la descripcion', async () => {
    vi.mocked(repo.fetchLeadListRows).mockResolvedValue([
      { id: 1, name: 'A', color: '#000', created_at: 'hoy', description: 'Del norte' },
    ]);

    const listas = await fetchLeadLists('u1');

    expect(listas).toHaveLength(1);
    expect(listas[0]?.description).toBe('Del norte');
  });

  // null en la base significa "sin descripcion"; en el modelo es undefined, para
  // que el componente distinga "no hay" de "hay una vacia".
  it('convierte null en undefined', async () => {
    vi.mocked(repo.fetchLeadListRows).mockResolvedValue([
      { id: 1, name: 'A', color: '#000', created_at: 'hoy', description: null },
    ]);

    const listas = await fetchLeadLists('u1');

    expect(listas).toHaveLength(1);
    expect(listas[0]?.description).toBeUndefined();
  });
});
