import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../utils/icons';
import AdminUsersPage from './AdminUsersPage';
import AdminRolesPage from './AdminRolesPage';
import AdminFeaturesPage from './AdminFeaturesPage';

type AdminTab = 'users' | 'roles' | 'features';

export default function AdminLayout() {
  const { session } = useAuth();
  const isAdmin = session?.user?.email === 'planespro.cl@gmail.com';
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl text-red-500 mb-4 flex justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Acceso Denegado</h2>
          <p className="text-gray-500 mt-2">Esta sección es exclusiva para el administrador principal.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'Gestión de Usuarios', icon: Icon.Leads },
    { id: 'roles', label: 'Perfiles y Planes', icon: Icon.Settings },
    { id: 'features', label: 'Funcionalidades y Trials', icon: Icon.Dashboard },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50/50">
        <div className="flex w-full overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}>
                {tab.icon()}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
        {activeTab === 'users' && <AdminUsersPage />}
        {activeTab === 'roles' && <AdminRolesPage />}
        {activeTab === 'features' && <AdminFeaturesPage />}
      </div>
    </div>
  );
}
