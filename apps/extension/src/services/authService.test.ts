import { describe, it, expect, vi, beforeEach } from 'vitest';

// El repositorio es la frontera con Supabase. Se sustituye entero para poder
// provocar cada codigo de error sin red.
vi.mock('../repositories/authRepository', () => ({
  fetchCurrentSession: vi.fn(),
  fetchCurrentUserAuthProviders: vi.fn(),
  fetchCurrentUserHasPassword: vi.fn(),
  persistOAuthSession: vi.fn(),
  persistGoogleCalendarConnection: vi.fn(),
  sendPasswordRecoveryOtp: vi.fn(),
  sendSignUpOtp: vi.fn(),
  signInWithEmailPassword: vi.fn(),
  signOutCurrentSession: vi.fn(),
  signUpWithEmailPassword: vi.fn(),
  startGoogleOAuthFlow: vi.fn(),
  subscribeToAuthChanges: vi.fn(),
  requestPasswordChangeNonce: vi.fn(),
  updateCurrentUserPassword: vi.fn(),
  updateCurrentUserPasswordWithNonce: vi.fn(),
  verifyEmailOtp: vi.fn(),
}));

import * as repo from '../repositories/authRepository';
import {
  beginEmailSignUp,
  confirmCurrentUserPassword,
  describeCurrentUserPassword,
  setCurrentUserPassword,
  beginPasswordRecovery,
  completePasswordRecovery,
  confirmEmailSignUp,
  loginWithEmailPassword,
  resendSignUpCode,
} from './authService';

/** Los errores de Supabase son objetos planos con `code`, no instancias de Error. */
function supabaseError(code: string, message = 'mensaje interno en ingles') {
  return Object.assign(new Error(message), { code });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loginWithEmailPassword', () => {
  it('entra cuando las credenciales son correctas', async () => {
    vi.mocked(repo.signInWithEmailPassword).mockResolvedValue({} as never);

    await expect(loginWithEmailPassword('ana@ejemplo.com', 'Contrasena1')).resolves.toEqual({
      status: 'ok',
    });
  });

  it('recorta los espacios del correo antes de enviarlo', async () => {
    vi.mocked(repo.signInWithEmailPassword).mockResolvedValue({} as never);

    await loginWithEmailPassword('  ana@ejemplo.com  ', 'Contrasena1');

    expect(repo.signInWithEmailPassword).toHaveBeenCalledWith('ana@ejemplo.com', 'Contrasena1');
  });

  it('no distingue entre correo inexistente y contrasena equivocada', async () => {
    vi.mocked(repo.signInWithEmailPassword).mockRejectedValue(
      supabaseError('invalid_credentials')
    );

    await expect(loginWithEmailPassword('ana@ejemplo.com', 'mala')).rejects.toThrow(
      'Correo o contrasena incorrectos.'
    );
  });

  it('nunca deja escapar el mensaje en ingles de Supabase', async () => {
    vi.mocked(repo.signInWithEmailPassword).mockRejectedValue(
      supabaseError('invalid_credentials', 'Invalid login credentials')
    );

    await expect(loginWithEmailPassword('ana@ejemplo.com', 'mala')).rejects.not.toThrow(
      'Invalid login credentials'
    );
  });

  it('lleva a verificar en vez de dar error cuando la cuenta no esta confirmada', async () => {
    vi.mocked(repo.signInWithEmailPassword).mockRejectedValue(
      supabaseError('email_not_confirmed')
    );

    await expect(loginWithEmailPassword('ana@ejemplo.com', 'Contrasena1')).resolves.toEqual({
      status: 'pendiente_verificacion',
    });
  });
});

describe('beginEmailSignUp', () => {
  it('pasa el nombre como metadata, que es lo que lee el trigger del perfil', async () => {
    vi.mocked(repo.signUpWithEmailPassword).mockResolvedValue({ user: null, session: null });

    await beginEmailSignUp({
      email: ' ana@ejemplo.com ',
      password: 'Contrasena1',
      fullName: '  Ana Perez  ',
    });

    expect(repo.signUpWithEmailPassword).toHaveBeenCalledWith(
      'ana@ejemplo.com',
      'Contrasena1',
      { full_name: 'Ana Perez' }
    );
  });

  it('responde igual cuando el correo ya tiene cuenta, sin delatarlo', async () => {
    // Supabase responde 200 con identities vacio en ese caso; el repositorio no
    // lanza, asi que el servicio no tiene nada que distinguir.
    vi.mocked(repo.signUpWithEmailPassword).mockResolvedValue({
      user: { identities: [] } as never,
      session: null,
    });

    await expect(
      beginEmailSignUp({ email: 'ya@existe.com', password: 'Contrasena1', fullName: 'Ana' })
    ).resolves.toEqual({ status: 'otp_enviado' });
  });
});

describe('beginPasswordRecovery', () => {
  it('responde lo mismo aunque la cuenta no exista', async () => {
    vi.mocked(repo.sendPasswordRecoveryOtp).mockRejectedValue(supabaseError('user_not_found'));

    await expect(beginPasswordRecovery('nadie@ejemplo.com')).resolves.toEqual({
      status: 'otp_enviado',
    });
  });

  it('tambien responde lo mismo cuando todo va bien', async () => {
    vi.mocked(repo.sendPasswordRecoveryOtp).mockResolvedValue(undefined);

    await expect(beginPasswordRecovery('ana@ejemplo.com')).resolves.toEqual({
      status: 'otp_enviado',
    });
  });

  it('si avisa del exceso de envios, que lo causo el propio usuario', async () => {
    vi.mocked(repo.sendPasswordRecoveryOtp).mockRejectedValue(
      supabaseError('over_email_send_rate_limit')
    );

    await expect(beginPasswordRecovery('ana@ejemplo.com')).rejects.toThrow(
      'Espera un minuto antes de pedir otro codigo.'
    );
  });
});

describe('completePasswordRecovery', () => {
  it('cambia la contrasena de una cuenta con identidad propia', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['email']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(true);
    vi.mocked(repo.updateCurrentUserPassword).mockResolvedValue(undefined);

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1')
    ).resolves.toEqual({ status: 'ok' });

    expect(repo.updateCurrentUserPassword).toHaveBeenCalledWith('ContrasenaNueva1');
  });

  it('usa el tipo recovery, no signup, al canjear el codigo', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['email']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(true);
    vi.mocked(repo.updateCurrentUserPassword).mockResolvedValue(undefined);

    await completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1');

    expect(repo.verifyEmailOtp).toHaveBeenCalledWith('ana@ejemplo.com', '123456', 'recovery');
  });

  // El agujero que motivo todo el diseño: sin esto, recuperar la contrasena de
  // una cuenta de Google le pondria contrasena y vincularia identidades por la
  // puerta de atras.
  it('NO le pone contrasena a una cuenta que solo entra con Google', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['google']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(false);
    vi.mocked(repo.signOutCurrentSession).mockResolvedValue(undefined);

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1')
    ).resolves.toEqual({ status: 'cuenta_google' });

    expect(repo.updateCurrentUserPassword).not.toHaveBeenCalled();
  });

  it('ademas cierra la sesion que abrio el codigo en ese caso', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['google']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(false);
    vi.mocked(repo.signOutCurrentSession).mockResolvedValue(undefined);

    await completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1');

    expect(repo.signOutCurrentSession).toHaveBeenCalled();
  });

  it('si tiene las dos identidades, si le cambia la contrasena', async () => {
    // Caso real en produccion: una cuenta con google y email a la vez.
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['email', 'google']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(true);
    vi.mocked(repo.updateCurrentUserPassword).mockResolvedValue(undefined);

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1')
    ).resolves.toEqual({ status: 'ok' });
  });

  // Fail-closed: si no se puede saber con que proveedores entra la cuenta, no se
  // toca la contrasena. Con un fail-open bastaba tumbar el RPC para saltarse la
  // proteccion de las cuentas de Google.
  it('no cambia la contrasena si no se pueden consultar los proveedores', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockRejectedValue(new Error('rpc caido'));
    vi.mocked(repo.signOutCurrentSession).mockResolvedValue(undefined);

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1')
    ).rejects.toThrow('No se pudo comprobar la cuenta. Intentalo de nuevo.');

    expect(repo.updateCurrentUserPassword).not.toHaveBeenCalled();
  });

  it('y ademas cierra la sesion abierta por el codigo cuando eso ocurre', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockRejectedValue(new Error('rpc caido'));
    vi.mocked(repo.signOutCurrentSession).mockResolvedValue(undefined);

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1')
    ).rejects.toThrow();

    expect(repo.signOutCurrentSession).toHaveBeenCalled();
  });

  // Antes se rechazaba por "es de Google". Ahora se rechaza por no tener
  // contrasena, que no es lo mismo: quien entro con Google y luego se puso una
  // desde su perfil si puede recuperarla.
  it('deja recuperar a un usuario de Google que ya se puso contrasena', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['google']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(true);
    vi.mocked(repo.updateCurrentUserPassword).mockResolvedValue(undefined);

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '12345678', 'ContrasenaNueva1')
    ).resolves.toEqual({ status: 'ok' });
  });

  it('no cambia nada si el codigo es incorrecto', async () => {
    vi.mocked(repo.verifyEmailOtp).mockRejectedValue(supabaseError('otp_expired'));

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '000000', 'ContrasenaNueva1')
    ).rejects.toThrow('Ese codigo ya caduco. Pide uno nuevo.');

    expect(repo.updateCurrentUserPassword).not.toHaveBeenCalled();
  });
});

describe('confirmEmailSignUp', () => {
  it('canjea el codigo con el tipo signup, no email', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);

    await confirmEmailSignUp('  ana@ejemplo.com  ', '123456');

    expect(repo.verifyEmailOtp).toHaveBeenCalledWith('ana@ejemplo.com', '123456', 'signup');
  });

  it('traduce el codigo caducado', async () => {
    vi.mocked(repo.verifyEmailOtp).mockRejectedValue(supabaseError('otp_expired'));

    await expect(confirmEmailSignUp('ana@ejemplo.com', '123456')).rejects.toThrow(
      'Ese codigo ya caduco. Pide uno nuevo.'
    );
  });

  it('traduce el codigo incorrecto', async () => {
    vi.mocked(repo.verifyEmailOtp).mockRejectedValue(supabaseError('invalid_otp'));

    await expect(confirmEmailSignUp('ana@ejemplo.com', '000000')).rejects.toThrow(
      'El codigo no es correcto.'
    );
  });
});

describe('resendSignUpCode', () => {
  it('reenvia recortando el correo', async () => {
    vi.mocked(repo.sendSignUpOtp).mockResolvedValue(undefined);

    await resendSignUpCode('  ana@ejemplo.com  ');

    expect(repo.sendSignUpOtp).toHaveBeenCalledWith('ana@ejemplo.com');
  });

  // Regresion: `auth.resend({type:'signup'})` solo funciona sobre una cuenta que
  // existe y no esta confirmada, asi que propagar su error convertia la pantalla
  // en un detector de cuentas. Debe callar.
  it('no delata el estado de la cuenta cuando el reenvio falla', async () => {
    vi.mocked(repo.sendSignUpOtp).mockRejectedValue(supabaseError('user_not_found'));

    await expect(resendSignUpCode('nadie@ejemplo.com')).resolves.toBeUndefined();
  });

  it('tampoco delata a una cuenta ya confirmada', async () => {
    vi.mocked(repo.sendSignUpOtp).mockRejectedValue(
      supabaseError('validation_failed', 'Email already confirmed')
    );

    await expect(resendSignUpCode('confirmada@ejemplo.com')).resolves.toBeUndefined();
  });

  it('pero si avisa del exceso de envios', async () => {
    vi.mocked(repo.sendSignUpOtp).mockRejectedValue(supabaseError('over_email_send_rate_limit'));

    await expect(resendSignUpCode('ana@ejemplo.com')).rejects.toThrow(
      'Espera un minuto antes de pedir otro codigo.'
    );
  });
});

describe('traduccion de errores', () => {
  it('traduce la contrasena debil', async () => {
    vi.mocked(repo.signUpWithEmailPassword).mockRejectedValue(supabaseError('weak_password'));

    await expect(
      beginEmailSignUp({ email: 'ana@ejemplo.com', password: 'x', fullName: 'Ana' })
    ).rejects.toThrow('Esa contrasena es demasiado debil.');
  });

  it('traduce el registro cerrado', async () => {
    vi.mocked(repo.signUpWithEmailPassword).mockRejectedValue(supabaseError('signup_disabled'));

    await expect(
      beginEmailSignUp({ email: 'ana@ejemplo.com', password: 'Contrasena1', fullName: 'Ana' })
    ).rejects.toThrow('El registro esta cerrado por ahora.');
  });

  it('traduce la contrasena repetida al cambiarla', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['email']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(true);
    vi.mocked(repo.updateCurrentUserPassword).mockRejectedValue(supabaseError('same_password'));

    await expect(
      completePasswordRecovery('ana@ejemplo.com', '123456', 'ContrasenaNueva1')
    ).rejects.toThrow('La contrasena nueva es igual a la anterior.');
  });

  it('cae al mensaje generico con un codigo desconocido', async () => {
    vi.mocked(repo.signInWithEmailPassword).mockRejectedValue(supabaseError('algo_raro'));

    await expect(loginWithEmailPassword('ana@ejemplo.com', 'Contrasena1')).rejects.toThrow(
      'No se pudo iniciar sesion.'
    );
  });
});

describe('normalizacion del correo', () => {
  it('la recuperacion recorta espacios', async () => {
    vi.mocked(repo.sendPasswordRecoveryOtp).mockResolvedValue(undefined);

    await beginPasswordRecovery('  ana@ejemplo.com  ');

    expect(repo.sendPasswordRecoveryOtp).toHaveBeenCalledWith('ana@ejemplo.com');
  });

  it('el cambio de contrasena tambien', async () => {
    vi.mocked(repo.verifyEmailOtp).mockResolvedValue({} as never);
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['email']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(true);
    vi.mocked(repo.updateCurrentUserPassword).mockResolvedValue(undefined);

    await completePasswordRecovery('  ana@ejemplo.com  ', '123456', 'ContrasenaNueva1');

    expect(repo.verifyEmailOtp).toHaveBeenCalledWith('ana@ejemplo.com', '123456', 'recovery');
  });
});


describe('describeCurrentUserPassword', () => {
  it('sabe que una cuenta de Google sin contrasena no la tiene', async () => {
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['google']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(false);

    await expect(describeCurrentUserPassword()).resolves.toEqual({
      tienePassword: false,
      usaGoogle: true,
    });
  });

  // El caso que la version anterior fallaba: poner una contrasena NO crea
  // identidad de correo, asi que deducirlo de las identidades daba false para
  // siempre y el perfil seguia ofreciendo "anadir contrasena".
  it('detecta la contrasena de un usuario de Google que se puso una', async () => {
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['google']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(true);

    await expect(describeCurrentUserPassword()).resolves.toEqual({
      tienePassword: true,
      usaGoogle: true,
    });
  });

  // Y el simetrico: una identidad de correo puede existir sin contrasena.
  it('no se cree que hay contrasena solo porque exista identidad de correo', async () => {
    vi.mocked(repo.fetchCurrentUserAuthProviders).mockResolvedValue(['email']);
    vi.mocked(repo.fetchCurrentUserHasPassword).mockResolvedValue(false);

    await expect(describeCurrentUserPassword()).resolves.toEqual({
      tienePassword: false,
      usaGoogle: false,
    });
  });
});

describe('setCurrentUserPassword', () => {
  it('cambia la contrasena directamente si la sesion es reciente', async () => {
    vi.mocked(repo.updateCurrentUserPassword).mockResolvedValue(undefined);

    await expect(setCurrentUserPassword('ContrasenaNueva1')).resolves.toEqual({ status: 'ok' });
  });

  // GoTrue considera reciente una sesion de menos de 24 horas. Pasado ese plazo
  // exige demostrar otra vez quien eres antes de tocar la credencial.
  it('pide codigo cuando el servidor exige reautenticacion', async () => {
    vi.mocked(repo.updateCurrentUserPassword).mockRejectedValue(
      supabaseError('reauthentication_needed')
    );

    await expect(setCurrentUserPassword('ContrasenaNueva1')).resolves.toEqual({
      status: 'necesita_codigo',
    });
  });

  it('traduce la contrasena repetida', async () => {
    vi.mocked(repo.updateCurrentUserPassword).mockRejectedValue(supabaseError('same_password'));

    await expect(setCurrentUserPassword('ContrasenaNueva1')).rejects.toThrow(
      'La contrasena nueva es igual a la anterior.'
    );
  });
});

describe('confirmCurrentUserPassword', () => {
  it('manda el codigo como nonce, recortado', async () => {
    vi.mocked(repo.updateCurrentUserPasswordWithNonce).mockResolvedValue(undefined);

    await confirmCurrentUserPassword('ContrasenaNueva1', '  12345678  ');

    expect(repo.updateCurrentUserPasswordWithNonce).toHaveBeenCalledWith(
      'ContrasenaNueva1',
      '12345678'
    );
  });

  it('avisa si el codigo no vale', async () => {
    vi.mocked(repo.updateCurrentUserPasswordWithNonce).mockRejectedValue(
      supabaseError('reauthentication_not_valid')
    );

    await expect(
      confirmCurrentUserPassword('ContrasenaNueva1', '12345678')
    ).rejects.toThrow('No se pudo cambiar la contrasena.');
  });
});
