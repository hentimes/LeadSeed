import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Profile, Lead, WhatsAppTemplate } from '../../types';
import { Icon } from '../../utils/icons';

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
    loadBase();
  }, [selectedUser]);

  const loadBase = async () => {
    setLoading(true);
    setSelectedLeads(new Set());
    setSelectedTemplates(new Set());
    
    // Fetch leads
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', selectedUser.id)
      .is('deleted_at', null);
      
    // Fetch templates (WhatsApp)
    const { data: templatesData } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', selectedUser.id);
      
    setLeads(leadsData || []);
    setTemplates(templatesData || []);
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
    else setSelectedLeads(new Set(leads.map(l => l.id as string)));
  };

  const handleReassign = async () => {
    if (!targetUserId || (selectedLeads.size === 0 && selectedTemplates.size === 0)) return;
    if (!confirm('¿Seguro que quieres transferir los elementos seleccionados?')) return;
    
    setIsProcessing(true);
    try {
      if (selectedLeads.size > 0) {
        const { error: leadsError } = await supabase.rpc('admin_transfer_leads', {
          target_user_id: targetUserId,
          lead_ids: Array.from(selectedLeads)
        });
        if (leadsError) throw leadsError;
      }
      
      if (selectedTemplates.size > 0) {
        const { error: templatesError } = await supabase.rpc('admin_transfer_templates', {
          target_user_id: targetUserId,
          template_ids: Array.from(selectedTemplates)
        });
        if (templatesError) throw templatesError;
      }
      
      alert('Transferencia completada con éxito');
      await loadBase();
    } catch (e) {
      alert('Error en la transferencia. Revisa la consola.');
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (selectedLeads.size === 0) return alert('Selecciona al menos un lead para descargar');
    const toDownload = leads.filter(l => selectedLeads.has(l.id as string));
    
    const header = "Nombre,Telefono,Email,Empresa,Status\n";
    const rows = toDownload.map(l => `${l.name || ''},${l.phone || ''},${l.email || ''},${l.company || ''},${l.status || ''}`).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${selectedUser.email}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

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

      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium flex items-center gap-2">
              <Icon.Settings /> Cargando base de datos...
            </p>
          </div>
        ) : activeTab === 'leads' ? (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={toggleAllLeads}>
              <input type="checkbox" checked={selectedLeads.size === leads.length && leads.length > 0} readOnly className="rounded text-blue-600 w-4 h-4 cursor-pointer" />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Seleccionar Todos los Leads</span>
            </div>
            
            {leads.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">Este usuario no tiene leads registrados.</p>
            ) : (
              <div className="space-y-2">
                {leads.map(lead => (
                  <div key={lead.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => toggleLead(lead.id as string)}>
                    <input type="checkbox" checked={selectedLeads.has(lead.id as string)} readOnly className="rounded text-blue-600 w-4 h-4 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{lead.name || 'Sin Nombre'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{lead.phone || 'Sin teléfono'} • {lead.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'templates' ? (
          <div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => {
              if (selectedTemplates.size === templates.length) setSelectedTemplates(new Set());
              else setSelectedTemplates(new Set(templates.map(t => t.id as string)));
            }}>
              <input type="checkbox" checked={selectedTemplates.size === templates.length && templates.length > 0} readOnly className="rounded text-blue-600 w-4 h-4 cursor-pointer" />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Seleccionar Todas las Plantillas</span>
            </div>
            
            {templates.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">Este usuario no tiene plantillas registradas.</p>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => {
                    const next = new Set(selectedTemplates);
                    if (next.has(template.id as string)) next.delete(template.id as string);
                    else next.add(template.id as string);
                    setSelectedTemplates(next);
                  }}>
                    <input type="checkbox" checked={selectedTemplates.has(template.id as string)} readOnly className="rounded text-blue-600 w-4 h-4 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{template.nombre || 'Sin Nombre'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{template.contenido || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Barra de Acciones (Fijada abajo) */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border-t border-slate-200 dark:border-slate-700/50 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            {selectedLeads.size} Leads | {selectedTemplates.size} Plantillas
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <select 
              value={targetUserId} 
              onChange={e => setTargetUserId(e.target.value)}
              className="border border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm w-full md:w-64 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-600 dark:text-slate-300"
            >
              <option value="">Transferir a usuario...</option>
              {profiles.filter(p => p.id !== selectedUser.id).map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
            
            <div className="flex gap-2">
              <button 
                disabled={isProcessing || !targetUserId || (selectedLeads.size === 0 && selectedTemplates.size === 0)}
                onClick={handleReassign}
                className="flex-1 md:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 disabled:hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Icon.Send /> Transferir
              </button>

              <button 
                disabled={isProcessing || selectedLeads.size === 0}
                onClick={handleDownload}
                className="flex-1 md:flex-none px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-bold disabled:opacity-50 disabled:hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
              >
                <Icon.Download /> Descargar CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
