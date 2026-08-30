/**
 * Dialogo para crear o cambiar la contrasena.
 *
 * Es un modal y no un formulario incrustado en la pagina de ajustes porque
 * cambiar una credencial es una tarea con principio y fin, no un ajuste que se
 * toquetea de paso. Incrustado ocupaba media pantalla para algo que se hace dos
 * veces en la vida.
 *
 * Recibe el hook desde fuera en vez de crear el suyo: `AccountSettings` ya lo
 * usa para saber si hay contrasena, y montar un segundo duplicaria las consultas
 * y dejaria los dos estados desincronizados al guardar.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../design';
import { AuthBanner, AuthPrimaryButton, AuthTextField, OtpCodeInput } from '../auth/AuthControls';
import type { AccountPassword } from '../../hooks/useAccountPassword';
import { MIN_PASSWORD_LENGTH } from '../../utils/authValidation';

interface Props {
  cuenta: AccountPassword;
  onClose: () => void;
}

export default function PasswordDialog({ cuenta, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [repetida, setRepetida] = useState('');
  const [code, setCode] = useState('');
  const [errorRepetida, setErrorRepetida] = useState<string | undefined>();

  const esAlta = cuenta.tienePassword === false;
  const titulo = esAlta ? 'Crear contraseña' : 'Cambiar contraseña';

  const enviarPassword = (event: FormEvent) => {
    event.preventDefault();

    // La repeticion se comprueba aqui y no en el hook: es una cautela del
    // formulario contra el error de tecleo, no una regla de la cuenta. Al
    // servidor solo viaja una contrasena.
    if (password !== repetida) {
      setErrorRepetida('Las dos contraseñas no coinciden.');
      return;
    }
    setErrorRepetida(undefined);

    void cuenta.submitPassword(password).then(() => {
      setPassword('');
      setRepetida('');
    });
  };

  const enviarCodigo = (event: FormEvent) => {
    event.preventDefault();
    void cuenta.submitCode(code).then(() => setCode(''));
  };

  /**
   * Al guardarse, el hook deja el aviso en "Contrasena guardada." y vuelve al
   * paso de formulario. Se cierra solo, con una pausa corta para que de tiempo a
   * leer la confirmacion: sin ella el modal desaparece de golpe y el usuario se
   * queda sin saber si funciono.
   *
   * En un efecto y no durante el render, que es donde lo tenia primero: alli el
   * temporizador se programaba en cada render y no habia forma de cancelarlo.
   */
  const guardado = cuenta.banner?.text === 'Contrasena guardada.';
  useEffect(() => {
    if (!guardado) return;
    const temporizador = setTimeout(onClose, 900);
    return () => clearTimeout(temporizador);
  }, [guardado, onClose]);

  return (
    <Modal onClose={onClose} maxWidth="380px" label={titulo}>
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-[17px] font-bold text-ink">{titulo}</h2>
          {esAlta && (
            <p className="text-[12px] text-ink-secondary leading-relaxed mt-1">
              Podrás entrar con tu correo además de con Google.
            </p>
          )}
        </div>

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
          </form>
        ) : (
          <form noValidate className="space-y-3" onSubmit={enviarPassword}>
            <AuthTextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              error={cuenta.errors.password}
              autoComplete="new-password"
              placeholder={`Al menos ${MIN_PASSWORD_LENGTH} caracteres`}
              disabled={cuenta.isBusy}
            />
            <AuthTextField
              label="Repítela"
              type="password"
              value={repetida}
              onChange={(valor) => {
                setRepetida(valor);
                if (errorRepetida) setErrorRepetida(undefined);
              }}
              error={errorRepetida}
              autoComplete="new-password"
              disabled={cuenta.isBusy}
            />
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Una mayúscula, una minúscula y un número, mínimo {MIN_PASSWORD_LENGTH} caracteres.
            </p>
            <AuthPrimaryButton isBusy={cuenta.isBusy}>
              {esAlta ? 'Crear' : 'Guardar'}
            </AuthPrimaryButton>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          disabled={cuenta.isBusy}
          className="w-full text-[13px] text-ink-secondary hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary-soft rounded py-1 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
