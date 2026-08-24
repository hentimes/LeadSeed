/**
 * Ajustes de la cuenta: como entras y con que contrasena.
 *
 * Vive en Ajustes y no en el modal de perfil, aunque el primer intento fue ese.
 * La diferencia no es de sitio, es de naturaleza: el perfil es como te ven los
 * demas -nombre, avatar, biografia, marco premium- y esto es como entras tu. Una
 * credencial no es decoracion, y encima quedaba enterrada al final de un modal
 * con scroll, que es donde nadie la busca.
 */

import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthBanner, AuthPrimaryButton, AuthTextField, OtpCodeInput } from '../auth/AuthControls';
import { useAccountPassword } from '../../hooks/useAccountPassword';
import { MIN_PASSWORD_LENGTH } from '../../utils/authValidation';

export default function AccountSettings() {
  const { user } = useAuth();
  const cuenta = useAccountPassword();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const esAlta = cuenta.tienePassword === false;
  const esDesconocido = cuenta.tienePassword === null;

  const titulo = esDesconocido
    ? 'Contraseña de la cuenta'
    : esAlta
      ? 'Añadir una contraseña'
      : 'Cambiar la contraseña';

  const textoBoton = esDesconocido
    ? 'Guardar contraseña'
    : esAlta
      ? 'Añadir contraseña'
      : 'Cambiar contraseña';

  const enviarPassword = (event: FormEvent) => {
    event.preventDefault();
    void cuenta.submitPassword(password).then(() => setPassword(''));
  };

  const enviarCodigo = (event: FormEvent) => {
    event.preventDefault();
    void cuenta.submitCode(code).then(() => setCode(''));
  };

  return (
    <div className="bg-transparent pt-2 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-ink">Cuenta y acceso</h3>
        <p className="text-xs text-ink-muted mt-1">
          Con qué entras a LeadSeed y cómo cambiar tu contraseña.
        </p>
      </div>

      <div className="max-w-md space-y-6">
        <div>
          <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-3">
            Cómo entras
          </h4>
          <div className="rounded-xl border border-line bg-surface-muted p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Correo</span>
              <span className="text-ink font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Google</span>
              <span className="text-ink font-medium">
                {cuenta.usaGoogle ? 'Activado' : 'No conectado'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Contraseña</span>
              <span className="text-ink font-medium">
                {cuenta.step === 'cargando'
                  ? '...'
                  : esDesconocido
                    ? 'No se pudo comprobar'
                    : cuenta.tienePassword
                      ? 'Configurada'
                      : 'Sin configurar'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-3">
            {titulo}
          </h4>

          {esAlta && (
            <p className="text-xs text-ink-secondary leading-relaxed mb-3">
              {cuenta.usaGoogle
                ? 'Ahora entras solo con Google. Si pones una contraseña podrás entrar también con tu correo, sin perder el acceso con Google.'
                : 'Todavía no tienes contraseña en esta cuenta.'}
            </p>
          )}

          <div className="space-y-3">
            <AuthBanner banner={cuenta.banner} />

            {cuenta.step === 'codigo' ? (
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
            ) : (
              <form noValidate className="space-y-3" onSubmit={enviarPassword}>
                <AuthTextField
                  label="Contraseña nueva"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={cuenta.errors.password}
                  autoComplete="new-password"
                  placeholder={`Al menos ${MIN_PASSWORD_LENGTH} caracteres`}
                  disabled={cuenta.isBusy || cuenta.step === 'cargando'}
                />
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Necesita al menos {MIN_PASSWORD_LENGTH} caracteres, con una mayúscula, una
                  minúscula y un número.
                </p>
                <AuthPrimaryButton
                  isBusy={cuenta.isBusy}
                  disabled={cuenta.step === 'cargando'}
                >
                  {textoBoton}
                </AuthPrimaryButton>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
