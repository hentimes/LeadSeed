import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import AdminUsersPage from './AdminUsersPage';
import AdminRolesPage from './AdminRolesPage';
import AdminFeaturesPage from './AdminFeaturesPage';
import AdminRequirementsPage from './AdminRequirementsPage';
import { loadOpenRequirementsCount, subscribeOpenRequirementsCount } from '../../services/adminService';

type AdminTab = 'users' | 'roles' | 'features' | 'support';

export default function AdminLayout() {
  const { profile, isAdmin } = useAuth();
  const isHelper = profile?.is_helper === true;
  const [activeTab, setActiveTab] = useState<AdminTab>(isAdmin ? 'users' : 'support');
  const [openReqs, setOpenReqs] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchOpenReqs = async () => {
      setOpenReqs(await loadOpenRequirementsCount());
    };
    
    void fetchOpenReqs();
    const unsubscribe = subscribeOpenRequirementsCount(fetchOpenReqs);
      
    return unsubscribe;
  }, [isAdmin]);

  if (!isAdmin && !isHelper) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl text-red-500 mb-4 flex justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-ink">Acceso Denegado</h2>
          <p className="text-ink-muted mt-2">Esta sección es exclusiva para el personal autorizado.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'Usuarios y Mensajes', icon: Icon.Leads, show: isAdmin || isHelper },
    { id: 'roles', label: 'Perfiles y Planes', icon: Icon.Settings, show: isAdmin },
    { id: 'features', label: 'Funcionalidades', icon: Icon.Dashboard, show: isAdmin },
    { id: 'support', label: 'Soporte', icon: Icon.Inbox, show: isAdmin || isHelper },
  ].filter(t => t.show) as { id: AdminTab; label: string; icon: any }[];

  return (
    <div className="h-full flex flex-col bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
      <div className="flex border-b border-line bg-surface-muted">
        <div className="flex w-full overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                  : 'border-transparent text-ink-muted hover:text-ink-secondary hover:bg-surface-hover/50'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-blue-600' : 'text-ink-muted'}>
                {tab.icon()}
              </span>
              {tab.label}
              {tab.id === 'support' && openReqs > 0 && (
                <span className="ml-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                  {openReqs}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-surface-muted p-6">
        {activeTab === 'users' && <AdminUsersPage />}
        {activeTab === 'roles' && isAdmin && <AdminRolesPage />}
        {activeTab === 'features' && isAdmin && <AdminFeaturesPage />}
        {activeTab === 'support' && (isAdmin || isHelper) && <AdminRequirementsPage />}
      </div>
    </div>
  );
}
