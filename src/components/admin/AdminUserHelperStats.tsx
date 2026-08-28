import { useEffect, useState } from 'react';
import type { Profile, Requirement } from '../../types';
import { loadAdminHelperStats } from '../../services/adminService';
import AdminSkeleton from './AdminSkeleton';
import { Block } from '../../design';

const VACIO = { totalAssigned: 0, resolved: 0, upVotes: 0, downVotes: 0, active: 0 };

/**
 * Como atiende un helper.
 *
 * Era una pestana con una cabecera en degradado indigo-morado que no aparece
 * en ningun otro sitio del producto, dos tarjetas de cifras enormes y una
 * barra de satisfaccion. En un panel estrecho, el degradado se comia 80px de
 * alto para repetir el nombre del usuario que la cabecera ya dice.
 *
 * Solo se pinta si el usuario es helper o admin, igual que antes.
 */
export default function AdminUserHelperStats({ selectedUser }: { selectedUser: Profile }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(VACIO);

  useEffect(() => {
    let isMounted = true;

    const cargar = async () => {
      setLoading(true);
      const data = await loadAdminHelperStats(selectedUser.id);
      if (!isMounted) return;

      const reqs = (data ?? []) as Requirement[];
      setStats({
        totalAssigned: reqs.length,
        resolved: reqs.filter((req) => req.status === 'closed' || req.status === 'archived').length,
        active: reqs.filter((req) => req.status === 'in_progress').length,
        upVotes: reqs.filter((req) => req.rating === 'up').length,
        downVotes: reqs.filter((req) => req.rating === 'down').length,
      });
      setLoading(false);
    };

    void cargar();
    return () => {
      isMounted = false;
    };
  }, [selectedUser.id]);

  const satisfaccion = stats.resolved > 0 ? Math.round((stats.upVotes / stats.resolved) * 100) : 0;
  const tonoBarra =
    satisfaccion >= 80 ? 'bg-state-success' : satisfaccion >= 50 ? 'bg-state-warning' : 'bg-state-danger';

  return (
    <Block title="Desempeño como helper" count={loading ? undefined : `${stats.totalAssigned} casos`}>
      {loading ? (
        <AdminSkeleton rows={2} />
      ) : (
        <div className="space-y-2">
          <dl className="grid grid-cols-3 gap-2">
            {[
              { rotulo: 'En curso', valor: stats.active },
              { rotulo: 'Positivos', valor: stats.upVotes },
              { rotulo: 'Reclamos', valor: stats.downVotes },
            ].map(({ rotulo, valor }) => (
              <div key={rotulo} className="rounded-md border border-line px-2 py-1.5 text-center">
                <dd className="text-card-title font-semibold tabular-nums text-ink">{valor}</dd>
                <dt className="mt-0.5 truncate text-micro text-ink-muted">{rotulo}</dt>
              </div>
            ))}
          </dl>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-micro text-ink-secondary">Satisfacción sobre resueltos</span>
              <span className="text-micro font-semibold tabular-nums text-ink">{satisfaccion}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div className={`h-full rounded-full ${tonoBarra}`} style={{ width: `${satisfaccion}%` }} />
            </div>
          </div>
        </div>
      )}
    </Block>
  );
}
