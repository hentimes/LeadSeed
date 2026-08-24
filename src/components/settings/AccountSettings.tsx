/**
 * Ajustes de la cuenta: tus datos y como entras.
 *
 * El reparto con el modal de Perfil no es de sitio, es de naturaleza. El perfil
 * es como te ven los demas y se limita a mostrarlo; aqui se edita. Antes estaba
 * al reves -se editaba en un modal titulado "Editar Perfil" y la contrasena
 * colgaba al final del mismo- y eso mezclaba dos cosas que no se parecen: la
 * biografia es presentacion, la contrasena es acceso.
 *
 * La contrasena no tiene formulario propio a la vista. Es una linea de estado
 * con un enlace, y el formulario vive en un dialogo: cambiarla es una tarea con
 * principio y fin, no un ajuste que se toquetea de paso, y tenerla desplegada
 * ocupaba media pantalla para algo que se hace dos veces en la vida.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAccountPassword } from '../../hooks/useAccountPassword';
import { changeAvatar, saveProfileFields } from '../../services/profileService';
import { getErrorMessage } from '../../utils/errorMessage';
import PasswordDialog from './PasswordDialog';

const MAX_BIO = 140;

export default function AccountSettings() {
  const { profile, user, refreshProfile, hasFeature, isAdmin } = useAuth();
  const cuenta = useAccountPassword();

  /**
   * null significa "sin tocar": se muestra lo que diga el perfil.
   *
   * Copiar el perfil al estado con un efecto era lo primero que hice, y provoca
   * renders en cascada -el propio ESLint del repo lo marca-. Derivando el valor
   * no hay nada que sincronizar: si el perfil cambia por debajo, lo que se ve
   * cambia solo, salvo que el usuario ya estuviera escribiendo.
   */
  const [bioEditada, setBioEditada] = useState<string | null>(null);
  const [companyEditada, setCompanyEditada] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const ficheroRef = useRef<HTMLInputElement>(null);

  const esPro = hasFeature('premium_aesthetics') || isAdmin;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  const subirAvatar = async (evento: ChangeEvent<HTMLInputElement>) => {
    const fichero = evento.target.files?.[0];
    if (!fichero || !user) return;

    setSubiendoAvatar(true);
    setAviso(null);
    try {
      await changeAvatar(user.id, fichero);
      await refreshProfile();
      setAviso({ tone: 'ok', text: 'Foto actualizada.' });
      setTimeout(() => setAviso(null), 2500);
    } catch (error) {
      setAviso({ tone: 'error', text: getErrorMessage(error, 'No se pudo subir la foto.') });
    } finally {
      setSubiendoAvatar(false);
      // Se limpia para que volver a elegir el MISMO fichero dispare el evento.
      if (ficheroRef.current) ficheroRef.current.value = '';
    }
  };

  /** Los interruptores de comunidad se guardan solos, sin boton. */
  const alternar = async (campo: 'show_premium_frame' | 'is_invisible', valor: boolean) => {
    if (!user) return;
    try {
      await saveProfileFields(user.id, { [campo]: valor });
      await refreshProfile();
    } catch (error) {
      setAviso({ tone: 'error', text: getErrorMessage(error, 'No se pudo guardar.') });
    }
  };

  const bioGuardada = profile?.bio || '';
  const companyGuardada = profile?.company || '';
  const bio = bioEditada ?? bioGuardada;
  const company = companyEditada ?? companyGuardada;
  const sucio = bio !== bioGuardada || company !== companyGuardada;

  const guardar = async () => {
    if (!user) return;
    setGuardando(true);
    setAviso(null);
    try {
      await saveProfileFields(user.id, { bio: bio.trim(), company: company.trim() });
      await refreshProfile();
      // Se vuelve a "sin tocar" para que mande otra vez el perfil recien leido.
      setBioEditada(null);
      setCompanyEditada(null);
      setAviso({ tone: 'ok', text: 'Datos guardados.' });
      setTimeout(() => setAviso(null), 2500);
    } catch (error) {
      setAviso({ tone: 'error', text: getErrorMessage(error, 'No se pudo guardar.') });
    } finally {
      setGuardando(false);
    }
  };

  const estadoPassword =
    cuenta.step === 'cargando'
      ? '...'
      : cuenta.tienePassword === null
        ? 'No se pudo comprobar'
        : cuenta.tienePassword
          ? 'Configurada'
          : 'Sin configurar';

  return (
    <div className="bg-transparent pt-2 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-ink">Cuenta</h3>
        <p className="text-xs text-ink-muted mt-1">Tus datos y la forma en que entras.</p>
      </div>

      <div className="max-w-md space-y-6">
        {/* Tus datos */}
        <section>
          <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-3">
            Tus datos
          </h4>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-surface-hover border border-line shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-ink-muted">
                    {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">
                  {profile?.full_name || user?.email}
                </p>
                <button
                  type="button"
                  onClick={() => ficheroRef.current?.click()}
                  disabled={subiendoAvatar}
                  className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary-soft rounded disabled:opacity-40"
                >
                  {subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
                </button>
                <input
                  ref={ficheroRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void subirAvatar(e)}
                />
              </div>
            </div>

            <label className="block">
              <span className="text-xs text-ink-secondary">Empresa</span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompanyEditada(e.target.value)}
                maxLength={80}
                placeholder="Dónde trabajas"
                className="mt-1 w-full border-b border-line-strong px-1 py-1.5 text-sm bg-transparent text-ink placeholder:text-ink-muted focus:border-primary outline-none transition-colors"
              />
            </label>

            <label className="block">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-ink-secondary">Descripción</span>
                <span
                  className={`text-[11px] ${bio.length === MAX_BIO ? 'text-state-danger font-semibold' : 'text-ink-muted'}`}
                >
                  {bio.length}/{MAX_BIO}
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBioEditada(e.target.value)}
                rows={2}
                maxLength={MAX_BIO}
                placeholder="Una línea sobre ti"
                className="mt-1 w-full rounded-lg border border-line px-2.5 py-2 text-sm bg-surface-muted text-ink placeholder:text-ink-muted focus:border-primary focus:ring-1 focus:ring-primary-soft outline-none resize-none transition-colors"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void guardar()}
                disabled={!sucio || guardando}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              {aviso && (
                <span
                  className={`text-xs ${aviso.tone === 'ok' ? 'text-state-success' : 'text-state-danger'}`}
                >
                  {aviso.text}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Comunidad */}
        <section>
          <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-3">
            En la comunidad
          </h4>

          <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
            <Interruptor
              titulo="Marco premium"
              detalle="Destaca tu perfil en la comunidad"
              activo={profile?.show_premium_frame || false}
              esPro={esPro}
              onChange={(v) => void alternar('show_premium_frame', v)}
            />
            <Interruptor
              titulo="Modo fantasma"
              detalle="Oculta tu estado de conexión"
              activo={profile?.is_invisible || false}
              esPro={esPro}
              onChange={(v) => void alternar('is_invisible', v)}
            />
          </div>
        </section>

        {/* Como entras */}
        <section>
          <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-3">
            Cómo entras
          </h4>

          <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-ink-secondary">Correo</span>
              <span className="text-xs text-ink font-medium truncate ml-3">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-ink-secondary">Google</span>
              <span className="text-xs text-ink font-medium">
                {cuenta.usaGoogle ? 'Conectado' : 'No conectado'}
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-ink-secondary">Contraseña</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink font-medium">{estadoPassword}</span>
                <button
                  type="button"
                  onClick={() => setDialogoAbierto(true)}
                  disabled={cuenta.step === 'cargando'}
                  className="text-xs font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary-soft rounded disabled:opacity-40"
                >
                  {cuenta.tienePassword ? 'Cambiar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>

          {cuenta.tienePassword === false && cuenta.usaGoogle && (
            <p className="text-[11px] text-ink-muted leading-relaxed mt-2">
              Ahora entras solo con Google. Con una contraseña podrás entrar también con tu correo.
            </p>
          )}
        </section>
      </div>

      {dialogoAbierto && (
        <PasswordDialog cuenta={cuenta} onClose={() => setDialogoAbierto(false)} />
      )}
    </div>
  );
}

/**
 * Fila con interruptor.
 *
 * Se extrae porque las dos filas eran identicas salvo el texto, y en el modal
 * anterior estaban duplicadas enteras, incluida la cadena de clases del switch.
 */
function Interruptor({
  titulo,
  detalle,
  activo,
  esPro,
  onChange,
}: {
  titulo: string;
  detalle: string;
  activo: boolean;
  esPro: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink">{titulo}</p>
        <p className="text-[11px] text-ink-muted">{detalle}</p>
      </div>
      {esPro ? (
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={activo}
            onChange={(e) => onChange(e.target.checked)}
            aria-label={titulo}
          />
          <div className="w-9 h-5 bg-surface-sunken rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary-soft after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border after:border-line-strong after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
        </label>
      ) : (
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-state-warning-soft text-state-warning rounded shrink-0">
          PRO
        </span>
      )}
    </div>
  );
}
