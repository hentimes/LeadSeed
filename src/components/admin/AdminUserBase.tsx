import { useEffect, useRef, useState } from 'react';
import type { Profile, Lead, WhatsAppTemplate } from '../../types';
import { Icon } from '../../utils/icons';
import { loadAdminUserBase, transferAdminUserAssets } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../utils/errorMessage';

interface Props {
  selectedUser: Profile;
  profiles: Profile[];
  newLeadCount?: number;
  liveInsertedLead?: Lead | null;
  realtimeRefreshKey?: number;
}

export default function AdminUserBase({
  selectedUser,
  profiles,
  newLeadCount = 0,
  liveInsertedLead = null,
  realtimeRefreshKey = 0,
}: Props) {
  const { profile: currentUserProfile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'templates'>('leads');
  const [liveNotice, setLiveNotice] = useState<string>('');
  const noticeTimeoutRef = useRef<number | null>(null);

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  const [targetUserId, setTargetUserId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    void loadBase();
  }, [currentUserProfile?.id, selectedUser.id]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!liveInsertedLead?.id) return;

    setLeads((current) => {
      if (current.some((lead) => lead.id === liveInsertedLead.id)) {
        return current;
      }
      return [liveInsertedLead, ...current];
    });

    setLiveNotice(liveInsertedLead.name || 'Nuevo lead');
    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setLiveNotice('');
      noticeTimeoutRef.current = null;
    }, 6000);
  }, [liveInsertedLead]);

  useEffect(() => {
    if (realtimeRefreshKey <= 0) return;
    void loadBase();
  }, [realtimeRefreshKey]);


  const loadBase = async () => {
    setLoading(true);
    setError('');
    setSelectedLeads(new Set());
    setSelectedTemplates(new Set());
    try {
      const { leads: nextLeads, templates: nextTemplates } = await loadAdminUserBase(selectedUser.id, currentUserProfile?.id);
      setLeads(nextLeads);
      setTemplates(nextTemplates);
    } catch (loadError) {
      setLeads([]);
      setTemplates([]);
      setError(getErrorMessage(loadError, 'No se pudo cargar la base observada'));
    } finally {
      setLoading(false);
    }
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
    return <div className="p-8 text-center text-ink-muted animate-pulse">Cargando base del usuario...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-surface dark:backdrop-blur-md relative">
      <div className="px-4 py-3 border-b border-line bg-surface-muted">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">Base observada</p>
        <p className="mt-1 text-sm text-ink-secondary">
          Leads y plantillas de {selectedUser.full_name || selectedUser.email}. Esta vista no cambia la agenda principal del superadmin.
        </p>
        {liveNotice && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            Nuevo lead en tiempo real: {liveNotice}
          </p>
        )}
        {newLeadCount > 0 && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            {newLeadCount} lead{newLeadCount === 1 ? '' : 's'} nuevo{newLeadCount === 1 ? '' : 's'} pendiente{newLeadCount === 1 ? '' : 's'} de revisar
          </p>
        )}
      </div>
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'leads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted'}`}
        >
          Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted'}`}
        >
          Plantillas ({templates.length})
        </button>
      </div>

      <div className="p-4 border-b border-line bg-surface-muted flex gap-2 items-center">
        <select
          value={targetUserId}
          onChange={(event) => setTargetUserId(event.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-line bg-surface text-sm"
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
          <button onClick={handleDownload} className="px-3 py-2 rounded-lg border border-line text-sm font-semibold">
            Descargar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'leads' ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={leads.length > 0 && selectedLeads.size === leads.length} onChange={toggleAllLeads} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedLeads.has(lead.id as string)} onChange={() => toggleLead(lead.id as string)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-ink">{lead.name || 'Sin nombre'}</div>
                    <div className="text-xs text-ink-muted">{lead.email || lead.phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-secondary">{lead.status || 'Nuevo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-gray-200">
            {templates.map((template) => (
              <label key={template.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-muted">
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
                  <div className="text-sm font-medium text-ink flex items-center gap-2">
                    <Icon.Messages /> {template.nombre || 'Plantilla sin nombre'}
                  </div>
                  <p className="text-xs text-ink-muted mt-1 line-clamp-2">{template.contenido || 'Sin contenido'}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
