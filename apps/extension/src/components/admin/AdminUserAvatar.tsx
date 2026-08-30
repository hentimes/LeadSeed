import type { Profile } from '../../types';

const TAMANOS = {
  sm: 'h-8 w-8 text-micro',
  md: 'h-10 w-10 text-body',
};

/**
 * Avatar de un usuario, con su punto de presencia.
 *
 * Estaba escrito seis veces -lista de usuarios, cabecera del detalle, heatmap,
 * bandeja de tickets, detalle de ticket- con cuatro tamanos, dos colores de
 * inicial y el punto verde solo en uno de los seis.
 *
 * El avatar del detalle media 56px: en un panel de 320px eso es el 17% del
 * ancho gastado en decoracion. Aqui el mayor son 40.
 */
export default function AdminUserAvatar({
  profile,
  size = 'sm',
  isOnline,
}: {
  profile: Pick<Profile, 'email' | 'avatar_url' | 'full_name'>;
  size?: keyof typeof TAMANOS;
  /** Sin valor no se pinta el punto: no es lo mismo "desconectado" que "no se sabe". */
  isOnline?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className={`${TAMANOS[size]} rounded-full border border-line object-cover`}
        />
      ) : (
        <div
          className={`${TAMANOS[size]} flex items-center justify-center rounded-full bg-primary-soft font-bold uppercase text-primary`}
        >
          {(profile.full_name || profile.email || '?').charAt(0)}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          title={isOnline ? 'Conectado' : 'Desconectado'}
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface ${
            isOnline ? 'bg-state-success' : 'bg-line-strong'
          }`}
        />
      )}
    </div>
  );
}
