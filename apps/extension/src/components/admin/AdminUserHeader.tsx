import { useState } from 'react';
import { getPlatform } from '../../platform/registry';
import type { Plan, Profile } from '../../types';
import { Badge, IconButton } from '../../design';
import { formatearFechaHora, formatearTiempoRelativo } from '../../utils/date';
import AdminUserAvatar from './AdminUserAvatar';
import { CountBadge } from './CountBadge';
import { rolDeUsuario } from './AdminUserRow';

const iconoMensajes = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const iconoCopiar = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

/**
 * Identidad del usuario observado: dos lineas, siempre visibles.
 *
 * La cabecera anterior gastaba 96px de alto en un avatar de 56px, el nombre,
 * el correo, **el UUID entero** y la ultima conexion con fecha y hora larga.
 * En un panel de 320px eso es casi un tercio de la pantalla dedicado a decir
 * quien es, antes de poder hacer nada con el.
 *
 * Lo que se conserva y donde:
 *
 *  - nombre, correo, rol, plan y presencia -> visibles, en dos lineas
 *  - el UUID -> boton "Copiar ID"; nadie lo lee, solo lo copia
 *  - la fecha larga de ultima conexion -> relativa, con la larga en `title`
 *
 * El boton de Mensajes vive aca y no en el acordeon: el chat es la unica vista
 * con altura propia y conversacion en curso, asi que no puede convivir con un
 * desplegable que le recorte el alto.
 */
export default function AdminUserHeader({
  profile,
  plan,
  isOnline,
  unreadMessages,
  isChatOpen,
  onToggleChat,
}: {
  profile: Profile;
  plan?: Plan;
  isOnline: boolean;
  unreadMessages: number;
  isChatOpen: boolean;
  onToggleChat: () => void;
}) {
  const [idCopiado, setIdCopiado] = useState(false);
  const rol = rolDeUsuario(profile);

  const copiarId = async () => {
    try {
      const copiado = await getPlatform().clipboard.writeText(profile.id);
      if (!copiado) return;
      setIdCopiado(true);
      window.setTimeout(() => setIdCopiado(false), 2000);
    } catch {
      // Sin portapapeles no hay nada que decirle al admin: el ID sigue
      // estando en la base. Un aviso de error aqui seria mas ruido que ayuda.
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-muted px-3 py-2">
      <AdminUserAvatar profile={profile} isOnline={isOnline} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-card-title font-semibold text-ink">
            {profile.full_name || profile.email.split('@')[0]}
          </span>
          <Badge tone={rol.tone}>{rol.label}</Badge>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-meta text-ink-muted" title={profile.email}>
            {profile.email}
          </span>
          <Badge tone={plan ? 'primary' : 'neutral'}>{plan ? plan.name : 'Sin plan'}</Badge>
          <span
            className="shrink-0 text-meta text-ink-muted"
            title={profile.last_seen_at ? `Última conexión: ${formatearFechaHora(profile.last_seen_at)}` : 'Nunca se ha conectado'}
          >
            {isOnline ? 'Ahora' : formatearTiempoRelativo(profile.last_seen_at) || 'Nunca'}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          icon={iconoCopiar}
          size="sm"
          label={idCopiado ? 'ID copiado' : 'Copiar ID del usuario'}
          onClick={copiarId}
          className={idCopiado ? 'text-state-success' : ''}
        />
        <IconButton
          icon={iconoMensajes}
          size="sm"
          variant={isChatOpen ? 'primary' : 'ghost'}
          label={isChatOpen ? 'Volver a la ficha' : 'Abrir mensajes'}
          onClick={onToggleChat}
        />
        {/* En flujo y no encima del boton: un badge superpuesto en un panel
            estrecho tapa justo el icono que explica de que es la cifra. */}
        {!isChatOpen && <CountBadge count={unreadMessages} tone="primary" label="mensajes sin leer" />}
      </div>
    </div>
  );
}
