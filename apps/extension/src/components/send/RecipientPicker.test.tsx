import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RecipientPicker } from './RecipientPicker';
import type { Lead, LeadList } from '../../types';

/* Ver `LeadIdentity.test.tsx`: sin `globals` hay que limpiar a mano. */
afterEach(cleanup);

/** Nueve leads: uno mas que la pagina, para poder probar el corte. */
const LEADS: Lead[] = Array.from({ length: 9 }, (_, i) => ({
  id: `lead-${i}`,
  name: `Lead ${String(i).padStart(2, '0')}`,
  phone: `+5691111111${i}`,
  email: '',
  company: '',
  rut: '',
  notes: '',
  status: 'nuevo',
  // Los tres primeros estan en la lista 1; el resto en ninguna.
  listaIds: i < 3 ? [1] : [],
  score: 0,
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
}));

const LISTA = {
  id: 1,
  name: 'Conecta',
  color: '#6c4cf6',
  createdAt: '2026-09-01T10:00:00Z',
} as LeadList;

function montar(extra: Partial<Parameters<typeof RecipientPicker>[0]> = {}) {
  const onToggleLeads = vi.fn();
  const onToggleLead = vi.fn();
  const props = {
    leads: LEADS,
    leadLists: [LISTA],
    contactables: LEADS,
    verListaId: null,
    selectedLeadIds: new Set<string>(),
    selectedListIds: new Set<number>(),
    onToggleLead,
    onToggleLeads,
    onToggleList: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    pagina: 1,
    onPaginaChange: vi.fn(),
    ocultarSinNombre: false,
    onOcultarSinNombreChange: vi.fn(),
    sentLeadIds: new Set<string>(),
    resumenDeEnvios: new Map(),
    estadoDelResumen: 'listo' as const,
    onVerHistorial: vi.fn(),
    canal: 'whatsapp' as const,
    ...extra,
  };
  render(<RecipientPicker {...props} />);
  return { onToggleLeads, onToggleLead };
}

/** La casilla de la cabecera, la que marca la pagina entera. */
function casillaDePagina(): HTMLInputElement {
  return screen.getByRole('checkbox', { name: /de esta página/i }) as HTMLInputElement;
}

/** La casilla de la fila de un lead, buscada por su nombre visible. */
function casillaDeFila(nombre: string): HTMLInputElement {
  const etiqueta = screen.getByText(nombre).closest('label');
  return etiqueta!.querySelector('input[type="checkbox"]') as HTMLInputElement;
}

/** Abre el panel plegado de filtros. */
function abrirFiltros() {
  fireEvent.click(screen.getByRole('button', { name: 'Filtrar y ordenar' }));
}

describe('marcar la pagina entera', () => {
  it('marca solo los ocho visibles, no los nueve del filtro', () => {
    // El noveno esta en la pagina 2: una casilla pequena no debe poder marcar
    // lo que no se ve.
    const { onToggleLeads } = montar();

    fireEvent.click(casillaDePagina());

    expect(onToggleLeads).toHaveBeenCalledTimes(1);
    const [ids, seleccionar] = onToggleLeads.mock.calls[0]!;
    expect(ids).toHaveLength(8);
    expect(ids).not.toContain('lead-8');
    expect(seleccionar).toBe(true);
  });

  it('con la pagina entera marcada, desmarca', () => {
    const todos = new Set(LEADS.slice(0, 8).map((lead) => lead.id!));
    const { onToggleLeads } = montar({ selectedLeadIds: todos });

    expect(casillaDePagina().checked).toBe(true);

    fireEvent.click(casillaDePagina());

    expect(onToggleLeads.mock.calls[0]![1]).toBe(false);
  });

  it('con algunos marcados queda indeterminada, no marcada', () => {
    // Es lo que distingue "marque tres a mano" de "esta pagina esta entera".
    montar({ selectedLeadIds: new Set(['lead-0', 'lead-1']) });

    expect(casillaDePagina().checked).toBe(false);
    expect(casillaDePagina().indeterminate).toBe(true);
  });

  it('el estado intermedio tambien se dice, no solo se pinta', () => {
    // `indeterminate` no tiene equivalente ARIA: sin decirlo en el nombre, un
    // lector de pantalla anuncia lo mismo que con cero marcados.
    montar({ selectedLeadIds: new Set(['lead-0', 'lead-1']) });

    expect(casillaDePagina().getAttribute('aria-label')).toMatch(/2 de 8 marcados/);
  });

  it('cuenta los que van en el envio, no los marcados a mano', () => {
    montar({ selectedLeadIds: new Set(['lead-0', 'lead-1']) });

    expect(screen.getByText('2 en el envío')).toBeTruthy();
  });
});

describe('un lead que entra por una lista agregada', () => {
  /*
   * El envio es la UNION de los marcados con los de las listas agregadas. La
   * fila se pintaba solo con los marcados, asi que estos aparecian con la
   * casilla vacia y el mensaje les llegaba igual.
   */
  it('se pinta marcado aunque no este en la seleccion suelta', () => {
    montar({ selectedListIds: new Set([1]) });

    expect(casillaDeFila('Lead 00').checked).toBe(true);
    expect(casillaDeFila('Lead 05').checked).toBe(false);
  });

  it('no se puede desmarcar desde la fila, porque no haria nada', () => {
    const { onToggleLead } = montar({ selectedListIds: new Set([1]) });

    expect(casillaDeFila('Lead 00').disabled).toBe(true);

    fireEvent.click(casillaDeFila('Lead 00'));

    expect(onToggleLead).not.toHaveBeenCalled();
  });

  it('la casilla de la pagina solo alterna los que si se pueden alternar', () => {
    const { onToggleLeads } = montar({ selectedListIds: new Set([1]) });

    fireEvent.click(casillaDePagina());

    const [ids] = onToggleLeads.mock.calls[0]!;
    expect(ids).toHaveLength(5);
    expect(ids).not.toContain('lead-0');
  });

  it('la cifra de la cabecera los incluye', () => {
    montar({ selectedListIds: new Set([1]) });

    expect(screen.getByText('3 en el envío')).toBeTruthy();
  });
});

describe('la hoja en reposo', () => {
  it('no muestra los filtros hasta que se piden', () => {
    // La razon de ser del plegado: en reposo la hoja es la lista, no su
    // maquinaria.
    montar();

    expect(screen.queryByLabelText('Ordenar los destinatarios')).toBeNull();

    abrirFiltros();

    expect(screen.getByLabelText('Ordenar los destinatarios')).toBeTruthy();
  });

  it('anuncia cuantos destinatarios quedan en la lista', () => {
    montar();

    expect(screen.getByRole('status').textContent).toMatch(/9 destinatarios/);
  });
});

describe('mientras el historial de envios no llego', () => {
  /*
   * Un mapa vacio significaria "a nadie se le escribio nunca", y "sin escribir"
   * devolveria la agenda entera. Es el unico filtro donde el modo degradado
   * cuesta mandar el mismo mensaje dos veces.
   */
  const selectorDeContacto = () =>
    screen.getByLabelText('Filtrar por si ya se le escribió') as HTMLSelectElement;

  it('no deja filtrar por contacto', () => {
    montar({ estadoDelResumen: 'cargando' });
    abrirFiltros();

    expect(selectorDeContacto().disabled).toBe(true);
  });

  it('con la consulta caida lo dice, en vez de callarse', () => {
    montar({ estadoDelResumen: 'error' });
    abrirFiltros();

    expect(screen.getByText(/No se pudo leer el historial/)).toBeTruthy();
  });

  it('con el historial cargado, el filtro se puede usar', () => {
    montar({ estadoDelResumen: 'listo' });
    abrirFiltros();

    expect(selectorDeContacto().disabled).toBe(false);
  });
});
