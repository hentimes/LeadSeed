import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Profile, Requirement } from '../../types';
import { Icon } from '../../utils/icons';

export default function AdminUserHelperStats({ selectedUser }: { selectedUser: Profile }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    resolved: 0,
    upVotes: 0,
    downVotes: 0,
    active: 0
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('helper_id', selectedUser.id);
        
      if (!error && data && isMounted) {
        const reqs = data as Requirement[];
        setStats({
          totalAssigned: reqs.length,
          resolved: reqs.filter(r => r.status === 'closed' || r.status === 'archived').length,
          active: reqs.filter(r => r.status === 'in_progress').length,
          upVotes: reqs.filter(r => r.rating === 'up').length,
          downVotes: reqs.filter(r => r.rating === 'down').length,
        });
      }
      setLoading(false);
    };

    fetchStats();
    
    const channel = supabase.channel(`helper_stats_${selectedUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requirements', filter: `helper_id=eq.${selectedUser.id}` }, fetchStats)
      .subscribe();
      
    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, [selectedUser]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando estadísticas del Helper...</div>;
  }

  const score = stats.resolved > 0 ? Math.round((stats.upVotes / stats.resolved) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-md">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Icon.Bot /> Rendimiento de Helper
        </h2>
        <p className="text-indigo-100 text-sm">Estadísticas de atención y soporte al cliente para {selectedUser.full_name || selectedUser.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm text-center">
          <div className="text-3xl font-black text-gray-800">{stats.totalAssigned}</div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-1">Casos Totales</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm text-center">
          <div className="text-3xl font-black text-blue-600">{stats.active}</div>
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wide mt-1">En Progreso</div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 text-sm mb-4 border-b border-gray-100 pb-2">Calidad de Atención</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <div className="text-2xl font-black text-green-500 flex justify-center items-center gap-1">
              {stats.upVotes} <Icon.Check />
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Positivos</div>
          </div>
          <div className="w-px h-12 bg-gray-100 mx-4"></div>
          <div className="text-center flex-1">
            <div className="text-2xl font-black text-red-500 flex justify-center items-center gap-1">
              {stats.downVotes} <Icon.Close />
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Reclamos</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-gray-500">Satisfacción (Resueltos)</span>
            <span className={score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500'}>{score}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
