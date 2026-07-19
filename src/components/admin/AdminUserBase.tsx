import { useState, useEffect } from 'react';
import type { Profile, Lead, WhatsAppTemplate } from '../../types';
import { Icon } from '../../utils/icons';
import { loadAdminUserBase, transferAdminUserAssets } from '../../services/adminService';

interface Props {
  selectedUser: Profile;
  profiles: Profile[];
}

export default function AdminUserBase({ selectedUser, profiles }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'templates'>('leads');

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  const [targetUserId, setTargetUserId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    void loadBase();
  }, [selectedUser.id]);

  const loadBase = async () => {
    setLoading(true);
    setSelectedLeads(new Set());
    setSelectedTemplates(new Set());

    const { leads: nextLeads, templates: nextTemplates } = await loadAdminUserBase(selectedUser.id);
    setLeads(nextLeads);
    setTemplates(nextTemplates);
    setLoading(false);
  };

  const toggleLead = (id: string) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const toggleAllLeads = () => {
    if (selectedLeads.size === leads.length) setSelectedLeads(new Set());
    else setSelectedLeads(new Set(leads.map((lead) => lead.id as string)));
  };

  const handleReassign = async () => {
    if (!targetUserId || (selectedLeads.size === 0 && selectedTemplates.size === 0)) return;
    if (!confirm('Seguro que quieres transferir los elementos seleccionados?')) return;

    setIsProcessing(true);
    try {
      await transferAdminUserAssets(targetUserId, Array.from(selectedLeads), Array.from(selectedTemplates));
      alert('Transferencia completada con exito');
      await loadBase();
    } catch (error) {
      alert('Error en la transferencia. Revisa la consola.');
      console.error(error);
    }
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (selectedLeads.size === 0) return alert('Selecciona al menos un lead para descargar');
    const toDownload = leads.filter((lead) => selectedLeads.has(lead.id as string));

    const header = 'Nombre,Telefono,Email,Empresa,Status\n';
    const rows = toDownload.map((lead) => `${lead.name || ''},${lead.phone || ''},${lead.email || ''},${lead.company || ''},${lead.status || ''}`).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `leads_${selectedUser.email}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 dark:text-slate-500 animate-pulse">Cargando base del usuario...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800/80 dark:backdrop-blur-md relative">
      <div className="flex border-b border-slate-200 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'leads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:bg-slate-900'}`}
        >
          Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:bg-slate-900'}`}
        >
          Plantillas ({templates.length})
        </button>
      </div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 flex gap-2 items-center">
        <select
          value={targetUserId}
          onChange={(event) => setTargetUserId(event.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 text-sm"
        >
          <option value="">Transferir a...</option>
          {profiles.filter((profile) => profile.id !== selectedUser.id).map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name || profile.email}
            </option>
          ))}
        </select>
        <button onClick={handleReassign} disabled={isProcessing} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
          {isProcessing ? 'Procesando...' : 'Transferir'}
        </button>
        {activeTab === 'leads' && (
          <button onClick={handleDownload} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700/50 text-sm font-semibold">
            Descargar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'leads' ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={leads.length > 0 && selectedLeads.size === leads.length} onChange={toggleAllLeads} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:bg-slate-900">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedLeads.has(lead.id as string)} onChange={() => toggleLead(lead.id as string)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{lead.name || 'Sin nombre'}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{lead.email || lead.phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{lead.status || 'Nuevo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-gray-200">
            {templates.map((template) => (
              <label key={template.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={selectedTemplates.has(template.id as string)}
                  onChange={() => {
                    const next = new Set(selectedTemplates);
                    if (next.has(template.id as string)) next.delete(template.id as string);
                    else next.add(template.id as string);
                    setSelectedTemplates(next);
                  }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Icon.Messages /> {template.nombre || 'Plantilla sin nombre'}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">{template.contenido || 'Sin contenido'}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
