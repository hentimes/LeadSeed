import React, { useEffect, useState } from 'react';
import { Icon } from '../../utils/icons';
import type { Profile, Lead } from '../../types';
import { loadAdminUserInventory } from '../../services/adminService';

interface Props {
  selectedUser: Profile;
}

export default function AdminUserInventory({ selectedUser }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templatesCount, setTemplatesCount] = useState({ whatsapp: 0, email: 0, call: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadInventory = async () => {
      setLoading(true);
      const { leads: mappedLeads, templatesCount: nextTemplatesCount } = await loadAdminUserInventory(selectedUser.id);

      if (!isMounted) return;

      setLeads(mappedLeads);
      setTemplatesCount(nextTemplatesCount);
      setLoading(false);
    };

    void loadInventory();
    return () => {
      isMounted = false;
    };
  }, [selectedUser.id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500 animate-pulse">Cargando inventario de la nube...</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="text-indigo-500">{Icon.Database()}</span> Plantillas Creadas
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <h4 className="text-sm font-bold text-green-800">WhatsApp</h4>
            <p className="text-3xl font-black text-green-600 mt-1">{templatesCount.whatsapp}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <h4 className="text-sm font-bold text-blue-800">Email</h4>
            <p className="text-3xl font-black text-blue-600 mt-1">{templatesCount.email}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <h4 className="text-sm font-bold text-purple-800">Llamadas</h4>
            <p className="text-3xl font-black text-purple-600 mt-1">{templatesCount.call}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="text-blue-500">{Icon.Leads()}</span> Ultimos Leads Asignados ({leads.length})
        </h3>

        {leads.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg p-6 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">Este usuario no tiene leads asignados en la nube.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Creado</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:bg-slate-900">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{lead.name || 'Sin nombre'}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{lead.email || lead.phone}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">{lead.company || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {lead.status || 'Nuevo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">
                      {new Date(lead.createdAt || '').toLocaleDateString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
