import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../services/authService', () => ({
  beginEmailSignUp: vi.fn(),
  beginPasswordRecovery: vi.fn(),
  completePasswordRecovery: vi.fn(),
  confirmEmailSignUp: vi.fn(),
  loginWithEmailPassword: vi.fn(),
  resendSignUpCode: vi.fn(),
}));

vi.mock('../services/authFlowState', () => ({
  clearPendingAuthFlow: vi.fn(),
  clearRememberedEmail: vi.fn(),
  loadPendingAuthFlow: vi.fn(),
  loadRememberedEmail: vi.fn(),
  savePendingAuthFlow: vi.fn(),
  saveRememberedEmail: vi.fn(),
}));

import * as auth from '../services/authService';
import * as flowState from '../services/authFlowState';
import { useEmailAuthForm } from './useEmailAuthForm';

/** Monta el hook y espera a que termine la restauracion del flujo pendiente. */
async function montar() {
  const vista = renderHook(() => useEmailAuthForm());
  await waitFor(() => expect(flowState.loadPendingAuthFlow).toHaveBeenCalled());
  return vista;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(flowState.loadPendingAuthFlow).mockResolvedValue(null);
  vi.mocked(flowState.savePendingAuthFlow).mockResolvedValue(undefined);
  vi.mocked(flowState.clearPendingAuthFlow).mockResolvedValue(undefined);
  vi.mocked(flowState.loadRememberedEmail).mockResolvedValue('');
  vi.mocked(flowState.saveRememberedEmail).mockResolvedValue(undefined);
  vi.mocked(flowState.clearRememberedEmail).mockResolvedValue(undefined);
});

describe('estado inicial', () => {
  it('empieza en el login, sin aviso ni errores', async () => {
    const { result } = await montar();

    expect(result.current.view).toBe('login');
    expect(result.current.banner).toBeNull();
    expect(result.current.errors).toEqual({});
    expect(result.current.isBusy).toBe(false);
  });

  it('retoma una verificacion dejada a medias', async () => {
    vi.mocked(flowState.loadPendingAuthFlow).mockResolvedValue({
      purpose: 'signup',
      email: 'ana@ejemplo.com',
      startedAt: Date.now(),
    });

    const { result } = await montar();

    await waitFor(() => expect(result.current.view).toBe('verificar-otp'));
    expect(result.current.email).toBe('ana@ejemplo.com');
    expect(result.current.banner?.tone).toBe('info');
  });
});

describe('validacion antes de salir a la red', () => {
  it('no llama al servicio si el correo esta mal', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('no-es-un-correo', 'Contrasena1', false);
    });

    expect(auth.loginWithEmailPassword).not.toHaveBeenCalled();
    expect(result.current.errors.email).toBeTruthy();
  });

  it('marca los tres campos del alta a la vez', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitSignUp({ email: 'mal', password: 'corta', fullName: '' });
    });

    expect(auth.beginEmailSignUp).not.toHaveBeenCalled();
    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.password).toBeTruthy();
    expect(result.current.errors.fullName).toBeTruthy();
  });
});

describe('login', () => {
  it('no cambia de vista cuando entra: de eso se encarga AuthContext', async () => {
    vi.mocked(auth.loginWithEmailPassword).mockResolvedValue({ status: 'ok' });
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('ana@ejemplo.com', 'Contrasena1', false);
    });

    expect(result.current.view).toBe('login');
  });

  it('lleva a escribir el codigo si falta confirmar el correo', async () => {
    vi.mocked(auth.loginWithEmailPassword).mockResolvedValue({
      status: 'pendiente_verificacion',
    });
    vi.mocked(auth.resendSignUpCode).mockResolvedValue(undefined);
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('ana@ejemplo.com', 'Contrasena1', false);
    });

    expect(result.current.view).toBe('verificar-otp');
    expect(auth.resendSignUpCode).toHaveBeenCalledWith('ana@ejemplo.com');
    expect(result.current.resendCooldownSeconds).toBeGreaterThan(0);
  });

  it('muestra el error en el aviso, no lo deja escapar', async () => {
    vi.mocked(auth.loginWithEmailPassword).mockRejectedValue(
      new Error('Correo o contrasena incorrectos.')
    );
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('ana@ejemplo.com', 'Contrasena1', false);
    });

    expect(result.current.banner).toEqual({
      tone: 'error',
      text: 'Correo o contrasena incorrectos.',
    });
    expect(result.current.isBusy).toBe(false);
  });
});

describe('alta', () => {
  it('guarda el flujo pendiente y pasa al codigo', async () => {
    vi.mocked(auth.beginEmailSignUp).mockResolvedValue({ status: 'otp_enviado' });
    const { result } = await montar();

    await act(async () => {
      await result.current.submitSignUp({
        email: 'ana@ejemplo.com',
        password: 'Contrasena1',
        fullName: 'Ana Perez',
      });
    });

    expect(result.current.view).toBe('verificar-otp');
    expect(flowState.savePendingAuthFlow).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'signup', email: 'ana@ejemplo.com' })
    );
  });
});

describe('codigo', () => {
  it('en el alta lo canjea contra el servidor', async () => {
    vi.mocked(auth.beginEmailSignUp).mockResolvedValue({ status: 'otp_enviado' });
    vi.mocked(auth.confirmEmailSignUp).mockResolvedValue(undefined);
    const { result } = await montar();

    await act(async () => {
      await result.current.submitSignUp({
        email: 'ana@ejemplo.com',
        password: 'Contrasena1',
        fullName: 'Ana',
      });
    });
    await act(async () => {
      await result.current.submitOtp('123456');
    });

    expect(auth.confirmEmailSignUp).toHaveBeenCalledWith('ana@ejemplo.com', '123456');
    expect(flowState.clearPendingAuthFlow).toHaveBeenCalled();
  });

  // El punto delicado del diseño: en la recuperacion el codigo NO se canjea al
  // escribirlo. Si se hiciera, cerrar el panel en la pantalla siguiente dejaria
  // al usuario dentro con la contrasena vieja, que es lo que venia a cambiar.
  it('en la recuperacion NO lo canjea todavia', async () => {
    vi.mocked(auth.beginPasswordRecovery).mockResolvedValue({ status: 'otp_enviado' });
    const { result } = await montar();

    await act(async () => {
      await result.current.submitRecoveryRequest('ana@ejemplo.com');
    });
    await act(async () => {
      await result.current.submitOtp('123456');
    });

    expect(result.current.view).toBe('nueva-contrasena');
    expect(auth.completePasswordRecovery).not.toHaveBeenCalled();
  });

  it('rechaza un codigo incompleto sin llamar a nadie', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitOtp('12');
    });

    expect(auth.confirmEmailSignUp).not.toHaveBeenCalled();
    expect(result.current.errors.code).toBeTruthy();
  });
});

describe('contrasena nueva', () => {
  async function llegarAContrasenaNueva() {
    vi.mocked(auth.beginPasswordRecovery).mockResolvedValue({ status: 'otp_enviado' });
    const vista = await montar();

    await act(async () => {
      await vista.result.current.submitRecoveryRequest('ana@ejemplo.com');
    });
    await act(async () => {
      await vista.result.current.submitOtp('123456');
    });

    return vista;
  }

  it('canjea el codigo y cambia la contrasena en el mismo paso', async () => {
    vi.mocked(auth.completePasswordRecovery).mockResolvedValue({ status: 'ok' });
    const { result } = await llegarAContrasenaNueva();

    await act(async () => {
      await result.current.submitNewPassword('ContrasenaNueva1');
    });

    expect(auth.completePasswordRecovery).toHaveBeenCalledWith(
      'ana@ejemplo.com',
      '123456',
      'ContrasenaNueva1'
    );
    expect(result.current.view).toBe('login');
    expect(result.current.banner?.text).toContain('Contrasena cambiada');
  });

  it('manda a Google, sin cambiar nada, si la cuenta es de Google', async () => {
    vi.mocked(auth.completePasswordRecovery).mockResolvedValue({ status: 'cuenta_google' });
    const { result } = await llegarAContrasenaNueva();

    await act(async () => {
      await result.current.submitNewPassword('ContrasenaNueva1');
    });

    expect(result.current.view).toBe('login');
    expect(result.current.banner?.text).toContain('Google');
  });

  it('vuelve a pedir el codigo si se perdio de memoria', async () => {
    const { result } = await montar();

    // Sin pasar por la pantalla del codigo no hay nada verificado en memoria.
    await act(async () => {
      await result.current.submitNewPassword('ContrasenaNueva1');
    });

    expect(auth.completePasswordRecovery).not.toHaveBeenCalled();
    expect(result.current.view).toBe('verificar-otp');
  });
});

describe('reenvio', () => {
  it('no reenvia mientras corre la cuenta atras', async () => {
    vi.mocked(auth.beginEmailSignUp).mockResolvedValue({ status: 'otp_enviado' });
    const { result } = await montar();

    await act(async () => {
      await result.current.submitSignUp({
        email: 'ana@ejemplo.com',
        password: 'Contrasena1',
        fullName: 'Ana',
      });
    });

    expect(result.current.resendCooldownSeconds).toBeGreaterThan(0);

    await act(async () => {
      await result.current.resendCode();
    });

    expect(auth.resendSignUpCode).not.toHaveBeenCalled();
  });
});

describe('goTo', () => {
  it('cambia de vista limpiando aviso y errores', async () => {
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('mal', '', false);
    });
    expect(result.current.errors.email).toBeTruthy();

    act(() => {
      result.current.goTo('registro');
    });

    expect(result.current.view).toBe('registro');
    expect(result.current.errors).toEqual({});
    expect(result.current.banner).toBeNull();
  });
});

describe('recordar el correo', () => {
  it('lo guarda al entrar si se marco la casilla', async () => {
    vi.mocked(auth.loginWithEmailPassword).mockResolvedValue({ status: 'ok' });
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('ana@ejemplo.com', 'Contrasena1', true);
    });

    expect(flowState.saveRememberedEmail).toHaveBeenCalledWith('ana@ejemplo.com');
  });

  it('lo olvida si no se marco', async () => {
    vi.mocked(auth.loginWithEmailPassword).mockResolvedValue({ status: 'ok' });
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('ana@ejemplo.com', 'Contrasena1', false);
    });

    expect(flowState.clearRememberedEmail).toHaveBeenCalled();
    expect(flowState.saveRememberedEmail).not.toHaveBeenCalled();
  });

  // Guardar un correo que acaba de fallar seria rellenar el formulario con lo
  // que no funciona.
  it('no lo guarda si el login falla', async () => {
    vi.mocked(auth.loginWithEmailPassword).mockRejectedValue(new Error('Correo o contrasena incorrectos.'));
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('ana@ejemplo.com', 'mala', true);
    });

    expect(flowState.saveRememberedEmail).not.toHaveBeenCalled();
  });

  it('lo ofrece al montar para rellenar el formulario', async () => {
    vi.mocked(flowState.loadRememberedEmail).mockResolvedValue('ana@ejemplo.com');
    const { result } = await montar();

    await waitFor(() => expect(result.current.rememberedEmail).toBe('ana@ejemplo.com'));
  });

  // La contrasena no se guarda nunca. Este test existe para que quitarlo sea una
  // decision consciente y no un descuido.
  it('nunca guarda la contrasena', async () => {
    vi.mocked(auth.loginWithEmailPassword).mockResolvedValue({ status: 'ok' });
    const { result } = await montar();

    await act(async () => {
      await result.current.submitLogin('ana@ejemplo.com', 'Contrasena1', true);
    });

    const guardado = JSON.stringify(vi.mocked(flowState.saveRememberedEmail).mock.calls);
    expect(guardado).not.toContain('Contrasena1');
  });
});
