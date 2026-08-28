import type { Plan, Profile } from '../../types';
import { Badge, Checkbox, ListRow } from '../../design';
import AdminUserAvatar from './AdminUserAvatar';
import { CountBadge } from './CountBadge';

export function rolDeUsuario(profile: Profile): { label: string; tone: 'primary' | 'info' | 'neutral' } {
  if (profile.role === 'admin') return { label: 'Admin', tone: 'primary' };
  if (profile.is_helper) return { label: 'Helper', tone: 'info' };
  return { label: 'Vendedor', tone: 'neutral' };
}

/**
 * Una fila de la lista de usuarios, calibrada para los 240px que mide la
 * columna maestra.
 *
 * Antes la fila apilaba nombre, correo, plan y rol en dos columnas propias con
 * `text-[13px]`, `text-[11px]`, `text-[10px]` y `text-[9px]`: cuatro tamanos
 * escritos a mano, ninguno de la escala del producto, dentro de un ancho que
 * podia ser de 105px si el panel estaba estrecho.
 *
 * Aqui el plan y el rol comparten la segunda linea con el correo y se recortan
 * antes que el nombre, que es el unico dato con el que se busca a alguien.
 */
export default function AdminUserRow({
  profile,
  plan,
  isSelected,
  isOnline,
  isChecked,
  onToggleCheck,
  unreadMessages,
  newLeads,
  onSelect,
}: {
  profile: Profile;
  plan?: Plan;
  isSelected: boolean;
  isOnline: boolean;
  /** Sin `onToggleCheck` no se pinta la casilla: el helper no selecciona en masa. */
  isChecked?: boolean;
  onToggleCheck?: () => void;
  unreadMessages: number;
  newLeads: number;
  onSelect: () => void;
}) {
  const rol = rolDeUsuario(profile);

  return (
    <ListRow density="compact" isSelected={isSelected} onClick={onSelect} className="cursor-pointer">
      {onToggleCheck && (
        <span onClick={(event) => event.stopPropagation()} className="shrink-0">
          <Checkbox
            label={null}
            checked={!!isChecked}
            onChange={onToggleCheck}
            aria-label={`Seleccionar ${profile.full_name || profile.email}`}
          />
        </span>
      )}

      <AdminUserAvatar profile={profile} isOnline={isOnline} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate text-body font-semibold text-ink">
            {profile.full_name || profile.email.split('@')[0]}
          </span>
          <CountBadge count={unreadMessages} tone="primary" label="mensajes sin leer" />
          <CountBadge count={newLeads} tone="info" label="leads nuevos" />
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-meta text-ink-muted" title={profile.email}>
            {profile.email}
          </span>
          <Badge tone={plan ? 'primary' : 'neutral'}>{plan ? plan.name : 'Sin plan'}</Badge>
          <Badge tone={rol.tone}>{rol.label}</Badge>
        </div>
      </div>
    </ListRow>
  );
}
