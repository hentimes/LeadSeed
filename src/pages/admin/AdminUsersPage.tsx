import { useEffect, useState } from 'react';
import { useSaaS } from '../../hooks/useSaaS';
import type { Profile, Plan, UserFeatureOverride, Feature } from '../../types';
import { Icon } from '../../utils/icons';
import { usePresence } from '../../hooks/usePresence';

import AdminUserLicenses from '../../components/admin/AdminUserLicenses';
import AdminUserTelemetry from '../../components/admin/AdminUserTelemetry';
import AdminUserInventory from '../../components/admin/AdminUserInventory';
import AdminUserReassign from '../../components/admin/AdminUserReassign';
import AdminUserHeatmap from '../../components/admin/AdminUserHeatmap';

type AdminTab = 'licencias' | 'telemetria' | 'inventario' | 'reasignacion' | 'heatmap';

export default function AdminUsersPage() {
  const { getProfiles, getPlans, getFeatures, getUserOverrides, assignFeatureToUser, removeFeatureFromUser, updateProfile } = useSaaS();
  const { onlineUsers } = usePresence();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userOverrides, setUserOverrides] = useState<UserFeatureOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('licencias');

  const loadData = async () => {
    setLoading(true);
    const [p, pl, f] = await Promise.all([getProfiles(), getPlans(), getFeatures()]);
    setProfiles(p);
    setPlans(pl);
    setFeatures(f);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    setActiveTab('licencias'); // Reset tab on user change
    const overrides = await getUserOverrides(user.id);
    setUserOverrides(overrides);
  };

  const handleUpdatePlan = async (planId: string) => {
    if (!selectedUser) return;
    await updateProfile(selectedUser.id, { plan_id: planId });
    setProfiles(profiles.map(p => p.id === selectedUser.id ? { ...p, plan_id: planId } : p));
    setSelectedUser({ ...selectedUser, plan_id: planId });
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

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Lista de Usuarios */}
      <div className="w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-800">Usuarios del Sistema</h3>
        </div>
        <div className="overflow-y-auto flex-1">
          {profiles.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">No hay usuarios registrados.</p>
          ) : (
            profiles.map(p => {
              const plan = plans.find(pl => pl.id === p.plan_id);
              const isOnline = !!onlineUsers[p.id];

              return (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectUser(p)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUser?.id === p.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {p.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Punto de estado online/offline */}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{p.full_name || p.email.split('@')[0]}</p>
                      <p className="text-xs text-gray-500 truncate" title={p.email}>{p.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3 text-xs">
                    <span className="text-gray-500">Rol: <span className="font-semibold text-gray-700">{p.role}</span></span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${plan ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                      {plan ? plan.name : 'Sin Plan'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Panel de Gestión del Usuario */}
      {selectedUser ? (
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
            <div className="flex items-center gap-4">
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="Avatar" className="w-14 h-14 rounded-full shadow-sm" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                  {selectedUser.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedUser.full_name || selectedUser.email}</h2>
                <p className="text-sm text-gray-500 font-mono">{selectedUser.email} | {selectedUser.id}</p>
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
          <div className="flex border-b border-gray-200 bg-white px-4 pt-2 gap-4">
            <button
              onClick={() => setActiveTab('licencias')}
              className={`pb-3 px-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
                activeTab === 'licencias' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{Icon.Settings()}</span> Licencias
            </button>
            <button
              onClick={() => setActiveTab('telemetria')}
              className={`pb-3 px-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
                activeTab === 'telemetria' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{Icon.Dashboard()}</span> Telemetría
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`pb-3 px-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
                activeTab === 'heatmap' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{Icon.ChartPie()}</span> Mapa Calor
            </button>
            <button
              onClick={() => setActiveTab('inventario')}
              className={`pb-3 px-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
                activeTab === 'inventario' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{Icon.Database()}</span> Inventario
            </button>
            <button
              onClick={() => setActiveTab('reasignacion')}
              className={`pb-3 px-2 flex items-center gap-2 text-[13px] font-semibold transition-all border-b-2 -mb-[1px] ${
                activeTab === 'reasignacion' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{Icon.Send()}</span> Reasignar
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'licencias' && (
              <AdminUserLicenses 
                selectedUser={selectedUser} 
                plans={plans} 
                features={features} 
                userOverrides={userOverrides} 
                onUpdatePlan={handleUpdatePlan} 
                onAssignFeature={handleAssignFeature} 
                onRemoveFeature={handleRemoveFeature} 
              />
            )}
            {activeTab === 'telemetria' && <AdminUserTelemetry selectedUser={selectedUser} />}
            {activeTab === 'heatmap' && <AdminUserHeatmap selectedUser={selectedUser} />}
            {activeTab === 'inventario' && <AdminUserInventory selectedUser={selectedUser} />}
            {activeTab === 'reasignacion' && <AdminUserReassign selectedUser={selectedUser} profiles={profiles} />}
          </div>
        </div>      ) : (
        <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-4xl text-gray-300 mb-2">{Icon.Leads()}</div>
            <p className="text-gray-500 font-medium">Selecciona un usuario de la lista</p>
          </div>
        </div>
      )}
    </div>
  );
}
