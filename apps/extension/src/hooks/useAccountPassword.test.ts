import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../services/authService', () => ({
  confirmCurrentUserPassword: vi.fn(),
  describeCurrentUserPassword: vi.fn(),
  requestPasswordChangeCode: vi.fn(),
  setCurrentUserPassword: vi.fn(),
}));

import * as auth from '../services/authService';
import { useAccountPassword } from './useAccountPassword';

/** Monta y espera a que termine de averiguar el estado de la cuenta. */
async function montar() {
  const vista = renderHook(() => useAccountPassword());
  await waitFor(() => expect(vista.result.current.step).not.toBe('cargando'));
  return vista;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.describeCurrentUserPassword).mockResolvedValue({
    tienePassword: false,
    usaGoogle: true,
  });
  vi.mocked(auth.setCurrentUserPassword).mockResolvedValue({ status: 'ok' });
  vi.mocked(auth.requestPasswordChangeCode).mockResolvedValue(undefined);
  vi.mocked(auth.confirmCurrentUserPassword).mockResolvedValue(undefined);
});

describe('estado inicial', () => {
  it('detecta una cuenta de Google sin contrasena', async () => {
    const { result } = await montar();

    expect(result.current.step).toBe('formulario');
    expect(result.current.tienePassword).toBe(false);
    expect(result.current.usaGoogle).toBe(true);
  });

  // Ante la duda se avisa, no se finge un estado: decir "cambiar la contrasena"
  // a quien no tiene ninguna es la misma clase de error que el fail-open que ya
  // se corrigio en la recuperacion.
  it('avisa y no asume nada si no se puede averiguar el estado', async () => {
    vi.mocked(auth.describeCurrentUserPassword).mockRejectedValue(new Error('rpc caido'));

    const { result } = await montar();

    expect(result.current.step).toBe('formulario');
    expect(result.current.tienePassword).toBeNull();
    expect(result.current.banner?.tone).toBe('error');
  });
});

describe('poner la contrasena', () => {
  it('la guarda de una vez cuando la sesion es reciente', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });

    expect(auth.setCurrentUserPassword).toHaveBeenCalledWith('ContrasenaNueva1');
    expect(auth.requestPasswordChangeCode).not.toHaveBeenCalled();
    expect(result.current.tienePassword).toBe(true);
    expect(result.current.banner?.text).toBe('Contrasena guardada.');
  });

  it('rechaza una contrasena floja sin llamar al servidor', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('corta');
    });

    expect(auth.setCurrentUserPassword).not.toHaveBeenCalled();
    expect(result.current.errors.password).toBeTruthy();
  });

  it('muestra el error en el aviso si el servidor la rechaza', async () => {
    vi.mocked(auth.setCurrentUserPassword).mockRejectedValue(
      new Error('La contrasena nueva es igual a la anterior.')
    );
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });

    expect(result.current.banner).toEqual({
      tone: 'error',
      text: 'La contrasena nueva es igual a la anterior.',
    });
  });
});

describe('cuando la sesion es vieja', () => {
  beforeEach(() => {
    vi.mocked(auth.setCurrentUserPassword).mockResolvedValue({ status: 'necesita_codigo' });
  });

  it('pide el codigo y pasa a esa pantalla', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });

    expect(auth.requestPasswordChangeCode).toHaveBeenCalled();
    expect(result.current.step).toBe('codigo');
    expect(result.current.tienePassword).toBe(false);
  });

  it('confirma con el codigo usando la contrasena que ya se escribio', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });
    await act(async () => {
      await result.current.submitCode('12345678');
    });

    expect(auth.confirmCurrentUserPassword).toHaveBeenCalledWith(
      'ContrasenaNueva1',
      '12345678'
    );
    expect(result.current.step).toBe('formulario');
    expect(result.current.tienePassword).toBe(true);
  });

  it('rechaza un codigo incompleto sin llamar al servidor', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });
    await act(async () => {
      await result.current.submitCode('123');
    });

    expect(auth.confirmCurrentUserPassword).not.toHaveBeenCalled();
    expect(result.current.errors.code).toBeTruthy();
  });

  // La contrasena solo vive en memoria mientras dura el paso. Cancelar la borra,
  // asi que despues no puede quedar nada que confirmar a ciegas.
  it('al cancelar olvida la contrasena escrita', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });
    act(() => {
      result.current.cancelarCodigo();
    });
    await act(async () => {
      await result.current.submitCode('12345678');
    });

    expect(auth.confirmCurrentUserPassword).not.toHaveBeenCalled();
    expect(result.current.step).toBe('formulario');
  });
});

describe('la contrasena en memoria', () => {
  beforeEach(() => {
    vi.mocked(auth.setCurrentUserPassword).mockResolvedValue({ status: 'necesita_codigo' });
  });

  // Sin esto la credencial sobrevivia a cerrar el modal: el usuario cree que
  // abandono y sigue en el heap del proceso.
  it('se borra al desmontar el hook', async () => {
    const vista = await montar();

    await act(async () => {
      await vista.result.current.submitPassword('ContrasenaNueva1');
    });
    expect(vista.result.current.step).toBe('codigo');

    const submitCode = vista.result.current.submitCode;
    vista.unmount();

    await act(async () => {
      await submitCode('12345678');
    });

    expect(auth.confirmCurrentUserPassword).not.toHaveBeenCalled();
  });

  it('aguanta un codigo equivocado sin obligar a reescribir la contrasena', async () => {
    vi.mocked(auth.confirmCurrentUserPassword).mockRejectedValue(
      new Error('El codigo no es correcto.')
    );
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });
    await act(async () => {
      await result.current.submitCode('11111111');
    });

    expect(result.current.step).toBe('codigo');
    expect(result.current.banner?.tone).toBe('error');
  });

  it('pero al tercer fallo vuelve al principio y la olvida', async () => {
    vi.mocked(auth.confirmCurrentUserPassword).mockRejectedValue(
      new Error('El codigo no es correcto.')
    );
    const { result } = await montar();

    await act(async () => {
      await result.current.submitPassword('ContrasenaNueva1');
    });
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        await result.current.submitCode('11111111');
      });
    }

    expect(result.current.step).toBe('formulario');
    expect(result.current.banner?.text).toContain('Demasiados intentos');

    // Y ya no queda nada que confirmar a ciegas.
    vi.mocked(auth.confirmCurrentUserPassword).mockClear();
    await act(async () => {
      await result.current.submitCode('12345678');
    });
    expect(auth.confirmCurrentUserPassword).not.toHaveBeenCalled();
  });
});
