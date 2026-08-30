import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFormTypeLinks } from './useFormTypeLinks';
import { resetPlatformForTesting } from '../platform/registry';
import type { Platform } from '../platform/types';
import type { CaptureLink, FormType } from '../types';

const servicio = vi.hoisted(() => ({
  listMyCaptureLinks: vi.fn(),
  getMyCaptureLinkStats: vi.fn(),
  getMyCaptureLinksLimit: vi.fn(),
  createMyCaptureLink: vi.fn(),
  updateMyCaptureLink: vi.fn(),
  deactivateMyCaptureLink: vi.fn(),
  resetMyCaptureLinkProgress: vi.fn(),
  buildLinkUrl: vi.fn(() => 'https://planespro.cl/pb/abc123'),
}));

vi.mock('../services/captureLinksService', () => servicio);

const confirmar = vi.fn();

function crearLink(overrides: Partial<CaptureLink> = {}): CaptureLink {
  return {
    id: 1,
    label: 'Link principal',
    campaignName: 'Instagram',
    refCode: 'abc123',
    linkType: 'pb',
    isActive: true,
    isDefault: false,
    visits: 10,
    step1Completions: 4,
    step2Completions: 2,
    totalLeads: 2,
    closedLeads: 1,
    closeRatePct: 50,
    statsConfig: {},
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  } as CaptureLink;
}

/*
 * El portapapeles se dobla por el PUERTO, no parcheando `navigator`. Antes el
 * test redefinia `navigator.clipboard` con `Object.defineProperty`, que ademas
 * de ser fragil dejaba el global tocado para el resto del archivo.
 */
const escribirEnPortapapeles = vi.fn();

const tipoAbierto = { slug: 'pb', displayName: 'Booking PlanesPro', linksAdminOnly: false } as FormType;
const tipoAdmin = { slug: 'retiro', displayName: 'Retiro técnico', linksAdminOnly: true } as FormType;

beforeEach(() => {
  vi.clearAllMocks();
  confirmar.mockResolvedValue(true);
  escribirEnPortapapeles.mockResolvedValue(true);
  resetPlatformForTesting({
    dialogs: { confirm: confirmar, alert: vi.fn() },
    clipboard: { writeText: escribirEnPortapapeles },
  } as unknown as Platform);

  servicio.listMyCaptureLinks.mockResolvedValue([crearLink()]);
  servicio.getMyCaptureLinkStats.mockResolvedValue([]);
  servicio.getMyCaptureLinksLimit.mockResolvedValue(3);
  servicio.buildLinkUrl.mockReturnValue('https://planespro.cl/pb/abc123');
});

afterEach(() => resetPlatformForTesting(null));

async function montar(formType: FormType = tipoAbierto) {
  const vista = renderHook(() => useFormTypeLinks(formType));
  await waitFor(() => expect(vista.result.current.loading).toBe(false));
  return vista;
}

describe('useFormTypeLinks', () => {
  it('carga links, cupos y estadisticas al montarse', async () => {
    const { result } = await montar();

    expect(result.current.links).toHaveLength(1);
    expect(result.current.slotsText).toBe('1/3');
    expect(result.current.canCreate).toBe(true);
  });

  it('cierra la creacion cuando se agotan los cupos', async () => {
    servicio.listMyCaptureLinks.mockResolvedValue([
      crearLink({ id: 1 }),
      crearLink({ id: 2 }),
      crearLink({ id: 3 }),
    ]);

    const { result } = await montar();

    expect(result.current.canCreate).toBe(false);
    expect(result.current.slotsText).toBe('3/3');
  });

  /*
   * Un tipo admin-only no tiene link principal ni tope: el admin ya es
   * ilimitado, y ofrecer esa interfaz solo confunde.
   */
  it('un tipo admin-only no tiene cupos ni link principal', async () => {
    const { result } = await montar(tipoAdmin);

    expect(result.current.showDefaultConcept).toBe(false);
    expect(result.current.canCreate).toBe(true);
  });

  it('exige un nombre antes de llamar al servicio', async () => {
    const { result } = await montar();

    act(() => result.current.openCreate());
    await act(async () => {
      await result.current.save();
    });

    expect(servicio.createMyCaptureLink).not.toHaveBeenCalled();
    expect(result.current.error).toBe('El nombre del link es obligatorio');
  });

  it('crea el link con el tipo de formulario de la seccion', async () => {
    const { result } = await montar();

    act(() => result.current.openCreate());
    act(() => result.current.setForm(() => ({ label: '  Instagram bio ', campaignName: ' Verano ' })));
    await act(async () => {
      await result.current.save();
    });

    expect(servicio.createMyCaptureLink).toHaveBeenCalledWith({
      label: 'Instagram bio',
      campaignName: 'Verano',
      linkType: 'pb',
    });
    expect(result.current.isFormOpen).toBe(false);
  });

  it('editar precarga el link y actualiza en vez de crear', async () => {
    const { result } = await montar();
    const link = crearLink({ id: 7, label: 'Viejo', campaignName: 'Ads' });

    act(() => result.current.openEdit(link));
    expect(result.current.form).toEqual({ label: 'Viejo', campaignName: 'Ads' });

    act(() => result.current.setForm((actual) => ({ ...actual, label: 'Nuevo' })));
    await act(async () => {
      await result.current.save();
    });

    expect(servicio.updateMyCaptureLink).toHaveBeenCalledWith(7, {
      label: 'Nuevo',
      campaignName: 'Ads',
    });
    expect(servicio.createMyCaptureLink).not.toHaveBeenCalled();
  });

  it('el link principal no se puede desactivar', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.deactivate(crearLink({ isDefault: true }));
    });

    expect(servicio.deactivateMyCaptureLink).not.toHaveBeenCalled();
    expect(result.current.error).toBe('El link principal no se puede desactivar');
  });

  /*
   * La confirmacion va por el puerto de dialogos y no por `confirm()`: el
   * nucleo tiene que poder correr donde no existe el DOM.
   */
  it('pide confirmacion antes de desactivar y respeta la negativa', async () => {
    confirmar.mockResolvedValue(false);
    const { result } = await montar();

    await act(async () => {
      await result.current.deactivate(crearLink({ id: 4 }));
    });

    // Se comprueba que la pregunta NOMBRE el enlace, no su redaccion exacta:
    // el texto es cosa de la interfaz y cambiarlo no debe romper este test.
    expect(confirmar).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ title: expect.stringContaining('Link principal') }),
    );
    expect(servicio.deactivateMyCaptureLink).not.toHaveBeenCalled();
  });

  it('pide confirmacion antes de resetear el contador', async () => {
    confirmar.mockResolvedValue(false);
    const { result } = await montar();

    await act(async () => {
      await result.current.resetProgress(crearLink({ id: 5 }));
    });

    expect(confirmar).toHaveBeenCalled();
    expect(servicio.resetMyCaptureLinkProgress).not.toHaveBeenCalled();
  });

  it('resetea el contador cuando se confirma', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.resetProgress(crearLink({ id: 5 }));
    });

    expect(servicio.resetMyCaptureLinkProgress).toHaveBeenCalledWith(5);
  });

  it('copia la URL construida y no el codigo suelto', async () => {
    const { result } = await montar();
    await act(async () => {
      await result.current.copyUrl(crearLink());
    });

    expect(escribirEnPortapapeles).toHaveBeenCalledWith('https://planespro.cl/pb/abc123');
    expect(result.current.message).toBe('URL copiada');
  });

  it('no dice que copio si el portapapeles rechazo', async () => {
    // El portapapeles rechaza si el documento perdio el foco o si se denego el
    // permiso. Anunciar exito ahi hace que el usuario pegue lo que tenia antes.
    escribirEnPortapapeles.mockResolvedValue(false);

    const { result } = await montar();
    await act(async () => {
      await result.current.copyUrl(crearLink());
    });

    expect(result.current.message).toBe('No se pudo copiar la URL');
  });

  it('avisa cuando la carga falla en vez de quedarse en blanco', async () => {
    servicio.listMyCaptureLinks.mockRejectedValue(new Error('sin conexión'));

    const { result } = await montar();

    expect(result.current.error).toBe('sin conexión');
    expect(result.current.links).toHaveLength(0);
  });
});
