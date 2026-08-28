import { useEffect, useState } from 'react';
import type { Profile } from '../../types';
import { loadAdminUserTelemetry } from '../../services/adminService';
import { formatearTiempoRelativo } from '../../utils/date';
import AdminSkeleton from './AdminSkeleton';
import { Block } from '../../design';

interface TelemetryRow {
  section: string;
  total_seconds: number;
  last_updated_at: string;
}

function formatearDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Cuanto tiempo pasa el usuario en cada seccion de la app.
 *
 * Era una pestana propia con una tabla de cuatro columnas -seccion, tiempo,
 * ultima visita, porcentaje- dentro de un panel que puede medir 312px. La
 * tabla no cabia y las dos columnas de la derecha se recortaban sin avisar,
 * porque los scrollbars estan ocultos en toda la extension.
 *
 * Ahora es una lista de barras: el porcentaje se ve en el ancho de la barra en
 * vez de en una columna, que es para lo que servia el numero.
 */
export default function AdminUserTelemetry({ selectedUser }: { selectedUser: Profile }) {
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const cargar = async () => {
      setLoading(true);
      const data = await loadAdminUserTelemetry(selectedUser.id);
      if (!isMounted) return;
      setTelemetry(data);
      setLoading(false);
    };

    void cargar();
    return () => {
      isMounted = false;
    };
  }, [selectedUser.id]);

  const totalSegundos = telemetry.reduce((total, fila) => total + fila.total_seconds, 0);

  return (
    <Block title="Tiempo por sección" count={totalSegundos > 0 ? formatearDuracion(totalSegundos) : undefined}>
      {loading ? (
        <AdminSkeleton />
      ) : telemetry.length === 0 ? (
        <p className="text-micro text-ink-muted">Todavía no hay telemetría registrada.</p>
      ) : (
        <ul className="space-y-1.5">
          {telemetry.map((fila) => {
            const porcentaje = totalSegundos > 0 ? Math.round((fila.total_seconds / totalSegundos) * 100) : 0;
            return (
              <li key={fila.section} className="min-w-0">
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-micro font-medium capitalize text-ink">{fila.section}</span>
                  <span
                    className="shrink-0 text-micro tabular-nums text-ink-muted"
                    title={`Última visita: ${formatearTiempoRelativo(fila.last_updated_at)}`}
                  >
                    {formatearDuracion(fila.total_seconds)} · {porcentaje}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Block>
  );
}
