import React, { useEffect, useState } from 'react';
import { Icon } from '../../utils/icons';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../types';

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
      
      // 1. Obtener todos los perfiles para cruzar nombres
      const { data: profilesData } = await supabase.from('profiles').select('*');
      
      // 2. Obtener mensajes donde el usuario es emisor o receptor
      const { data: messagesData } = await supabase
        .from('internal_messages')
        .select('*')
        .or(`sender_id.eq.${selectedUser.id},receiver_id.eq.${selectedUser.id}`);
        
      if (!isMounted) return;

      if (messagesData && profilesData) {
        const interactionMap: Record<string, { count: number, lastMsg: string }> = {};

        messagesData.forEach(msg => {
          const otherUserId = msg.sender_id === selectedUser.id ? msg.receiver_id : msg.sender_id;
          
          if (!interactionMap[otherUserId]) {
            interactionMap[otherUserId] = { count: 0, lastMsg: msg.created_at };
          }
          
          interactionMap[otherUserId].count += 1;
          
          // Actualizar fecha del último mensaje
          if (new Date(msg.created_at) > new Date(interactionMap[otherUserId].lastMsg)) {
            interactionMap[otherUserId].lastMsg = msg.created_at;
          }
        });

        // Convertir a array, enriquecer con perfil, ordenar y tomar Top 5
        const heatmapArray: HeatmapEntry[] = Object.keys(interactionMap)
          .map(userId => {
            const profile = profilesData.find(p => p.id === userId);
            return {
              profile: profile || { id: userId, email: 'Usuario Eliminado', role: 'unknown' } as unknown as Profile,
              messageCount: interactionMap[userId].count,
              lastInteraction: interactionMap[userId].lastMsg
            };
          })
          .sort((a, b) => b.messageCount - a.messageCount)
          .slice(0, 5);

        setHeatmap(heatmapArray);
      }
      
      setLoading(false);
    };

    loadHeatmap();
    return () => { isMounted = false; };
  }, [selectedUser.id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando mapa de interacciones...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-orange-500 text-xl">{Icon.ChartPie()}</div>
          <h3 className="text-lg font-bold text-gray-900">Top 5: Conexiones Frecuentes</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Personas con las que <strong>{selectedUser.full_name || selectedUser.email}</strong> intercambia más mensajes internos. (En tiempo real)
        </p>

        {heatmap.length === 0 ? (
          <div className="bg-white rounded-lg border border-orange-100 p-8 text-center">
            <div className="text-4xl text-gray-300 flex justify-center mb-3">{Icon.Messages()}</div>
            <p className="text-sm text-gray-500">Este usuario aún no registra interacciones en el chat interno.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {heatmap.map((entry, index) => {
              // Calor: Opacidad basada en la posición
              const heatOpacities = ['bg-orange-500', 'bg-orange-400', 'bg-orange-300', 'bg-orange-200', 'bg-orange-100'];
              const heatColor = heatOpacities[index] || 'bg-gray-100';
              const textColor = index < 2 ? 'text-white' : 'text-gray-800';

              return (
                <div key={entry.profile.id} className="flex items-center bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="relative">
                      {entry.profile.avatar_url ? (
                        <img src={entry.profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200" />
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
                      <p className="text-sm font-bold text-gray-900">{entry.profile.full_name || entry.profile.email.split('@')[0]}</p>
                      <p className="text-xs text-gray-500">Última int: {new Date(entry.lastInteraction).toLocaleDateString('es-CL')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">{entry.messageCount}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mensajes</p>
                    </div>
                    {/* Barra de calor visual */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${heatColor} ${textColor} shadow-inner`}>
                      🔥
                    </div>
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
