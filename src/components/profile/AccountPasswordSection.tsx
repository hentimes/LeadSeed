/**
 * Seccion de contrasena dentro del perfil.
 *
 * Vive aparte del formulario de perfil y no dentro de el, aunque se muestren
 * juntos, porque son dos cosas distintas: el nombre y el avatar se guardan con
 * el boton de abajo, la contrasena se guarda sola y por su cuenta. Mezclarlas en
 * un unico "Guardar" haria que cambiar el avatar tocase la credencial, que es
 * justo lo que no se quiere.
 *
 * Reutiliza las primitivas del login (`AuthControls`) para que el campo y el
 * boton se vean igual en los dos sitios.
 */

import { useState, type FormEvent } from 'react';
import {
  AuthBanner,
  AuthPrimaryButton,
  AuthTextField,
  OtpCodeInput,
} from '../auth/AuthControls';
import { useAccountPassword } from '../../hooks/useAccountPassword';

export default function AccountPasswordSection() {
  const cuenta = useAccountPassword();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  if (cuenta.step === 'cargando') {
    return (
      <div className="border-t border-line pt-4 mt-4">
        <div className="h-4 w-40 bg-surface-sunken rounded animate-pulse" />
      </div>
    );
  }

  const esAlta = cuenta.tienePassword === false;

  const enviarPassword = (event: FormEvent) => {
    event.preventDefault();
    void cuenta.submitPassword(password).then(() => setPassword(''));
  };

  const enviarCodigo = (event: FormEvent) => {
    event.preventDefault();
    void cuenta.submitCode(code).then(() => setCode(''));
  };

  return (
    <div className="border-t border-line pt-4 mt-4 space-y-3">
      <div>
        <h3 className="font-semibold text-ink text-[15px]">
          {esAlta ? 'Anadir una contrasena' : 'Cambiar la contrasena'}
        </h3>
        {esAlta && (
          <p className="text-[13px] text-ink-secondary leading-relaxed mt-1">
            {cuenta.usaGoogle
              ? 'Ahora entras solo con Google. Si pones una contrasena podras entrar tambien con tu correo, sin perder el acceso con Google.'
              : 'Todavia no tienes contrasena en esta cuenta.'}
          </p>
        )}
      </div>

      {/*
        El banner va aqui arriba y no al final para que se lea sin tener que
        desplazarse: dentro de un modal el borde inferior suele quedar cortado.
      */}
      <AuthBanner banner={cuenta.banner} />

      {cuenta.step === 'formulario' ? (
        <form noValidate className="space-y-3" onSubmit={enviarPassword}>
          <AuthTextField
            label={esAlta ? 'Contrasena nueva' : 'Contrasena nueva'}
            type="password"
            value={password}
            onChange={setPassword}
            error={cuenta.errors.password}
            autoComplete="new-password"
            placeholder="Al menos 10 caracteres"
            disabled={cuenta.isBusy}
          />
          <AuthPrimaryButton isBusy={cuenta.isBusy}>
            {esAlta ? 'Anadir contrasena' : 'Cambiar contrasena'}
          </AuthPrimaryButton>
        </form>
      ) : (
        <form noValidate className="space-y-3" onSubmit={enviarCodigo}>
          <OtpCodeInput
            value={code}
            onChange={setCode}
            error={cuenta.errors.code}
            disabled={cuenta.isBusy}
          />
          <AuthPrimaryButton isBusy={cuenta.isBusy}>Confirmar</AuthPrimaryButton>
          <button
            type="button"
            onClick={() => {
              setCode('');
              cuenta.cancelarCodigo();
            }}
            disabled={cuenta.isBusy}
            className="w-full text-[13px] text-ink-secondary hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary-soft rounded py-1 disabled:opacity-60"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
