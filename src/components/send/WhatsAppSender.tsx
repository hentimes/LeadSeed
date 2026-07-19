import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lead, WhatsAppTemplate, WhatsAppTemplateList, LeadList, SendLog } from '../../types';
import { replaceVariables, openWhatsAppForLeads } from '../../utils/waHelper';
import { Icon } from '../../utils/icons';
import VariableDropdown from '../VariableDropdown';
import { insertTextAtCursor } from '../../utils/textHelper';
import { getCurrentSession } from '../../services/authService';
import { loadTemplateSendLog, logWhatsAppSend } from '../../services/sendService';

interface Props {
  leads: Lead[];
  templates: WhatsAppTemplate[];
  templateLists: WhatsAppTemplateList[];
  leadLists: LeadList[];
}

export default function WhatsAppSender({ leads, templates, templateLists, leadLists }: Props) {
  const [catId, setCatId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  
  // Edición dinámica al vuelo
  const [customBody, setCustomBody] = useState('');
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());
  
  const [leadSearch, setLeadSearch] = useState('');
  const [sentLog, setSentLog] = useState<SendLog[]>([]);
  
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const filteredTemplates = catId
    ? templates.filter((t) => (t.templateListIds || []).includes(catId))
    : templates;

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateSendLog(selectedTemplate.id!).then(setSentLog);
      setCustomBody(selectedTemplate.contenido || '');
    } else {
      setSentLog([]);
      setCustomBody('');
    }
  }, [selectedTemplate]);

  const sentLeadIds = useMemo(() => new Set(sentLog.map((l) => l.leadId)), [sentLog]);

  const recipients = useMemo(() => {
    const ids = new Set<string>(selectedLeadIds);
    for (const listId of selectedListIds) {
      leads.filter((l) => l.listaIds.includes(listId)).forEach((l) => ids.add(l.id!));
    }
    return leads.filter((l) => ids.has(l.id!));
  }, [leads, selectedLeadIds, selectedListIds]);

  // Set default preview lead
  useEffect(() => {
    if (recipients.length > 0 && !previewLead) {
      setPreviewLead(recipients[0]);
    }
  }, [recipients, previewLead]);

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleList = (id: number) => {
    setSelectedListIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (selectedListIds.size > 0) {
      result = result.filter(l => l.listaIds.some(id => selectedListIds.has(id)));
    }
    if (leadSearch) {
      const q = leadSearch.toLowerCase();
      result = result.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(q));
    }
    return result;
  }, [leads, selectedListIds, leadSearch]);

  const preConfirmSend = () => {
    if (!selectedTemplate || recipients.length === 0) return;
    setShowConfirmModal(true);
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    if (!selectedTemplate || recipients.length === 0) return;
    const session = await getCurrentSession();
    const userId = session?.user?.id;
    if (!userId) return;

    setSentLog(await logWhatsAppSend(userId, selectedTemplate.id!, recipients));
    
    openWhatsAppForLeads(recipients, customBody);
  };

  return (
    <div className="space-y-4 relative">
      
      {/* 1. Selección de Plantilla */}
      <div className="mb-4 border-b border-gray-100 pb-4">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">1. Seleccionar Plantilla</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 dark:text-slate-500 mb-1">Categoría</label>
            <select value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : null); setSelectedTemplate(null); }}
              className="w-full border rounded px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900">
              <option value="">Todas las categorías</option>
              {templateLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 dark:text-slate-500 mb-1">Plantilla</label>
            <select value={selectedTemplate?.id ?? ''} 
              onChange={(e) => {
                const tpl = templates.find(t => t.id === Number(e.target.value));
                setSelectedTemplate(tpl || null);
              }}
              className="w-full border rounded px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900">
              <option value="">Elegir plantilla...</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre || '(sin nombre)'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Edición Dinámica y Previsualización Integrada */}
      {selectedTemplate && (
        <div className="mb-4 border-b border-gray-100 pb-4">
           <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">2. Edición al Vuelo</h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-end mb-0.5">
                  <label className="block text-[11px] text-green-700">Contenido (Edición temporal)</label>
                  <VariableDropdown onSelect={(val: string) => insertTextAtCursor(bodyRef, customBody, val, setCustomBody)} />
                </div>
                <textarea 
                  ref={bodyRef}
                  value={customBody} 
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={6}
                  className="w-full border border-green-200 rounded px-2 py-1.5 text-sm outline-none focus:border-green-500" 
                />
              </div>
              
              <div className="flex flex-col">
                 <div className="flex justify-between items-center mb-0.5">
                   <label className="block text-[11px] text-green-700">Previsualizar como:</label>
                   <select value={previewLead?.id ?? ''} onChange={(e) => setPreviewLead(leads.find((l) => l.id === e.target.value) || null)}
                      className="border border-green-200 rounded px-1 text-[10px] bg-white dark:bg-slate-800/80 dark:backdrop-blur-md outline-none">
                      <option value="">Elegir...</option>
                      {recipients.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                   </select>
                 </div>
                 <div className="flex-1 bg-[#efeae2] p-2 rounded border border-green-200 overflow-y-auto max-h-32">
                   {previewLead ? (
                     <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-lg p-2 shadow-sm inline-block max-w-[90%] text-xs whitespace-pre-wrap">
                       {replaceVariables(customBody, previewLead)}
                     </div>
                   ) : (
                     <div className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">Selecciona un destinatario</div>
                   )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 3. Selección de Destinatarios */}
      <div className="mb-4 border-b border-gray-100 pb-4">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">3. Destinatarios ({recipients.length})</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Columna Izquierda: Listas */}
          <div className="border border-gray-100 rounded-lg bg-slate-50 dark:bg-slate-900 p-2 flex flex-col h-48">
             <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2 border-b pb-1">Tus Listas</div>
             <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {leadLists.map((list) => {
                  const on = selectedListIds.has(list.id!);
                  return (
                    <button key={list.id} onClick={() => toggleList(list.id!)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex justify-between items-center ${on ? 'text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-gray-200'}`}
                      style={on ? { backgroundColor: list.color } : {}}>
                      <span className="truncate">{list.name}</span>
                      <span className="opacity-75 text-[10px] ml-1 bg-black/10 px-1.5 rounded-full">{leads.filter((l) => l.listaIds.includes(list.id!)).length}</span>
                    </button>
                  );
                })}
                {leadLists.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">No hay listas</p>}
             </div>
          </div>

          {/* Columna Derecha: Leads */}
          <div className="border border-gray-100 rounded-lg bg-slate-50 dark:bg-slate-900 p-2 flex flex-col h-48">
            <div className="flex justify-between items-center border-b pb-1 mb-2">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Leads Directos</span>
              <input type="text" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Buscar..." className="border rounded px-1.5 py-0.5 text-[10px] w-24 outline-none focus:border-green-400" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {filteredLeads.map((lead) => (
                <label key={lead.id} className="group relative flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-200 rounded cursor-pointer text-xs transition-colors">
                  <input type="checkbox" checked={selectedLeadIds.has(lead.id!)} onChange={() => toggleLead(lead.id!)} className="rounded" />
                  <span className="flex-1 truncate select-none">{lead.name}</span>
                  {sentLeadIds.has(lead.id!) && <span className="text-green-500 text-[10px]" title="Ya enviado"></span>}
                  
                  {/* Tooltip flotante */}
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-10 bg-gray-800 text-white p-2 rounded shadow-lg text-[10px] w-40 pointer-events-none">
                    <p className="font-bold truncate">{lead.name}</p>
                    <p className="text-gray-300">{lead.phone || 'Sin teléfono'}</p>
                    {lead.company && <p className="text-gray-400 truncate border-t border-gray-600 mt-1 pt-1">{lead.company}</p>}
                  </div>
                </label>
              ))}
              {filteredLeads.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">Sin resultados</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Enviar */}
      <div className="pt-2">
        <button onClick={preConfirmSend} disabled={!selectedTemplate || recipients.length === 0}
          className="w-full bg-[#25D366] text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-[#1DA851] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-[0.98]">
          Abrir WhatsApp para {recipients.length} lead(s)
        </button>
      </div>

      {/* 5. Historial Compacto */}
      {sentLog.length > 0 && (
        <details className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 group shadow-sm">
          <summary className="text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none outline-none flex items-center">
            <span className="w-4 h-4 inline-flex items-center justify-center bg-gray-200 rounded-full mr-2 group-open:rotate-90 transition-transform">▸</span>
            Ver historial de envíos de esta plantilla ({sentLog.length})
          </summary>
          <div className="mt-2 pl-6 max-h-40 overflow-y-auto space-y-1">
            {sentLog.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5 flex-wrap text-[11px] border-b border-gray-100 py-1 last:border-0">
                <span className="font-medium text-slate-700 dark:text-slate-200">{l.leadName}</span>
                <span className="text-green-500 font-bold"></span>
                <span className="text-gray-400">·</span>
                <span className="text-slate-400 dark:text-slate-500 bg-gray-200 px-1 rounded">{selectedTemplate?.nombre}</span>
                <span className="text-gray-400 ml-auto">{new Date(l.sentAt).toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal de Confirmación de Envío */}
      {showConfirmModal && selectedTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700/50">
            <div className="p-4 bg-green-50 border-b border-green-100 flex items-center gap-3">
              <div className="bg-[#25D366] text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm">
                
              </div>
              <div>
                <h3 className="font-bold text-green-900 text-lg">Confirmar Envío</h3>
                <p className="text-xs text-green-700">Se abrirá WhatsApp Web</p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
              <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-2">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Plantilla</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedTemplate.nombre}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Destinatarios</span>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {recipients.slice(0, 2).map(r => r.name).join(', ')}
                    {recipients.length > 2 && (
                      <span 
                        className="text-slate-400 dark:text-slate-500 text-xs ml-1 cursor-help border-b border-dotted border-gray-400" 
                        title={recipients.slice(2).map(r => r.name).join(', ')}
                      >
                        y {recipients.length - 2} más...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 border-t bg-white dark:bg-slate-800/80 dark:backdrop-blur-md flex gap-2 justify-end">
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeSend} 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon.Messages /> Iniciar Envío (Abre WhatsApp Web)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
