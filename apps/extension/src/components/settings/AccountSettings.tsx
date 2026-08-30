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
import { Badge, Button, Input, Notice, Section, SettingGroup, SettingRow, Switch, Textarea } from '../../design';

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
  const [comoEntrasAbierto, setComoEntrasAbierto] = useState(false);

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
    <div className="flex flex-col gap-3">
      <SettingGroup label="Tus datos">
        <SettingRow
          label={profile?.full_name || user?.email || 'Tu perfil'}
          hint={subiendoAvatar ? 'Subiendo foto...' : 'Así te ven en la comunidad'}
          control={
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line bg-surface-hover">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-body font-bold text-ink-muted">
                    {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <Button size="sm" onClick={() => ficheroRef.current?.click()} disabled={subiendoAvatar}>
                Cambiar
              </Button>
              <input
                ref={ficheroRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void subirAvatar(e)}
              />
            </div>
          }
        />

        <SettingRow
          label="Empresa"
          stacked
          control={
            <Input
              type="text"
              value={company}
              onChange={(e) => setCompanyEditada(e.target.value)}
              maxLength={80}
              placeholder="Dónde trabajas"
              aria-label="Empresa"
            />
          }
        />

        <SettingRow
          label="Descripción"
          badge={
            <span
              className={`text-meta tabular-nums ${bio.length === MAX_BIO ? 'font-semibold text-state-danger' : 'text-ink-muted'}`}
            >
              {bio.length}/{MAX_BIO}
            </span>
          }
          stacked
          control={
            <Textarea
              value={bio}
              onChange={(e) => setBioEditada(e.target.value)}
              rows={2}
              maxLength={MAX_BIO}
              placeholder="Una línea sobre ti"
              aria-label="Descripción"
            />
          }
        />

        {/*
          El unico boton de guardar que sobrevive en Configuracion, y solo
          aparece cuando hay algo que guardar. Empresa y descripcion son texto
          libre: guardarlas al salir del campo dispararia una escritura por
          cada vez que el foco pasa de largo.
        */}
        {sucio && (
          <SettingRow
            label="Cambios sin guardar"
            control={
              <Button size="sm" variant="primary" onClick={() => void guardar()} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </Button>
            }
          />
        )}

        {/*
          El aviso va en un `Notice` y no como rotulo tenido de la fila: el
          rotulo de `SettingRow` fija su propio color, asi que un
          `text-state-danger` en el contenedor no llegaba a pintarlo. El unico
          aviso de error de esta pantalla salia en negro.
        */}
        {aviso && (
          <div className="px-3 py-2">
            <Notice tone={aviso.tone === 'error' ? 'danger' : 'success'} onDismiss={() => setAviso(null)}>
              {aviso.text}
            </Notice>
          </div>
        )}
      </SettingGroup>

      <SettingGroup label="En la comunidad">
        <SettingRow
          label="Marco premium"
          hint="Destaca tu perfil en la comunidad"
          badge={esPro ? undefined : <Badge tone="warning">PRO</Badge>}
          control={
            esPro ? (
              <Switch
                label="Marco premium"
                checked={profile?.show_premium_frame || false}
                onChange={(e) => void alternar('show_premium_frame', e.target.checked)}
              />
            ) : undefined
          }
        />
        <SettingRow
          label="Modo fantasma"
          hint="Oculta tu estado de conexión"
          badge={esPro ? undefined : <Badge tone="warning">PRO</Badge>}
          control={
            esPro ? (
              <Switch
                label="Modo fantasma"
                checked={profile?.is_invisible || false}
                onChange={(e) => void alternar('is_invisible', e.target.checked)}
              />
            ) : undefined
          }
        />
      </SettingGroup>

      <SettingGroup>
        <Section
          title="Cómo entras"
          badge={<Badge tone={cuenta.tienePassword ? 'neutral' : 'warning'}>{estadoPassword}</Badge>}
          isOpen={comoEntrasAbierto}
          onToggle={() => setComoEntrasAbierto((abierto) => !abierto)}
        >
          <div className="overflow-hidden rounded-md border border-line divide-y divide-line">
            <SettingRow
              label="Correo"
              control={<span className="text-micro text-ink">{user?.email}</span>}
            />
            <SettingRow
              label="Google"
              control={
                <span className="text-micro text-ink">{cuenta.usaGoogle ? 'Conectado' : 'No conectado'}</span>
              }
            />
            <SettingRow
              label="Contraseña"
              hint={
                cuenta.tienePassword === false && cuenta.usaGoogle
                  ? 'Solo entras con Google; con contraseña podrás entrar también con tu correo'
                  : undefined
              }
              control={
                <div className="flex items-center gap-2">
                  <span className="text-micro text-ink">{estadoPassword}</span>
                  <Button size="sm" onClick={() => setDialogoAbierto(true)} disabled={cuenta.step === 'cargando'}>
                    {cuenta.tienePassword ? 'Cambiar' : 'Crear'}
                  </Button>
                </div>
              }
            />
          </div>
        </Section>
      </SettingGroup>

      {dialogoAbierto && (
        <PasswordDialog cuenta={cuenta} onClose={() => setDialogoAbierto(false)} />
      )}
    </div>
  );
}
