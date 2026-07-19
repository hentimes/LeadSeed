import React, { useEffect, useState } from 'react';
import { Icon } from '../../utils/icons';
import type { Profile } from '../../types';
import { loadAdminUserHeatmap } from '../../services/adminService';

interface Props {
  selectedUser: Profile;
}

interface HeatmapEntry {
  profile: Profile;
  messageCount: number;
  lastInteraction: string;
}

export default function AdminUserHeatmap({ selectedUser }: Props) {
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHeatmap = async () => {
      setLoading(true);
      const nextHeatmap = await loadAdminUserHeatmap(selectedUser);
      if (!isMounted) return;
      setHeatmap(nextHeatmap as HeatmapEntry[]);
      setLoading(false);
    };

    void loadHeatmap();
    return () => {
      isMounted = false;
    };
  }, [selectedUser.id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500 animate-pulse">Cargando mapa de interacciones...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-orange-500 text-xl">{Icon.ChartPie()}</div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Top 5: Conexiones Frecuentes</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Personas con las que <strong>{selectedUser.full_name || selectedUser.email}</strong> intercambia mas mensajes internos.
        </p>

        {heatmap.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-lg border border-orange-100 p-8 text-center">
            <div className="text-4xl text-gray-300 flex justify-center mb-3">{Icon.Messages()}</div>
            <p className="text-sm text-slate-400 dark:text-slate-500">Este usuario aun no registra interacciones en el chat interno.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {heatmap.map((entry, index) => {
              const heatOpacities = ['bg-orange-500', 'bg-orange-400', 'bg-orange-300', 'bg-orange-200', 'bg-orange-100'];
              const heatColor = heatOpacities[index] || 'bg-gray-100';
              const textColor = index < 2 ? 'text-white' : 'text-slate-700 dark:text-slate-200';

              return (
                <div key={entry.profile.id} className="flex items-center bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="relative">
                      {entry.profile.avatar_url ? (
                        <img src={entry.profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700/50" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {entry.profile.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                        #{index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{entry.profile.full_name || entry.profile.email.split('@')[0]}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Ultima int: {new Date(entry.lastInteraction).toLocaleDateString('es-CL')}</p>
                    </div>
                  </div>

                  <div className={`w-24 text-center px-3 py-2 rounded-lg font-black text-sm ${heatColor} ${textColor}`}>
                    {entry.messageCount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
