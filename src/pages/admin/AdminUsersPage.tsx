import { useEffect, useRef, useState } from 'react';
import { useSaaS } from '../../hooks/useSaaS';
import type { Profile, Plan, PlanFeature, UserFeatureOverride, Feature, Lead } from '../../types';
import { Icon } from '../../utils/icons';
import { usePresence } from '../../hooks/usePresence';
import { bulkSetUsersAsHelper, loadAdminLeadAlerts, loadUnreadCountsForAdmin, markAdminUserBaseSeen, subscribeAdminUsersRealtime } from '../../services/adminService';
import type { AdminLeadEventRow } from '../../repositories/adminRepository';

import AdminUserLicenses from '../../components/admin/AdminUserLicenses';
import AdminUserTelemetry from '../../components/admin/AdminUserTelemetry';
import AdminUserInventory from '../../components/admin/AdminUserInventory';
import AdminUserBase from '../../components/admin/AdminUserBase';
import AdminUserAgenda from '../../components/admin/AdminUserAgenda';
import AdminUserHeatmap from '../../components/admin/AdminUserHeatmap';
import AdminSupportChat from '../../components/admin/AdminSupportChat';
import AdminUserHelperStats from '../../components/admin/AdminUserHelperStats';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAuth } from '../../contexts/AuthContext';

type AdminTab = 'licencias' | 'telemetria' | 'inventario' | 'base' | 'agenda' | 'heatmap' | 'soporte' | 'helper';

export default function AdminUsersPage() {
  const { getProfiles, getPlans, getFeatures, getPlanFeatures, getUserOverrides, assignFeatureToUser, removeFeatureFromUser, updateProfile } = useSaaS();
  const { onlineUsers } = usePresence();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedPlanFeatures, setSelectedPlanFeatures] = useState<PlanFeature[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserFeatureOverride[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { session, profile: isAdmin } = useAuth();
  
  const [activeTab, setActiveTab] = useState<AdminTab>(isAdmin ? 'licencias' : 'soporte');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [leadAlertCounts, setLeadAlertCounts] = useState<Record<string, number>>({});
  const [liveObservedLead, setLiveObservedLead] = useState<Lead | null>(null);
  const [adminBaseRefreshKey, setAdminBaseRefreshKey] = useState(0);
  const activeTabRef = useRef<AdminTab>(activeTab);
  const selectedUserIdRef = useRef<string | null>(selectedUser?.id ?? null);

  const loadUnreadCounts = async () => {
    if (!session) return;
    setUnreadCounts(await loadUnreadCountsForAdmin(session.user.id));
  };

  const loadLeadAlerts = async () => {
    if (!isAdmin) return;
    setLeadAlertCounts(await loadAdminLeadAlerts());
  };

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    selectedUserIdRef.current = selectedUser?.id ?? null;
  }, [selectedUser]);

  const loadData = async () => {
    setLoading(true);
    const [p, pl, f] = await Promise.all([getProfiles(), getPlans(), getFeatures()]);
    setProfiles(p);
    setPlans(pl);
    setFeatures(f);
    setLoading(false);
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
    void loadUnreadCounts();
    void loadLeadAlerts();

    return subscribeAdminUsersRealtime(
      session.user.id,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setProfiles((prev) => [payload.new as Profile, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setProfiles((prev) => prev.map((profile) => (profile.id === payload.new.id ? { ...profile, ...payload.new } : profile)));
        }
      },
      () => {
        void loadUnreadCounts();
      },
      (payload) => {
        const leadEvent = payload.new as AdminLeadEventRow;
        const observedUserId = leadEvent.observed_user_id;
        const isObservedBaseOpen = activeTabRef.current === 'base' && selectedUserIdRef.current === observedUserId;

        if (!observedUserId) {
          void loadLeadAlerts();
          return;
        }

        setLeadAlertCounts((current) => {
          if (isObservedBaseOpen) {
            return { ...current, [observedUserId]: 0 };
          }
          return { ...current, [observedUserId]: (current[observedUserId] || 0) + 1 };
        });

        if (isObservedBaseOpen) {
          setLiveObservedLead({
            id: leadEvent.lead_id,
            name: 'Nuevo lead',
            phone: '',
            email: '',
            company: '',
            rut: '',
            status: 'nuevo',
            score: 0,
            listaIds: [],
            notes: '',
            metadata: {},
            crossExecAlerts: [],
            hasUnreadCrossExecAlert: false,
            createdAt: leadEvent.created_at,
            updatedAt: leadEvent.created_at,
          });
          setAdminBaseRefreshKey((current) => current + 1);
          void markAdminUserBaseSeen(observedUserId).catch(() => undefined);
          return;
        }

        void loadLeadAlerts();
      }
    );
  }, [isAdmin, session]);

  useEffect(() => {
    if (activeTab === 'soporte' && selectedUser) {
      // Limpiar cuenta localmente para que el badge rojo desaparezca inmediatamente al estar en el chat
      setUnreadCounts(prev => ({ ...prev, [selectedUser.id]: 0 }));
    }
  }, [activeTab, selectedUser]); // Se quita messages porque no existe en este componente

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    setActiveTab(isAdmin ? 'base' : 'soporte');
    const [overrides, planFeatures] = await Promise.all([
      getUserOverrides(user.id),
      user.plan_id ? getPlanFeatures(user.plan_id) : Promise.resolve([]),
    ]);
    setUserOverrides(overrides);
    setSelectedPlanFeatures(planFeatures);
  };

  useEffect(() => {
    if (!isAdmin || activeTab !== 'base' || !selectedUser) return;
    let cancelled = false;
    const observedUserId = selectedUser.id;

    async function syncSeenState(): Promise<void> {
      try {
        await markAdminUserBaseSeen(observedUserId);
        if (!cancelled) {
          setLeadAlertCounts((current) => ({ ...current, [observedUserId]: 0 }));
        }
      } catch (_error) {
        // noop: si falla la marca de visto no se bloquea la vista
      }
    }

    void syncSeenState();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAdmin, selectedUser]);

  useEffect(() => {
    setLiveObservedLead(null);
  }, [selectedUser?.id, activeTab]);

  const handleToggleUserSelection = (e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>, userId: string) => {
    e.stopPropagation();
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedUserIds.length === profiles.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(profiles.map(p => p.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUserIds.length === 0) return;
    
    if (action === 'helper' || action === 'remove_helper') {
      const isHelper = action === 'helper';
      try {
        await bulkSetUsersAsHelper(selectedUserIds, isHelper);
        setProfiles(profiles.map(p => selectedUserIds.includes(p.id) ? { ...p, is_helper: isHelper } : p));
        alert(`Rol de helper actualizado para ${selectedUserIds.length} usuarios.`);
      } catch (error: any) {
        alert('Error: ' + (error?.message || 'Error desconocido'));
      }
    } else {
      alert(`Acción "${action}" seleccionada para ${selectedUserIds.length} usuarios. (Implementación futura)`);
    }
    
    // setSelectedUserIds([]); // Opcional, limpiar selección
  };

  const handleUpdatePlan = async (planId: string) => {
    if (!selectedUser) return;
    await updateProfile(selectedUser.id, { plan_id: planId });
    setProfiles(profiles.map(p => p.id === selectedUser.id ? { ...p, plan_id: planId } : p));
    setSelectedUser({ ...selectedUser, plan_id: planId });
    const planFeatures = planId ? await getPlanFeatures(planId) : [];
    setSelectedPlanFeatures(planFeatures);
  };

  const handleAssignFeature = async (featureId: string, days?: number) => {
    if (!selectedUser) return;
    let expiresAt = null;
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }
    await assignFeatureToUser(selectedUser.id, featureId, expiresAt);
    const overrides = await getUserOverrides(selectedUser.id);
    setUserOverrides(overrides);
  };

  const handleRemoveFeature = async (featureId: string) => {
    if (!selectedUser) return;
    await removeFeatureFromUser(selectedUser.id, featureId);
    setUserOverrides(userOverrides.filter(o => o.feature_id !== featureId));
  };

  if (loading) return <LoadingOverlay message="Cargando usuarios..." />;

  return (
    <div className="flex gap-6 h-full">
      {/* Lista de Usuarios */}
      <div className="w-1/3 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <input 
                  type="checkbox" 
                  checked={profiles.length > 0 && selectedUserIds.length === profiles.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600/50 cursor-pointer"
                />
              )}
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Usuarios ({profiles.length})</h3>
            </div>
            
            {isAdmin && selectedUserIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {selectedUserIds.length} sel.
                </span>
                <div className="relative group">
                  <button className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-gray-700 transition-colors shadow-sm">
                    Acciones <Icon.ChevronDown />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                    <button onClick={() => handleBulkAction('helper')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 flex items-center gap-2"><Icon.CheckCircle /> Hacer Helper</button>
                    <button onClick={() => handleBulkAction('remove_helper')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 flex items-center gap-2 text-red-600"><Icon.Close /> Quitar Helper</button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={() => handleBulkAction('ban')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 flex items-center gap-2 text-gray-400"><Icon.Warning /> Banear Usuarios</button>
                    <button onClick={() => handleBulkAction('promo')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 flex items-center gap-2 text-gray-400"><Icon.Plus /> Añadir Promoción</button>
                    <button onClick={() => handleBulkAction('banner')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 flex items-center gap-2 text-gray-400"><Icon.View /> Activar Banners</button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={() => handleBulkAction('group')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:bg-slate-900 flex items-center gap-2 text-gray-400"><Icon.Users /> Crear Grupo/Lista</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {profiles.length === 0 ? (
            <p className="p-4 text-sm text-slate-400 dark:text-slate-500 text-center">No hay usuarios registrados.</p>
          ) : (
            profiles.map(p => {
              const plan = plans.find(pl => pl.id === p.plan_id);
              const isOnline = !!onlineUsers[p.id];

              return (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectUser(p)}
                  className={`p-2.5 border-b border-gray-100 cursor-pointer hover:bg-slate-50 dark:bg-slate-900 transition-colors flex items-center gap-3 ${selectedUser?.id === p.id ? 'bg-blue-50/50' : ''}`}
                >
                  {isAdmin && (
                    <input 
                      type="checkbox"
                      checked={selectedUserIds.includes(p.id)}
                      onChange={(e) => { e.stopPropagation(); handleToggleUserSelection(e, p.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600/50 cursor-pointer"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0 flex justify-between items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700/50" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {p.email.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Punto de estado online/offline */}
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                      </div>
                      <div className="flex flex-col justify-center min-w-0 pr-2">
                        <div className="flex items-center">
                          <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{p.full_name || p.email.split('@')[0]}</p>
                          {(leadAlertCounts[p.id] ?? 0) > 0 && (
                            <span className="bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow-sm ml-1 shrink-0">
                              {leadAlertCounts[p.id]}
                            </span>
                          )}
                          {(unreadCounts[p.id] ?? 0) > 0 && (
                            <span className="bg-purple-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow-sm animate-pulse ml-1 shrink-0">
                              {unreadCounts[p.id]}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5" title={p.email}>{p.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${plan ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-slate-400 dark:text-slate-500'}`}>
                        {plan ? plan.name : 'Sin Plan'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium capitalize">
                        {p.role === 'admin' ? 'Admin' : p.is_helper ? 'Helper' : (p.role === 'user' ? 'Vendedor' : p.role)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Panel de Gestión del Usuario */}
      {selectedUser ? (
        <div className="flex-1 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 flex justify-between items-start">
            <div className="flex items-center gap-4">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="Avatar" className="w-14 h-14 rounded-full shadow-sm" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                  {selectedUser.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{selectedUser.full_name || selectedUser.email}</h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-mono">{selectedUser.email} | {selectedUser.id}</p>
                {onlineUsers[selectedUser.id] ? (
                  <p className="text-xs text-green-600 font-bold mt-1">Conectado ahora mismo</p>
                ) : selectedUser.last_seen_at ? (
                  <p className="text-xs text-gray-400 mt-1">Última conexión: {new Date(selectedUser.last_seen_at).toLocaleString('es-CL')}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Nunca se ha conectado</p>
                )}
              </div>
            </div>
          </div>
          
          {/* TABS NAVIGATION */}
          <div className="flex gap-2 p-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50">
            {isAdmin && (
              <>
                <button onClick={() => setActiveTab('licencias')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'licencias' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>Licencias</button>
                <button onClick={() => setActiveTab('telemetria')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'telemetria' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>Actividad</button>
                <button onClick={() => setActiveTab('heatmap')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'heatmap' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>Heatmap</button>
                <button onClick={() => setActiveTab('inventario')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'inventario' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>Inventario</button>
                <button onClick={() => setActiveTab('base')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors relative ${activeTab === 'base' ? 'bg-red-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>
                  Base
                  {(leadAlertCounts[selectedUser.id] || 0) > 0 && activeTab !== 'base' && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {leadAlertCounts[selectedUser.id]}
                    </span>
                  )}
                </button>
                <button onClick={() => setActiveTab('agenda')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'agenda' ? 'bg-red-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>Agenda</button>
              </>
            )}
            <button onClick={() => setActiveTab('soporte')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors relative ${activeTab === 'soporte' ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>
              Mensajes
              {(unreadCounts[selectedUser.id] ?? 0) > 0 && activeTab !== 'soporte' && <span className="absolute top-0 right-0 w-2 h-2 bg-purple-600 rounded-full animate-ping"></span>}
            </button>
            {(selectedUser.is_helper || selectedUser.role === 'admin') && (
              <button onClick={() => setActiveTab('helper')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'helper' ? 'bg-orange-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}>
                Helper Stats
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'licencias' && isAdmin && (
              <AdminUserLicenses 
                selectedUser={selectedUser} 
                plans={plans} 
                features={features} 
                planFeatures={selectedPlanFeatures}
                userOverrides={userOverrides} 
                onUpdatePlan={handleUpdatePlan} 
                onAssignFeature={handleAssignFeature} 
                onRemoveFeature={handleRemoveFeature} 
              />
            )}
            {activeTab === 'telemetria' && isAdmin && <AdminUserTelemetry selectedUser={selectedUser} />}
            {activeTab === 'heatmap' && isAdmin && <AdminUserHeatmap selectedUser={selectedUser} />}
            {activeTab === 'inventario' && isAdmin && <AdminUserInventory selectedUser={selectedUser} />}
            {activeTab === 'base' && isAdmin && (
              <AdminUserBase
                selectedUser={selectedUser}
                profiles={profiles}
                newLeadCount={leadAlertCounts[selectedUser.id] || 0}
                liveInsertedLead={liveObservedLead}
                realtimeRefreshKey={adminBaseRefreshKey}
              />
            )}
            {activeTab === 'agenda' && isAdmin && <AdminUserAgenda selectedUser={selectedUser} />}
            {activeTab === 'soporte' && <AdminSupportChat selectedUser={selectedUser} />}
            {activeTab === 'helper' && (selectedUser.is_helper || selectedUser.role === 'admin') && <AdminUserHelperStats selectedUser={selectedUser} />}
          </div>
        </div>
      ) : (
        <div className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600/50 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <div className="text-4xl text-gray-300 mb-2">{Icon.Leads()}</div>
            <p className="text-slate-400 dark:text-slate-500 font-medium">Selecciona un usuario de la lista</p>
          </div>
        </div>
      )}
    </div>
  );
}
