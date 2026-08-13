import { useState, useEffect } from 'react';
import { Requirement, Profile } from '../../types';
import { Icon } from '../../utils/icons';
import AdminSupportChat from '../../components/admin/AdminSupportChat';
import { useAuth } from '../../contexts/AuthContext';
import {
  archiveRequirement,
  assignRequirementToHelper,
  closeRequirement,
  loadHelperProfiles,
  loadRequirementsWithProfiles,
  subscribeRequirementsFeed,
} from '../../services/adminService';

export default function AdminRequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [helpers, setHelpers] = useState<Profile[]>([]);
  const { session, profile, isAdmin } = useAuth();
  
  const isHelper = profile?.is_helper === true;
  const currentUserId = session?.user?.id;

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      setRequirements(await loadRequirementsWithProfiles());
    } catch (error: any) {
      console.error('Error fetching requirements:', error);
      alert('Error cargando requerimientos: ' + (error?.message || 'Error desconocido'));
    }
    setLoading(false);
  };

  const fetchHelpers = async () => {
    setHelpers(await loadHelperProfiles() as Profile[]);
  };

  useEffect(() => {
    void fetchRequirements();
    if (isAdmin) void fetchHelpers();
    return subscribeRequirementsFeed(fetchRequirements);
  }, [isAdmin]);

  const handleCloseRequirement = async (req: Requirement) => {
    if (!confirm('¿Estás seguro de cerrar este requerimiento?')) return;
    try {
      await closeRequirement(req.id);
      setSelectedReq(null);
      await fetchRequirements();
    } catch (error: any) {
      alert('Error cerrando requerimiento: ' + (error?.message || 'Error desconocido'));
    }
  };

  const handleArchiveRequirement = async (req: Requirement) => {
    if (!confirm('¿Estás seguro de archivar este requerimiento? Ya no aparecerá en la bandeja principal.')) return;
    try {
      await archiveRequirement(req.id);
      setSelectedReq(null);
      await fetchRequirements();
    } catch (error: any) {
      alert('Error archivando requerimiento: ' + (error?.message || 'Error desconocido'));
    }
  };

  const handleTakeCase = async (req: Requirement) => {
    if (!currentUserId) return;
    
    try {
      await assignRequirementToHelper(req.id, currentUserId);
      setSelectedReq({ ...req, helper_id: currentUserId, status: 'in_progress', helper_profile: profile || undefined });
      await fetchRequirements();
    } catch (error: any) {
      alert('Error tomando el caso: ' + (error?.message || 'Error desconocido'));
    }
  };

  const assignCase = async (reqId: string, helperId: string) => {
    try {
      await assignRequirementToHelper(reqId, helperId);
      await fetchRequirements();
    } catch (error: any) {
      alert('Error asignando el caso: ' + (error?.message || 'Error desconocido'));
    }
  };

  if (loading && requirements.length === 0) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500">Cargando requerimientos...</div>;
  }

  // Si hay un requerimiento seleccionado, mostramos el chat y detalles
  if (selectedReq) {
    return (
      <div className="flex h-full gap-4">
        <div className="w-1/3 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col">
          <button onClick={() => setSelectedReq(null)} className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 mb-6 transition-colors">
            <Icon.ArrowLeft /> Volver
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            {selectedReq.user_profile?.avatar_url ? (
              <img src={selectedReq.user_profile.avatar_url} className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700/50" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                {selectedReq.user_profile?.email?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{selectedReq.user_profile?.full_name || selectedReq.user_profile?.email}</h3>
                {selectedReq.ticket_code && (
                  <span className="text-xs font-mono font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                    {selectedReq.ticket_code}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 capitalize px-2 py-1 bg-gray-100 rounded-md mt-1 inline-block">
                {selectedReq.type}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-4">
            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Mensaje Original</h4>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-500 dark:text-slate-400 text-sm whitespace-pre-wrap border border-gray-100">
              {selectedReq.content}
            </div>
            
            <div className="mt-6 flex flex-col gap-2">
              <div className="text-xs text-gray-400">Estado actual</div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium w-fit ${
                selectedReq.status === 'open' ? 'bg-gray-100 text-slate-700 dark:text-slate-200' : 
                selectedReq.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                selectedReq.status === 'claim' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {selectedReq.status === 'open' ? 'Pendiente' : 
                 selectedReq.status === 'in_progress' ? 'En Revisión' : 
                 selectedReq.status === 'claim' ? 'RECLAMO' : 'Cerrado'}
              </div>

              {selectedReq.status === 'claim' && selectedReq.claim_reason && (
                <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50 shadow-sm">
                  <h4 className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1"><Icon.Close /> Motivo del Reclamo</h4>
                  <p className="text-sm text-red-900 whitespace-pre-wrap">{selectedReq.claim_reason}</p>
                </div>
              )}
              
              {selectedReq.rating && (
                <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md shadow-sm flex items-center gap-3">
                  <span className={`text-2xl ${selectedReq.rating === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedReq.rating === 'up' ? <Icon.Check /> : <Icon.Close />}
                  </span>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    El usuario calificó esta solución como {selectedReq.rating === 'up' ? 'positiva' : 'negativa'}.
                  </div>
                </div>
              )}

              {selectedReq.rating === 'up' && selectedReq.status === 'closed' && (
                <button 
                  onClick={() => handleArchiveRequirement(selectedReq)}
                  className="mt-4 w-full py-2.5 bg-gray-100 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700/50"
                >
                  <Icon.Inbox />
                  Archivar Ticket
                </button>
              )}
            </div>
          </div>

          {(selectedReq.status === 'open' || selectedReq.status === 'in_progress' || selectedReq.status === 'claim') && (
            <div className="flex flex-col gap-2">
              {!selectedReq.helper_id && selectedReq.status === 'open' && (
                <button 
                  onClick={() => handleTakeCase(selectedReq)}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Icon.Check /> Tomar este caso
                </button>
              )}
              
              <button 
                onClick={() => handleCloseRequirement(selectedReq)}
                className="w-full py-3 bg-green-50 text-green-700 font-semibold rounded-xl hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
              >
                <Icon.CheckCircle /> Marcar como Completado
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
          {/* Injectamos el chat completo aquí */}
          {selectedReq.user_profile && (
            <AdminSupportChat selectedUser={selectedReq.user_profile} activeRequirement={selectedReq} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Requerimientos de Soporte</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Gestiona y resuelve los tickets de tus usuarios</p>
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            showArchived 
              ? 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700' 
              : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-md text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:bg-slate-900'
          }`}
        >
          {showArchived ? 'Ocultar Archivados' : 'Ver Archivados'}
        </button>
      </div>

      {requirements.filter(r => showArchived ? r.status === 'archived' : r.status !== 'archived').length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-600/50">
          <div className="flex justify-center text-gray-400 mb-4"><Icon.Inbox /></div>
          <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">No hay requerimientos {showArchived ? 'archivados' : ''}</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm">Todo está en orden por ahora.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {requirements.filter(r => showArchived ? r.status === 'archived' : r.status !== 'archived').map(req => {
            const isLockedForMe = isHelper && !isAdmin && req.helper_id && req.helper_id !== currentUserId;
            
            return (
              <div 
                key={req.id} 
                onClick={() => !isLockedForMe && setSelectedReq(req)}
                className={`group bg-white dark:bg-slate-800/80 dark:backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm transition-all relative overflow-hidden flex flex-col justify-center h-[60px] ${
                  isLockedForMe ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : 'hover:shadow-md hover:border-blue-300 cursor-pointer'
                }`}
              >
                {req.status === 'open' && !isLockedForMe && (
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-purple-500" />
                )}
                {req.status === 'claim' && (
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" />
                )}
                
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {req.user_profile?.avatar_url ? (
                      <img src={req.user_profile.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-[11px] shrink-0 border border-slate-200 dark:border-slate-700/50">
                        {req.user_profile?.email?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1 leading-none">{req.user_profile?.full_name || req.user_profile?.email?.split('@')[0]}</h4>
                        {req.ticket_code && (
                          <span className="text-[8px] font-mono font-bold text-gray-400 leading-none">
                            #{req.ticket_code}
                          </span>
                        )}
                        {req.bump_count && req.bump_count > 0 && (
                          <span className="text-[8px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded leading-none flex items-center gap-0.5 border border-red-100" title="Reenviado sin respuesta">
                             x{req.bump_count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded leading-none ${
                          req.type === 'facturacion' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          req.type === 'bug' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                          req.type === 'sugerencia' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}>
                          {req.type}
                        </span>
                        <span className="text-[9px] text-gray-400 font-medium leading-none">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <div className="flex items-center gap-1">
                      {req.helper_profile ? (
                        <span className="flex items-center gap-0.5 font-medium text-gray-400 text-[9px] leading-none">
                          <Icon.Users /> Resp. {req.helper_profile.full_name?.split(' ')[0] || req.helper_profile.email?.split('@')[0]}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 py-0.5 rounded">Sin Asignar</span>
                      )}
                      {req.rating && (
                        <span className={`text-[10px] ml-1 ${req.rating === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                          {req.rating === 'up' ? <Icon.Check /> : <Icon.Close />}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <select 
                        className="text-[9px] border border-slate-200 dark:border-slate-700/50 rounded p-0.5 outline-none focus:border-indigo-400 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 mt-1 max-w-[100px]"
                        onChange={(e) => { 
                          e.stopPropagation(); 
                          if(e.target.value) assignCase(req.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        value={req.helper_id || ""}
                      >
                        <option value="" disabled>Asignar a...</option>
                        {helpers.map(h => (
                          <option key={h.id} value={h.id}>{h.full_name?.split(' ')[0] || h.email?.split('@')[0]}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
