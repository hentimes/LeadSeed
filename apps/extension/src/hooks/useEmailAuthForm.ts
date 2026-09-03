/**
 * Maquina de estados del alta e inicio de sesion con correo.
 *
 * Vive en un hook y no dentro de `LoginPage` por la misma razon que
 * `useNavigationRailState`: el componente es casi todo decoracion aprobada -SVG
 * de fondo, logo, el boton de Google- y meter cinco vistas ahi dentro lo
 * volveria intocable. Aqui la logica se prueba sin montar nada.
 *
 * No usa el enrutador. El hash lo ocupa `platform/web.ts` para navegar entre
 * leads y agenda, y colgar de ahi las vistas del login provocaria colisiones con
 * la navegacion de la aplicacion. Son vistas de una sola pantalla, no rutas.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  beginEmailSignUp,
  beginPasswordRecovery,
  completePasswordRecovery,
  confirmEmailSignUp,
  loginWithEmailPassword,
  resendSignUpCode,
} from '../services/authService';
import {
  clearPendingAuthFlow,
  clearRememberedEmail,
  loadPendingAuthFlow,
  loadRememberedEmail,
  savePendingAuthFlow,
  saveRememberedEmail,
  type OtpPurpose,
} from '../services/authFlowState';
import {
  normalizeOtpCode,
  validateEmail,
  validateFullName,
  validateOtpCode,
  validatePassword,
} from '../utils/authValidation';
import { getErrorMessage } from '../utils/errorMessage';

export type AuthView = 'login' | 'registro' | 'verificar-otp' | 'recuperar' | 'nueva-contrasena';

export interface AuthBanner {
  tone: 'info' | 'error';
  text: string;
}

/** Errores por campo. La clave es el nombre del campo del formulario. */
export type AuthFieldErrors = Partial<Record<'email' | 'password' | 'fullName' | 'code', string>>;

/**
 * Segundos que el boton de reenviar queda bloqueado.
 *
 * Coincide con `max_frequency = "60s"` de supabase/config.toml. Si no
 * coincidieran, el usuario podria pulsar y recibir el error de exceso de envios
 * sin entender por que: el cooldown existe para que ese error no llegue nunca.
 */
const RESEND_COOLDOWN_SECONDS = 60;

export interface EmailAuthForm {
  view: AuthView;
  /** Correo del flujo en curso. Se muestra en la pantalla del codigo. */
  email: string;
  /** Correo recordado de la ultima vez, para rellenar el formulario. */
  rememberedEmail: string;
  banner: AuthBanner | null;
  errors: AuthFieldErrors;
  isBusy: boolean;
  resendCooldownSeconds: number;
  goTo(view: AuthView): void;
  submitLogin(email: string, password: string, recordar: boolean): Promise<void>;
  submitSignUp(input: { email: string; password: string; fullName: string }): Promise<void>;
  submitOtp(code: string): Promise<void>;
  submitRecoveryRequest(email: string): Promise<void>;
  submitNewPassword(password: string): Promise<void>;
  resendCode(): Promise<void>;
}

export function useEmailAuthForm(): EmailAuthForm {
  const [view, setView] = useState<AuthView>('login');
  const [purpose, setPurpose] = useState<OtpPurpose>('signup');
  const [email, setEmail] = useState('');
  const [banner, setBanner] = useState<AuthBanner | null>(null);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isBusy, setIsBusy] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [rememberedEmail, setRememberedEmail] = useState('');

  /**
   * El codigo verificado vive SOLO aqui, en memoria, entre la pantalla del
   * codigo y la de contrasena nueva. No se persiste a proposito: guardarlo
   * seria dejar la llave debajo del felpudo. El precio es que cerrar el panel
   * en la ultima pantalla obliga a pedir un codigo nuevo.
   */
  const verifiedCodeRef = useRef<string>('');

  /**
   * Espejo del cooldown para leerlo sin depender de el.
   *
   * `resendCode` necesita saber si el contador sigue corriendo, pero si lo
   * leyera del estado tendria que declararlo como dependencia, y como el efecto
   * lo decrementa cada segundo la funcion se recrearia sesenta veces por cada
   * codigo pedido. Con el ref la comprobacion sigue siendo correcta y la funcion
   * se mantiene estable.
   */
  const cooldownRef = useRef(0);

  // Al montar, recupera un flujo dejado a medias. Hace falta porque `signUp` con
  // confirmacion no devuelve sesion: entre crear la cuenta y canjear el codigo
  // no hay nada que Supabase pueda restaurar por su cuenta.
  // El correo recordado de la ultima vez. Solo el correo: ver authFlowState.
  useEffect(() => {
    let cancelado = false;

    void loadRememberedEmail().then((correo) => {
      if (cancelado) return;
      setRememberedEmail(correo);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    void loadPendingAuthFlow().then((flujo) => {
      if (cancelado || !flujo) return;
      setEmail(flujo.email);
      setPurpose(flujo.purpose);
      setView('verificar-otp');
      setBanner({
        tone: 'info',
        text: 'Tenias una verificacion a medias. Escribe el codigo o pide uno nuevo.',
      });
    });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    cooldownRef.current = resendCooldownSeconds;
  }, [resendCooldownSeconds]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;

    // setTimeout pelado, sin `window`: la regla del repo lo prohibe en hooks
    // porque `window` no existe en React Native, y los temporizadores globales
    // si estan ahi.
    const temporizador = setTimeout(() => {
      setResendCooldownSeconds((quedan) => Math.max(0, quedan - 1));
    }, 1000);

    return () => clearTimeout(temporizador);
  }, [resendCooldownSeconds]);

  const goTo = useCallback((siguiente: AuthView) => {
    setView(siguiente);
    setBanner(null);
    setErrors({});
  }, []);

  /**
   * Envoltorio comun de cada envio.
   *
   * Centraliza tres cosas que se olvidan por separado: no permitir dos envios a
   * la vez, limpiar el error anterior antes de intentarlo, y traducir el fallo a
   * un banner en vez de dejarlo escapar a la consola. Los mensajes ya vienen en
   * castellano desde `authService`; `getErrorMessage` solo cubre el caso raro de
   * un error sin texto.
   */
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

  const submitLogin = useCallback(
    async (correo: string, password: string, recordar: boolean) => {
      const camposMal: AuthFieldErrors = {};
      const errorCorreo = validateEmail(correo);
      if (errorCorreo) camposMal.email = errorCorreo;
      if (!password) camposMal.password = 'Escribe tu contrasena.';

      setErrors(camposMal);
      if (Object.keys(camposMal).length > 0) return;

      await ejecutar(async () => {
        const resultado = await loginWithEmailPassword(correo, password);

        // Se recuerda solo cuando el login sale bien: guardar un correo que
        // acaba de fallar seria rellenar el formulario con lo que no funciona.
        if (recordar) {
          await saveRememberedEmail(correo);
        } else {
          await clearRememberedEmail();
        }

        if (resultado.status === 'pendiente_verificacion') {
          const limpio = correo.trim();
          setEmail(limpio);
          setPurpose('signup');
          await savePendingAuthFlow({ purpose: 'signup', email: limpio, startedAt: Date.now() });
          setView('verificar-otp');
          setBanner({
            tone: 'info',
            text: 'Falta confirmar tu correo. Te enviamos un codigo nuevo.',
          });
          await resendSignUpCode(limpio);
          setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
        }
        // Con status 'ok' no se hace nada: `onAuthStateChange` en AuthContext ya
        // detecta la sesion y cambia de pantalla. Recargar aqui, como hace el
        // flujo de Google, parpadearia y borraria el formulario.
      });
    },
    [ejecutar]
  );

  const submitSignUp = useCallback(
    async (input: { email: string; password: string; fullName: string }) => {
      const camposMal: AuthFieldErrors = {};
      const errorNombre = validateFullName(input.fullName);
      const errorCorreo = validateEmail(input.email);
      const errorPassword = validatePassword(input.password);
      if (errorNombre) camposMal.fullName = errorNombre;
      if (errorCorreo) camposMal.email = errorCorreo;
      if (errorPassword) camposMal.password = errorPassword;

      setErrors(camposMal);
      if (Object.keys(camposMal).length > 0) return;

      await ejecutar(async () => {
        await beginEmailSignUp(input);
        const limpio = input.email.trim();
        setEmail(limpio);
        setPurpose('signup');
        await savePendingAuthFlow({ purpose: 'signup', email: limpio, startedAt: Date.now() });
        setView('verificar-otp');
        setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      });
    },
    [ejecutar]
  );

  const submitOtp = useCallback(
    async (code: string) => {
      const errorCodigo = validateOtpCode(code);
      setErrors(errorCodigo ? { code: errorCodigo } : {});
      if (errorCodigo) return;

      const limpio = normalizeOtpCode(code);

      // En la recuperacion NO se canjea el codigo todavia. Si se hiciera aqui y
      // el usuario cerrara el panel, entraria a la aplicacion con la contrasena
      // vieja intacta, que es justo lo que venia a cambiar. El canje ocurre
      // junto al cambio, en `submitNewPassword`.
      if (purpose === 'recovery') {
        verifiedCodeRef.current = limpio;
        setView('nueva-contrasena');
        setBanner(null);
        return;
      }

      await ejecutar(async () => {
        await confirmEmailSignUp(email, limpio);
        await clearPendingAuthFlow();
        // No se cambia de vista: la sesion que devuelve el codigo hace que
        // AuthContext saque a LoginPage de pantalla.
      });
    },
    [ejecutar, email, purpose]
  );

  const submitRecoveryRequest = useCallback(
    async (correo: string) => {
      const errorCorreo = validateEmail(correo);
      setErrors(errorCorreo ? { email: errorCorreo } : {});
      if (errorCorreo) return;

      await ejecutar(async () => {
        await beginPasswordRecovery(correo);
        const limpio = correo.trim();
        setEmail(limpio);
        setPurpose('recovery');
        await savePendingAuthFlow({ purpose: 'recovery', email: limpio, startedAt: Date.now() });
        setView('verificar-otp');
        setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      });
    },
    [ejecutar]
  );

  const submitNewPassword = useCallback(
    async (password: string) => {
      const errorPassword = validatePassword(password);
      setErrors(errorPassword ? { password: errorPassword } : {});
      if (errorPassword) return;

      if (!verifiedCodeRef.current) {
        // Solo puede pasar si se recargo la pantalla en este punto: el codigo
        // nunca se persiste. Se vuelve a pedir uno en vez de fallar en el
        // servidor con un mensaje que no explicaria nada.
        setView('verificar-otp');
        setBanner({ tone: 'info', text: 'Vuelve a escribir el codigo para continuar.' });
        return;
      }

      await ejecutar(async () => {
        const resultado = await completePasswordRecovery(
          email,
          verifiedCodeRef.current,
          password
        );

        verifiedCodeRef.current = '';
        await clearPendingAuthFlow();

        if (resultado.status === 'cuenta_google') {
          setView('login');
          setBanner({
            tone: 'info',
            text: 'Esa cuenta entra con Google, no tiene contrasena. Usa "Continuar con Google".',
          });
          return;
        }

        setView('login');
        setBanner({ tone: 'info', text: 'Contrasena cambiada. Ya puedes entrar.' });
      });
    },
    [ejecutar, email]
  );

  const resendCode = useCallback(async () => {
    if (cooldownRef.current > 0) return;

    await ejecutar(async () => {
      if (purpose === 'recovery') {
        await beginPasswordRecovery(email);
      } else {
        await resendSignUpCode(email);
      }
      setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      setBanner({ tone: 'info', text: 'Te enviamos otro codigo.' });
    });
  }, [ejecutar, email, purpose]);

  return {
    view,
    email,
    rememberedEmail,
    banner,
    errors,
    isBusy,
    resendCooldownSeconds,
    goTo,
    submitLogin,
    submitSignUp,
    submitOtp,
    submitRecoveryRequest,
    submitNewPassword,
    resendCode,
  };
}
