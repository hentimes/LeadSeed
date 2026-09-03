/**
 * Piezas compartidas por las cinco vistas del login.
 *
 * Las clases del boton principal y del campo salen tal cual del diseño ya
 * aprobado en `LoginPage`: el degradado morado con su relieve, el radio de 12px
 * y el borde `border-line`. No se rediseña nada aqui; solo se extrae para que
 * las cinco pantallas no lo repitan y no se desincronicen entre ellas.
 */

import { useId } from 'react';
import type { AuthBanner as AuthBannerModel } from '../../hooks/useEmailAuthForm';
import { OTP_MAX_LENGTH } from '../../utils/authValidation';

/**
 * Aviso de la pantalla.
 *
 * Sustituye al `alert()` del navegador, que bloquea, no se puede dar estilo y
 * -lo importante- invita a mostrar el mensaje crudo del backend. Aqui el texto
 * siempre viene ya traducido desde `authService`.
 *
 * `role="alert"` para que un lector de pantalla lo anuncie: quien no ve la
 * pantalla necesita enterarse de que el codigo era incorrecto.
 */
export function AuthBanner({ banner }: { banner: AuthBannerModel | null }) {
  if (!banner) return null;

  const esError = banner.tone === 'error';

  return (
    <div
      role="alert"
      className={`w-full rounded-[10px] px-3 py-2.5 text-[13px] leading-snug ${
        esError
          ? 'bg-state-danger-soft text-state-danger border border-state-danger'
          : 'bg-primary-soft/40 text-ink-secondary border border-primary-soft'
      }`}
    >
      {banner.text}
    </div>
  );
}

interface AuthTextFieldProps {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  /** Mensaje bajo el campo. Su presencia marca el campo como invalido. */
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function AuthTextField({
  label,
  type,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  disabled,
}: AuthTextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-3.5 py-[11px] rounded-[12px] border bg-surface text-[15px] text-ink placeholder:text-ink-secondary/60 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
          error
            ? 'border-state-danger focus:ring-state-danger-soft'
            : 'border-line focus:ring-primary-soft focus:border-primary-soft'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[12px] text-state-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Campo del codigo.
 *
 * `inputMode="numeric"` levanta el teclado numerico en movil, y el filtrado a
 * digitos ocurre al escribir porque la gente pega el codigo desde el correo y
 * arrastra espacios. Ver `normalizeOtpCode`.
 */
export function OtpCodeInput({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink mb-1.5">
        Codigo del correo
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={OTP_MAX_LENGTH}
        placeholder="Pegalo aqui"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-3.5 py-[11px] rounded-[12px] border bg-surface text-center text-[22px] font-semibold tracking-[0.25em] text-ink placeholder:text-[15px] placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-secondary/60 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
          error
            ? 'border-state-danger focus:ring-state-danger-soft'
            : 'border-line focus:ring-primary-soft focus:border-primary-soft'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[12px] text-state-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** El boton morado del diseño aprobado, ahora con estado de carga. */
export function AuthPrimaryButton({
  children,
  isBusy,
  disabled,
}: {
  children: React.ReactNode;
  isBusy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || isBusy}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-[12px] bg-gradient-to-b from-[#7e62f9] to-[#603FE2] text-white rounded-[12px] font-semibold text-[15px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.15),0_4px_14px_0_rgba(108,76,246,0.35)] transition-opacity hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isBusy ? 'Un momento...' : children}
    </button>
  );
}

/** Enlace de texto para moverse entre vistas. Nunca un `<a href="#">`. */
export function AuthLinkButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-primary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-primary-soft rounded disabled:opacity-60"
    >
      {children}
    </button>
  );
}
