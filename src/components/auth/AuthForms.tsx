/**
 * Las cinco vistas del login con correo.
 *
 * Viven juntas porque son cinco formularios cortos que comparten estructura y se
 * leen mejor de corrido que repartidos en cinco archivos de treinta lineas. Toda
 * la logica esta en `useEmailAuthForm`; esto es presentacion y nada mas.
 *
 * Cada una es un `<form>` de verdad, no un `<div>` con un boton: asi Intro envia
 * el formulario y los gestores de contraseñas reconocen los campos. Por eso los
 * `autoComplete` estan puestos con cuidado -`new-password` en el alta,
 * `current-password` al entrar-, que es lo que distingue "guardar contraseña
 * nueva" de "rellenar la guardada".
 */

import { useState, type FormEvent } from 'react';
import {
  AuthBanner,
  AuthLinkButton,
  AuthPrimaryButton,
  AuthTextField,
  OtpCodeInput,
} from './AuthControls';
import type { EmailAuthForm } from '../../hooks/useEmailAuthForm';
import { normalizeOtpCode } from '../../utils/authValidation';

function alEnviar(accion: () => void) {
  return (event: FormEvent) => {
    event.preventDefault();
    accion();
  };
}

export function LoginForm({ form }: { form: EmailAuthForm }) {
  /**
   * null significa "sin tocar": manda el correo recordado.
   *
   * Se deriva en vez de copiarlo con un efecto porque el correo recordado llega
   * despues del primer render, y copiarlo provoca renders en cascada -el ESLint
   * del repo lo marca-. Asi, en cuanto llega aparece solo, y deja de mandar en
   * cuanto el usuario escribe.
   */
  const [emailEditado, setEmailEditado] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);

  const email = emailEditado ?? form.rememberedEmail;

  return (
    <form
      noValidate
      className="w-full space-y-4"
      onSubmit={alEnviar(() => void form.submitLogin(email, password, recordar))}
    >
      <AuthBanner banner={form.banner} />

      <AuthTextField
        label="Correo"
        type="email"
        value={email}
        onChange={setEmailEditado}
        error={form.errors.email}
        autoComplete="email"
        placeholder="tu@correo.com"
        disabled={form.isBusy}
      />

      <AuthTextField
        label="Contrasena"
        type="password"
        value={password}
        onChange={setPassword}
        error={form.errors.password}
        autoComplete="current-password"
        disabled={form.isBusy}
      />

      <div className="flex items-center justify-between -mt-1">
        {/*
          Recuerda el correo, no la contrasena. De esa se encarga el gestor del
          navegador, que la cifra con el perfil del usuario; guardarla nosotros
          seria dejarla en claro en el almacenamiento de la extension.
        */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={recordar}
            onChange={(event) => setRecordar(event.target.checked)}
            disabled={form.isBusy}
            className="w-4 h-4 rounded border-line text-primary focus:ring-2 focus:ring-primary-soft cursor-pointer"
          />
          <span className="text-[13px] text-ink-secondary">Recordar mi correo</span>
        </label>

        <AuthLinkButton onClick={() => form.goTo('recuperar')} disabled={form.isBusy}>
          <span className="text-[13px]">Olvide mi contrasena</span>
        </AuthLinkButton>
      </div>

      <AuthPrimaryButton isBusy={form.isBusy}>Iniciar sesion</AuthPrimaryButton>
    </form>
  );
}

export function SignUpForm({ form }: { form: EmailAuthForm }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      noValidate
      className="w-full space-y-4"
      onSubmit={alEnviar(() => void form.submitSignUp({ email, password, fullName }))}
    >
      <AuthBanner banner={form.banner} />

      <AuthTextField
        label="Nombre"
        type="text"
        value={fullName}
        onChange={setFullName}
        error={form.errors.fullName}
        autoComplete="name"
        placeholder="Como te llamas"
        disabled={form.isBusy}
      />

      <AuthTextField
        label="Correo"
        type="email"
        value={email}
        onChange={setEmail}
        error={form.errors.email}
        autoComplete="email"
        placeholder="tu@correo.com"
        disabled={form.isBusy}
      />

      <AuthTextField
        label="Contrasena"
        type="password"
        value={password}
        onChange={setPassword}
        error={form.errors.password}
        autoComplete="new-password"
        placeholder="Al menos 10 caracteres"
        disabled={form.isBusy}
      />

      <AuthPrimaryButton isBusy={form.isBusy}>Crear cuenta</AuthPrimaryButton>
    </form>
  );
}

export function OtpVerifyForm({ form }: { form: EmailAuthForm }) {
  const [code, setCode] = useState('');

  return (
    <form noValidate className="w-full space-y-4" onSubmit={alEnviar(() => void form.submitOtp(code))}>
      <AuthBanner banner={form.banner} />

      <p className="text-[13px] text-ink-secondary leading-relaxed">
        Te enviamos un codigo a <span className="font-semibold text-ink">{form.email}</span>. Puede
        tardar un minuto en llegar.
      </p>

      <OtpCodeInput
        value={code}
        onChange={(valor) => setCode(normalizeOtpCode(valor))}
        error={form.errors.code}
        disabled={form.isBusy}
      />

      <AuthPrimaryButton isBusy={form.isBusy}>Verificar</AuthPrimaryButton>

      <div className="flex items-center justify-between text-[13px]">
        <AuthLinkButton
          onClick={() => void form.resendCode()}
          disabled={form.isBusy || form.resendCooldownSeconds > 0}
        >
          {form.resendCooldownSeconds > 0
            ? `Reenviar en ${form.resendCooldownSeconds}s`
            : 'Reenviar codigo'}
        </AuthLinkButton>

        <AuthLinkButton onClick={() => form.goTo('login')} disabled={form.isBusy}>
          Volver
        </AuthLinkButton>
      </div>

      {/*
        Salida para quien ya tenia cuenta. El servidor responde igual exista o no
        el correo -es lo que impide averiguar quien esta registrado-, asi que el
        codigo simplemente no llega y sin esta nota el usuario se queda encallado
        esperando. Sugiere sin confirmar nada.
      */}
      <p className="text-[12px] text-ink-secondary leading-relaxed">
        Si no llega ningun codigo, puede que ese correo ya tenga cuenta. Prueba a{' '}
        <AuthLinkButton onClick={() => form.goTo('login')} disabled={form.isBusy}>
          <span className="text-[12px]">iniciar sesion</span>
        </AuthLinkButton>{' '}
        o a entrar con Google.
      </p>
    </form>
  );
}

export function RecoveryRequestForm({ form }: { form: EmailAuthForm }) {
  const [email, setEmail] = useState('');

  return (
    <form
      noValidate
      className="w-full space-y-4"
      onSubmit={alEnviar(() => void form.submitRecoveryRequest(email))}
    >
      <AuthBanner banner={form.banner} />

      <p className="text-[13px] text-ink-secondary leading-relaxed">
        Escribe tu correo y te enviamos un codigo para poner una contrasena nueva.
      </p>

      <AuthTextField
        label="Correo"
        type="email"
        value={email}
        onChange={setEmail}
        error={form.errors.email}
        autoComplete="email"
        placeholder="tu@correo.com"
        disabled={form.isBusy}
      />

      <AuthPrimaryButton isBusy={form.isBusy}>Enviar codigo</AuthPrimaryButton>

      <div className="text-center">
        <AuthLinkButton onClick={() => form.goTo('login')} disabled={form.isBusy}>
          <span className="text-[13px]">Volver</span>
        </AuthLinkButton>
      </div>
    </form>
  );
}

export function NewPasswordForm({ form }: { form: EmailAuthForm }) {
  const [password, setPassword] = useState('');

  return (
    <form
      noValidate
      className="w-full space-y-4"
      onSubmit={alEnviar(() => void form.submitNewPassword(password))}
    >
      <AuthBanner banner={form.banner} />

      <AuthTextField
        label="Contrasena nueva"
        type="password"
        value={password}
        onChange={setPassword}
        error={form.errors.password}
        autoComplete="new-password"
        placeholder="Al menos 10 caracteres"
        disabled={form.isBusy}
      />

      <AuthPrimaryButton isBusy={form.isBusy}>Guardar contrasena</AuthPrimaryButton>

      <div className="text-center">
        <AuthLinkButton onClick={() => form.goTo('login')} disabled={form.isBusy}>
          <span className="text-[13px]">Cancelar</span>
        </AuthLinkButton>
      </div>
    </form>
  );
}
