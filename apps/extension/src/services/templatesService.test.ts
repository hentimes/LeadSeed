import { describe, it, expect, vi, beforeEach } from 'vitest';

// `vi.hoisted`: `vi.mock` se eleva por encima de las constantes del modulo, asi
// que sin esto los dobles no existen todavia cuando se registra el mock.
const { updateTemplate, createTemplate } = vi.hoisted(() => ({
  updateTemplate: vi.fn(),
  createTemplate: vi.fn(),
}));

vi.mock('../repositories/templatesRepository', () => ({
  updateTemplate,
  createTemplate,
  fetchTemplateRowsByType: vi.fn(),
  fetchTemplateRowsByUserId: vi.fn(),
  fetchTemplateRowsByList: vi.fn(),
  fetchLeadAssignmentRows: vi.fn(),
  deleteTemplateRow: vi.fn(),
}));

import { saveTemplateForUser } from './templatesService';

const UUID = '9f1c2b64-4a3e-4f0a-9b7d-2c1e5a8d3b70';

beforeEach(() => {
  vi.clearAllMocks();
  createTemplate.mockResolvedValue(UUID);
  updateTemplate.mockResolvedValue(undefined);
});

/**
 * ALTA CONTRA EDICION: LA DECISION SE TOMA POR EL ID
 *
 * `saveTemplateForUser` actualiza solo si `template.id` es una cadena, porque
 * `templates.id` es un uuid. Ese detalle parecia interno y no lo era: la pantalla
 * de plantillas convertia el id a numero antes de llamar aqui, `Number(uuid)`
 * daba NaN, la conversion devolvia null, y la plantilla llegaba SIN id.
 *
 * Consecuencia en produccion: cada vez que alguien editaba una plantilla y
 * guardaba, se creaba una copia. El usuario termino con la misma plantilla
 * repetida dos y tres veces, y el motivo por defecto que acababa de elegir
 * "no se guardaba" -se guardaba, pero en la fila nueva-.
 *
 * Nada de eso lo puede ver el compilador: `id?: string | number` acepta las dos
 * cosas y el codigo compila igual. Por eso el invariante se fija aca.
 */
describe('saveTemplateForUser: alta contra edicion', () => {
  const plantilla = {
    nombre: 'Respuesta de Bienvenida',
    contenido: 'Hola {nombre}',
    templateListIds: [],
    leadIds: [],
    leadListIds: [],
    createdAt: '',
  };

  it('con un uuid ACTUALIZA la fila existente', async () => {
    await saveTemplateForUser('u1', 'whatsapp', { ...plantilla, id: UUID });

    expect(updateTemplate).toHaveBeenCalledOnce();
    expect(updateTemplate.mock.calls[0]?.[0]).toBe(UUID);
    expect(createTemplate).not.toHaveBeenCalled();
  });

  it('sin id da de alta', async () => {
    await saveTemplateForUser('u1', 'whatsapp', plantilla);

    expect(createTemplate).toHaveBeenCalledOnce();
    expect(updateTemplate).not.toHaveBeenCalled();
  });

  it('un id numerico NO se toma por una edicion', async () => {
    // El caso que causaba los duplicados. Se deja fijado para que quede claro
    // que un numero aqui no identifica ninguna plantilla: los ids son uuid.
    await saveTemplateForUser('u1', 'whatsapp', { ...plantilla, id: 0 });

    expect(updateTemplate).not.toHaveBeenCalled();
    expect(createTemplate).toHaveBeenCalledOnce();
  });

  it('el motivo por defecto viaja en las dos ramas', async () => {
    // "El motivo no se guarda" fue el sintoma reportado. No era que se
    // perdiera: iba en el payload, pero a la fila equivocada.
    await saveTemplateForUser('u1', 'whatsapp', { ...plantilla, id: UUID, defaultReasonId: 7 });
    expect(updateTemplate.mock.calls[0]?.[1]).toMatchObject({ default_reason_id: 7 });

    await saveTemplateForUser('u1', 'whatsapp', { ...plantilla, defaultReasonId: 7 });
    expect(createTemplate.mock.calls[0]?.[0]).toMatchObject({ default_reason_id: 7 });
  });

  it('sin motivo elegido se guarda null, no undefined', async () => {
    // `undefined` haria que PostgREST omitiera la columna y conservara el valor
    // anterior: quitar el motivo de una plantilla no tendria efecto.
    await saveTemplateForUser('u1', 'whatsapp', { ...plantilla, id: UUID });

    expect(updateTemplate.mock.calls[0]?.[1]).toMatchObject({ default_reason_id: null });
  });
});
