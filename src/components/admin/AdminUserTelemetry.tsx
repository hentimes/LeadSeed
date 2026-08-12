import { useEffect, useState } from 'react';
import { Icon } from '../../utils/icons';
import type { Profile } from '../../types';
import { loadAdminUserTelemetry } from '../../services/adminService';

interface Props {
  selectedUser: Profile;
}

interface TelemetryRow {
  section: string;
  total_seconds: number;
  last_updated_at: string;
}

export default function AdminUserTelemetry({ selectedUser }: Props) {
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTelemetry = async () => {
      setLoading(true);
      const data = await loadAdminUserTelemetry(selectedUser.id);

      if (!isMounted) return;
      setTelemetry(data);
      setLoading(false);
    };

    void loadTelemetry();
    return () => {
      isMounted = false;
    };
  }, [selectedUser.id]);

  const totalSecondsAll = telemetry.reduce((acc, curr) => acc + curr.total_seconds, 0);
  const totalHours = Math.floor(totalSecondsAll / 3600);
  const totalMinutes = Math.floor((totalSecondsAll % 3600) / 60);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500 animate-pulse">Cargando telemetria...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full text-blue-600">
            <div className="w-8 h-8 flex justify-center items-center text-2xl">{Icon.Dashboard()}</div>
          </div>
          <div>
            <h3 className="text-xl font-black text-blue-900">{totalHours}h {totalMinutes}m</h3>
            <p className="text-sm font-bold text-blue-700">Tiempo total activo (Historico)</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-600 font-medium">Ultima actualizacion global:</p>
          <p className="text-sm text-blue-800 font-bold">
            {telemetry.length > 0
              ? new Date(Math.max(...telemetry.map((row) => new Date(row.last_updated_at).getTime()))).toLocaleString('es-CL')
              : 'Sin registros'}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 uppercase tracking-wider">Tiempo por Seccion</h3>

        {telemetry.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg p-6 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">Aun no hay telemetria registrada para este usuario.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Seccion App</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Tiempo Invertido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Ultima Visita</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">% del Total</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md divide-y divide-gray-200">
                {telemetry.map((row) => {
                  const percentage = totalSecondsAll > 0 ? Math.round((row.total_seconds / totalSecondsAll) * 100) : 0;
                  return (
                    <tr key={row.section} className="hover:bg-slate-50 dark:bg-slate-900">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{row.section}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">{formatTime(row.total_seconds)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">{new Date(row.last_updated_at).toLocaleString('es-CL')}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-blue-600">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
