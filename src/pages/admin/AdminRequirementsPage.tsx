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
import { getErrorMessage } from '../../utils/errorMessage';

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
    } catch (error) {
      console.error('Error fetching requirements:', error);
      alert('Error cargando requerimientos: ' + getErrorMessage(error, 'Error desconocido'));
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
    } catch (error) {
      alert('Error cerrando requerimiento: ' + getErrorMessage(error, 'Error desconocido'));
    }
  };

  const handleArchiveRequirement = async (req: Requirement) => {
    if (!confirm('¿Estás seguro de archivar este requerimiento? Ya no aparecerá en la bandeja principal.')) return;
    try {
      await archiveRequirement(req.id);
      setSelectedReq(null);
      await fetchRequirements();
    } catch (error) {
      alert('Error archivando requerimiento: ' + getErrorMessage(error, 'Error desconocido'));
    }
  };

  const handleTakeCase = async (req: Requirement) => {
    if (!currentUserId) return;
    
    try {
      await assignRequirementToHelper(req.id, currentUserId);
      setSelectedReq({ ...req, helper_id: currentUserId, status: 'in_progress', helper_profile: profile || undefined });
      await fetchRequirements();
    } catch (error) {
      alert('Error tomando el caso: ' + getErrorMessage(error, 'Error desconocido'));
    }
  };

  const assignCase = async (reqId: string, helperId: string) => {
    try {
      await assignRequirementToHelper(reqId, helperId);
      await fetchRequirements();
    } catch (error) {
      alert('Error asignando el caso: ' + getErrorMessage(error, 'Error desconocido'));
    }
  };

  if (loading && requirements.length === 0) {
    return <div className="p-8 text-center text-ink-muted">Cargando requerimientos...</div>;
  }

  // Si hay un requerimiento seleccionado, mostramos el chat y detalles
  if (selectedReq) {
    return (
      <div className="flex h-full gap-4">
        <div className="w-1/3 bg-surface rounded-xl shadow-sm border border-line p-6 flex flex-col">
          <button onClick={() => setSelectedReq(null)} className="flex items-center gap-2 text-ink-muted hover:text-blue-600 mb-6 transition-colors">
            <Icon.ArrowLeft /> Volver
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            {selectedReq.user_profile?.avatar_url ? (
              <img src={selectedReq.user_profile.avatar_url} className="w-12 h-12 rounded-full object-cover border border-line" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                {selectedReq.user_profile?.email?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink">{selectedReq.user_profile?.full_name || selectedReq.user_profile?.email}</h3>
                {selectedReq.ticket_code && (
                  <span className="text-xs font-mono font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                    {selectedReq.ticket_code}
                  </span>
                )}
              </div>
              <span className="text-xs text-ink-muted capitalize px-2 py-1 bg-surface-hover rounded-md mt-1 inline-block">
                {selectedReq.type}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-4">
            <h4 className="text-sm font-semibold text-ink-secondary mb-2">Mensaje Original</h4>
            <div className="bg-surface-muted p-4 rounded-xl text-ink-secondary text-sm whitespace-pre-wrap border border-line">
              {selectedReq.content}
            </div>
            
            <div className="mt-6 flex flex-col gap-2">
              <div className="text-xs text-ink-muted">Estado actual</div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium w-fit ${
                selectedReq.status === 'open' ? 'bg-surface-hover text-ink' : 
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
                <div className="mt-4 p-4 rounded-xl border border-line bg-surface shadow-sm flex items-center gap-3">
                  <span className={`text-2xl ${selectedReq.rating === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedReq.rating === 'up' ? <Icon.Check /> : <Icon.Close />}
                  </span>
                  <div className="text-sm text-ink-secondary">
                    El usuario calificó esta solución como {selectedReq.rating === 'up' ? 'positiva' : 'negativa'}.
                  </div>
                </div>
              )}

              {selectedReq.rating === 'up' && selectedReq.status === 'closed' && (
                <button 
                  onClick={() => handleArchiveRequirement(selectedReq)}
                  className="mt-4 w-full py-2.5 bg-surface-hover text-ink-secondary font-semibold rounded-xl hover:bg-surface-sunken transition-colors flex items-center justify-center gap-2 border border-line"
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
        <div className="flex-1 bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
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
          <h2 className="text-xl font-bold text-ink">Requerimientos de Soporte</h2>
          <p className="text-sm text-ink-muted">Gestiona y resuelve los tickets de tus usuarios</p>
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            showArchived 
              ? 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700' 
              : 'bg-surface text-ink-secondary border-line hover:bg-surface-muted'
          }`}
        >
          {showArchived ? 'Ocultar Archivados' : 'Ver Archivados'}
        </button>
      </div>

      {requirements.filter(r => showArchived ? r.status === 'archived' : r.status !== 'archived').length === 0 ? (
        <div className="text-center p-12 bg-surface rounded-2xl border border-dashed border-line-strong">
          <div className="flex justify-center text-ink-muted mb-4"><Icon.Inbox /></div>
          <h3 className="text-lg font-bold text-ink-secondary">No hay requerimientos {showArchived ? 'archivados' : ''}</h3>
          <p className="text-ink-muted text-sm">Todo está en orden por ahora.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {requirements.filter(r => showArchived ? r.status === 'archived' : r.status !== 'archived').map(req => {
            const isLockedForMe = isHelper && !isAdmin && req.helper_id && req.helper_id !== currentUserId;
            
            return (
              <div 
                key={req.id} 
                onClick={() => !isLockedForMe && setSelectedReq(req)}
                className={`group bg-surface dark:backdrop-blur-md p-2.5 rounded-xl border border-line shadow-sm transition-all relative overflow-hidden flex flex-col justify-center h-[60px] ${
                  isLockedForMe ? 'opacity-50 cursor-not-allowed bg-surface-muted' : 'hover:shadow-md hover:border-blue-300 cursor-pointer'
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
                      <img src={req.user_profile.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0 border border-line" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-ink-muted font-bold text-[11px] shrink-0 border border-line">
                        {req.user_profile?.email?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className="font-bold text-ink text-xs line-clamp-1 leading-none">{req.user_profile?.full_name || req.user_profile?.email?.split('@')[0]}</h4>
                        {req.ticket_code && (
                          <span className="text-[8px] font-mono font-bold text-ink-muted leading-none">
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
                        <span className="text-[9px] text-ink-muted font-medium leading-none">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <div className="flex items-center gap-1">
                      {req.helper_profile ? (
                        <span className="flex items-center gap-0.5 font-medium text-ink-muted text-[9px] leading-none">
                          <Icon.Users /> Resp. {req.helper_profile.full_name?.split(' ')[0] || req.helper_profile.email?.split('@')[0]}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-ink-muted bg-surface-hover px-1 py-0.5 rounded">Sin Asignar</span>
                      )}
                      {req.rating && (
                        <span className={`text-[10px] ml-1 ${req.rating === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                          {req.rating === 'up' ? <Icon.Check /> : <Icon.Close />}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <select 
                        className="text-[9px] border border-line rounded p-0.5 outline-none focus:border-indigo-400 bg-surface-muted text-ink-secondary mt-1 max-w-[100px]"
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
