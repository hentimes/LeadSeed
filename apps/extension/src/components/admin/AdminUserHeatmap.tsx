import { useEffect, useState } from 'react';
import type { Profile } from '../../types';
import { loadAdminUserHeatmap } from '../../services/adminService';
import { formatearTiempoRelativo } from '../../utils/date';
import AdminUserAvatar from './AdminUserAvatar';
import AdminSkeleton from './AdminSkeleton';
import { Block } from '../../design';

interface HeatmapEntry {
  profile: Profile;
  messageCount: number;
  lastInteraction: string;
}

/**
 * Con quien habla mas por el chat interno.
 *
 * Era una pestana llamada "Heatmap" -nombre que no le dice nada al admin- con
 * cinco filas dentro de una caja naranja, y el numero de mensajes pintado
 * sobre cinco tonos de naranja escritos a mano.
 *
 * La comparacion se conserva, pero como **ancho de barra**, que se lee sin
 * leyenda, y con el color de marca en vez de una paleta que no existe en el
 * resto del producto.
 */
export default function AdminUserHeatmap({ selectedUser }: { selectedUser: Profile }) {
  const observedUserId = selectedUser.id;

  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const cargar = async () => {
      setLoading(true);
      const siguiente = await loadAdminUserHeatmap(observedUserId);
      if (!isMounted) return;
      setHeatmap(siguiente as HeatmapEntry[]);
      setLoading(false);
    };

    void cargar();
    return () => {
      isMounted = false;
    };
  }, [observedUserId]);

  const maximo = heatmap.reduce((mayor, entrada) => Math.max(mayor, entrada.messageCount), 0);

  return (
    <Block title="Con quién habla" count={heatmap.length > 0 ? `top ${heatmap.length}` : undefined}>
      {loading ? (
        <AdminSkeleton rows={2} />
      ) : heatmap.length === 0 ? (
        <p className="text-micro text-ink-muted">Sin interacciones en el chat interno.</p>
      ) : (
        <ul className="space-y-1.5">
          {heatmap.map((entrada) => (
            <li key={entrada.profile.id} className="flex min-w-0 items-center gap-2">
              <AdminUserAvatar profile={entrada.profile} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-micro font-medium text-ink">
                    {entrada.profile.full_name || entrada.profile.email.split('@')[0]}
                  </span>
                  <span
                    className="shrink-0 text-micro tabular-nums text-ink-muted"
                    title={`Última interacción: ${formatearTiempoRelativo(entrada.lastInteraction)}`}
                  >
                    {entrada.messageCount}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${maximo > 0 ? Math.round((entrada.messageCount / maximo) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
