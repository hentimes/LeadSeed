/**
 * Poner o cambiar la contrasena de la cuenta, ya estando dentro.
 *
 * Es la unica via por la que una cuenta creada con Google llega a tener
 * contrasena. Funciona precisamente porque el usuario ya entro: hay una sesion
 * abierta que demuestra quien es. Hacerlo desde "olvide mi contrasena" seria una
 * puerta lateral al login de Google, y por eso alli se rechaza.
 *
 * Dos caminos, y cual toca lo decide el servidor:
 *
 * - Sesion reciente (menos de 24 horas): el cambio sale a la primera.
 * - Sesion vieja: GoTrue responde `reauthentication_needed` y hay que confirmar
 *   con un codigo que llega por correo.
 *
 * Se intenta primero sin codigo a proposito. Pedirlo siempre obligaria a ir al
 * correo a quien acaba de entrar y va derecho a su perfil, que es el caso
 * normal.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  confirmCurrentUserPassword,
  describeCurrentUserPassword,
  requestPasswordChangeCode,
  setCurrentUserPassword,
} from '../services/authService';
import { validateOtpCode, validatePassword } from '../utils/authValidation';
import { getErrorMessage } from '../utils/errorMessage';

export type AccountPasswordStep = 'cargando' | 'formulario' | 'codigo';

export interface AccountPasswordBanner {
  tone: 'info' | 'error';
  text: string;
}

export interface AccountPassword {
  step: AccountPasswordStep;
  /** null mientras se carga. */
  tienePassword: boolean | null;
  usaGoogle: boolean;
  banner: AccountPasswordBanner | null;
  errors: Partial<Record<'password' | 'code', string>>;
  isBusy: boolean;
  submitPassword(password: string): Promise<void>;
  submitCode(code: string): Promise<void>;
  cancelarCodigo(): void;
}

export function useAccountPassword(): AccountPassword {
  const [step, setStep] = useState<AccountPasswordStep>('cargando');
  const [tienePassword, setTienePassword] = useState<boolean | null>(null);
  const [usaGoogle, setUsaGoogle] = useState(false);
  const [banner, setBanner] = useState<AccountPasswordBanner | null>(null);
  const [errors, setErrors] = useState<Partial<Record<'password' | 'code', string>>>({});
  const [isBusy, setIsBusy] = useState(false);

  /**
   * La contrasena escrita, entre el intento y la confirmacion con codigo.
   *
   * Solo en memoria y solo mientras dura el paso. No se persiste: guardarla
   * seria dejar una credencial en claro a cambio de ahorrar un formulario.
   */
  const passwordRef = useRef('');

  useEffect(() => {
    let cancelado = false;

    describeCurrentUserPassword()
      .then((estado) => {
        if (cancelado) return;
        setTienePassword(estado.tienePassword);
        setUsaGoogle(estado.usaGoogle);
        setStep('formulario');
      })
      .catch(() => {
        if (cancelado) return;
        // Sin saber el estado no se puede etiquetar bien el formulario, pero
        // tampoco hace falta impedirlo: el servidor sabra que hacer.
        setTienePassword(null);
        setStep('formulario');
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const ejecutar = useCallback(async (accion: () => Promise<void>) => {
    setIsBusy(true);
    setBanner(null);
    try {
      await accion();
    } catch (error) {
      setBanner({ tone: 'error', text: getErrorMessage(error, 'Algo no salio bien.') });
    } finally {
      setIsBusy(false);
    }
  }, []);

  const submitPassword = useCallback(
    async (password: string) => {
      const errorPassword = validatePassword(password);
      setErrors(errorPassword ? { password: errorPassword } : {});
      if (errorPassword) return;

      await ejecutar(async () => {
        const resultado = await setCurrentUserPassword(password);

        if (resultado.status === 'necesita_codigo') {
          passwordRef.current = password;
          await requestPasswordChangeCode();
          setStep('codigo');
          setBanner({
            tone: 'info',
            text: 'Por seguridad te enviamos un codigo al correo. Escribelo para confirmar.',
          });
          return;
        }

        passwordRef.current = '';
        setTienePassword(true);
        setBanner({ tone: 'info', text: 'Contrasena guardada.' });
      });
    },
    [ejecutar]
  );

  const submitCode = useCallback(
    async (code: string) => {
      const errorCodigo = validateOtpCode(code);
      setErrors(errorCodigo ? { code: errorCodigo } : {});
      if (errorCodigo) return;

      if (!passwordRef.current) {
        // Solo pasa si se remonto el componente en este punto. Se vuelve a
        // empezar en vez de fallar en el servidor con un mensaje opaco.
        setStep('formulario');
        setBanner({ tone: 'info', text: 'Vuelve a escribir la contrasena.' });
        return;
      }

      await ejecutar(async () => {
        await confirmCurrentUserPassword(passwordRef.current, code);
        passwordRef.current = '';
        setTienePassword(true);
        setStep('formulario');
        setBanner({ tone: 'info', text: 'Contrasena guardada.' });
      });
    },
    [ejecutar]
  );

  const cancelarCodigo = useCallback(() => {
    passwordRef.current = '';
    setStep('formulario');
    setBanner(null);
    setErrors({});
  }, []);

  return {
    step,
    tienePassword,
    usaGoogle,
    banner,
    errors,
    isBusy,
    submitPassword,
    submitCode,
    cancelarCodigo,
  };
}
