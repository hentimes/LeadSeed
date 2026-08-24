/**
 * Tu ficha, tal y como te ven los demas.
 *
 * Solo muestra. Antes era un formulario titulado "Editar Perfil" que mezclaba
 * presentacion (avatar, biografia, marco premium) con acceso (la contrasena, que
 * acabo colgando al final), y no habia ningun sitio donde verse uno mismo como
 * lo ve el resto. Ahora la edicion vive entera en Ajustes -> Cuenta y esto es la
 * vista, que es lo que un "perfil" deberia ser.
 *
 * El enlace de abajo lleva a Cuenta por hash, que es como navega el resto de la
 * aplicacion entre secciones de ajustes (ver `navigationGroups.ts`).
 */

import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import { Modal } from '../../design';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: Props) {
  const { profile, user, hasFeature, isAdmin } = useAuth();

  if (!isOpen) return null;

  const esPro = hasFeature('premium_aesthetics') || isAdmin;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const conMarco = esPro && profile?.show_premium_frame;

  const irACuenta = () => {
    onClose();
    window.location.hash = '#cuenta';
  };

  return (
    <Modal onClose={onClose} maxWidth="360px" label="Tu perfil">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-[15px] font-bold text-ink">Tu perfil</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="-mt-1 -mr-1 p-1.5 text-ink-muted hover:text-ink-secondary rounded-lg"
          >
            <Icon.Close />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-surface-hover ${
              conMarco ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-surface' : 'border border-line'
            }`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-ink-muted">
                {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-[16px] font-bold text-ink leading-tight">
            {profile?.full_name || user?.email}
          </h3>

          {profile?.company && (
            <p className="text-[13px] text-ink-secondary mt-0.5">{profile.company}</p>
          )}

          <p className="text-[11px] text-ink-muted mt-1">{user?.email}</p>

          {profile?.bio && (
            <p className="text-[13px] text-ink-secondary leading-relaxed mt-3 max-w-[260px]">
              {profile.bio}
            </p>
          )}

          {/*
            Las insignias solo se pintan si las hay. Un hueco vacio reservado
            "por si acaso" descuadra la ficha de quien no tiene ninguna, que hoy
            son casi todos.
          */}
          {!!profile?.badges?.length && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {profile.badges.map((insignia) => (
                <span
                  key={insignia}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-soft/50 text-primary"
                >
                  {insignia}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={irACuenta}
          className="w-full mt-5 py-2 rounded-xl text-[13px] font-semibold text-primary hover:bg-primary-soft/30 focus:outline-none focus:ring-2 focus:ring-primary-soft transition-colors"
        >
          Editar en Ajustes
        </button>
      </div>
    </Modal>
  );
}
