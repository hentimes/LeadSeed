import React, { useEffect, useState } from 'react';
import { Icon } from '../../utils/icons';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../types';

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
      const { data } = await supabase
        .from('user_telemetry')
        .select('section, total_seconds, last_updated_at')
        .eq('user_id', selectedUser.id)
        .order('total_seconds', { ascending: false });
        
      if (!isMounted) return;
      setTelemetry(data || []);
      setLoading(false);
    };

    loadTelemetry();
    return () => { isMounted = false; };
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
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando telemetría...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Resumen Total */}
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
          <p className="text-xs text-blue-600 font-medium">Última actualización global:</p>
          <p className="text-sm text-blue-800 font-bold">
            {telemetry.length > 0 
              ? new Date(Math.max(...telemetry.map(t => new Date(t.last_updated_at).getTime()))).toLocaleString('es-CL')
              : 'Sin registros'}
          </p>
        </div>
      </div>

      {/* Detalle por Secciones */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Tiempo por Sección</h3>
        
        {telemetry.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500">Aún no hay telemetría registrada para este usuario.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sección App</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo Invertido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Visita</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">% del Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {telemetry.map(row => {
                  const percentage = totalSecondsAll > 0 ? ((row.total_seconds / totalSecondsAll) * 100).toFixed(1) : '0';
                  return (
                    <tr key={row.section} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{row.section}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-mono font-medium">{formatTime(row.total_seconds)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(row.last_updated_at).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 w-24">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{percentage}%</span>
                        </div>
                      </td>
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
