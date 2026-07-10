import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lead, EmailTemplate, EmailTemplateList, LeadList, SendLog } from '../types';
import { replaceVariables } from '../utils/waHelper';
import { sendEmailToLeads, type EmailAttachment } from '../utils/emailSender';
import { db } from '../db/database';
import { Icon } from '../utils/icons';
import VariableDropdown from './VariableDropdown';
import { insertTextAtCursor } from '../utils/textHelper';

interface Props {
  leads: Lead[];
  templates: EmailTemplate[];
  templateLists: EmailTemplateList[];
  leadLists: LeadList[];
}

export default function EmailSender({ leads, templates, templateLists, leadLists }: Props) {
  const [catId, setCatId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  
  // Edición dinámica
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());
  
  const [leadSearch, setLeadSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; errors: string[] } | null>(null);
  const [sentLog, setSentLog] = useState<SendLog[]>([]);
  
  const [schedule, setSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const filteredTemplates = catId
    ? templates.filter((t) => (t.templateListIds || []).includes(catId))
    : templates;

  useEffect(() => {
    if (selectedTemplate) {
      db.sendLog.where('templateId').equals(selectedTemplate.id!).toArray().then(setSentLog);
      setCustomSubject(selectedTemplate.asunto || '');
      setCustomBody(selectedTemplate.contenido || '');
      setAttachments([]);
    } else {
      setSentLog([]);
      setCustomSubject('');
      setCustomBody('');
      setAttachments([]);
    }
  }, [selectedTemplate]);

  const sentLeadIds = useMemo(() => new Set(sentLog.map((l) => l.leadId)), [sentLog]);

  const recipients = useMemo(() => {
    const ids = new Set<number>(selectedLeadIds);
    for (const listId of selectedListIds) {
      leads.filter((l) => l.listaIds.includes(listId)).forEach((l) => ids.add(l.id!));
    }
    return leads.filter((l) => ids.has(l.id!));
  }, [leads, selectedLeadIds, selectedListIds]);

  // Set default preview lead when recipients change
  useEffect(() => {
    if (recipients.length > 0 && !previewLead) {
      setPreviewLead(recipients[0]);
    }
  }, [recipients, previewLead]);

  const toggleLead = (id: number) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64String = (ev.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, { filename: file.name, content: base64String }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const preConfirmSend = () => {
    if (!selectedTemplate || recipients.length === 0) return;
    setShowConfirmModal(true);
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    if (!selectedTemplate || recipients.length === 0) return;
    const now = new Date().toISOString();

    if (schedule && scheduledDate && scheduledTime) {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      const logs = recipients.map((l) => ({
        templateId: selectedTemplate.id!, templateType: 'email' as const,
        leadId: l.id!, leadName: l.name, leadPhone: l.phone || l.email,
        sentAt: now, scheduledFor,
      }));
      await db.sendLog.bulkAdd(logs);
      try { chrome.storage.local.set({ hasScheduledEmails: true }); } catch { /* noop */ }
      setSchedule(false);
      setScheduledDate('');
      setScheduledTime('');
      setResult({ total: recipients.length, sent: 0, errors: [`${recipients.length} email(s) programados para ${new Date(scheduledFor).toLocaleString('es-CL')}`] });
      const updated = await db.sendLog.where('templateId').equals(selectedTemplate.id!).toArray();
      setSentLog(updated);
      return;
    }

    setSending(true);
    // Usar el asunto, cuerpo y adjuntos customizados al vuelo
    const res = await sendEmailToLeads(recipients, customSubject, customBody, selectedTemplate.isHtml, attachments);
    setResult(res);
    const logs = recipients.map((l) => ({
      templateId: selectedTemplate.id!, templateType: 'email' as const,
      leadId: l.id!, leadName: l.name, leadPhone: l.phone || l.email, sentAt: now,
    }));
    await db.sendLog.bulkAdd(logs);
    for (const l of recipients) {
      await db.leads.update(l.id!, { status: 'contactado' });
    }
    const updated = await db.sendLog.where('templateId').equals(selectedTemplate.id!).toArray();
    setSentLog(updated);
    setSending(false);
  };

  return (
    <div className="space-y-4 relative">
      
      {/* 1. Selección de Plantilla (Fila unificada) */}
      <div className="bg-white border rounded-lg p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">1. Seleccionar Plantilla</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Categoría</label>
            <select value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : null); setSelectedTemplate(null); }}
              className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50">
              <option value="">Todas las categorías</option>
              {templateLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Plantilla</label>
            <select value={selectedTemplate?.id ?? ''} 
              onChange={(e) => {
                const tpl = templates.find(t => t.id === Number(e.target.value));
                setSelectedTemplate(tpl || null);
              }}
              className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50">
              <option value="">Elegir plantilla...</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre || '(sin nombre)'} {t.isHtml ? '(HTML)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Edición Dinámica (Al Vuelo) */}
      {selectedTemplate && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 shadow-sm">
           <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider">2. Edición al Vuelo</h3>
            {selectedTemplate.isHtml && (
              <button onClick={() => setShowPreviewModal(true)} className="bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded text-xs font-medium hover:bg-blue-100 flex items-center gap-1 shadow-sm">
                👁 Ver Vista Previa
              </button>
            )}
           </div>
           
           <div className="space-y-2">
              <div>
                <div className="flex justify-between items-end mb-0.5">
                  <label className="block text-[11px] text-blue-600">Asunto (Puedes editarlo para este envío)</label>
                  <VariableDropdown onSelect={(val) => insertTextAtCursor(subjectRef, customSubject, val, setCustomSubject)} />
                </div>
                <input 
                  ref={subjectRef}
                  type="text" 
                  value={customSubject} 
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full border border-blue-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-0.5">
                  <label className="block text-[11px] text-blue-600">Contenido (Edición temporal)</label>
                  <VariableDropdown onSelect={(val) => insertTextAtCursor(bodyRef, customBody, val, setCustomBody)} />
                </div>
                <textarea 
                  ref={bodyRef}
                  value={customBody} 
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={4}
                  className={`w-full border border-blue-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 ${selectedTemplate.isHtml ? 'font-mono text-xs' : ''}`} 
                />
              </div>
              
              <div className="mt-2 border-t border-blue-100 pt-2">
                <label className="block text-[11px] text-blue-600 mb-0.5">Archivos Adjuntos (Opcional)</label>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  className="text-xs text-blue-700 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer mb-2"
                />
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attachments.map((att, i) => (
                      <span key={i} className="bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5 shadow-sm">
                        📄 <span className="max-w-[120px] truncate" title={att.filename}>{att.filename}</span>
                        <button onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* 3. Selección de Destinatarios (Dos columnas) */}
      <div className="bg-white border rounded-lg p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">3. Destinatarios ({recipients.length})</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Columna Izquierda: Listas */}
          <div className="border border-gray-100 rounded-lg bg-gray-50 p-2 flex flex-col h-48">
             <div className="text-xs font-medium text-gray-500 mb-2 border-b pb-1">Tus Listas</div>
             <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {leadLists.map((list) => {
                  const on = selectedListIds.has(list.id!);
                  return (
                    <button key={list.id} onClick={() => toggleList(list.id!)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex justify-between items-center ${on ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                      style={on ? { backgroundColor: list.color } : {}}>
                      <span className="truncate">{list.name}</span>
                      <span className="opacity-75 text-[10px] ml-1 bg-black/10 px-1.5 rounded-full">{leads.filter((l) => l.listaIds.includes(list.id!)).length}</span>
                    </button>
                  );
                })}
                {leadLists.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">No hay listas creadas</p>}
             </div>
          </div>

          {/* Columna Derecha: Leads */}
          <div className="border border-gray-100 rounded-lg bg-gray-50 p-2 flex flex-col h-48">
            <div className="flex justify-between items-center border-b pb-1 mb-2">
              <span className="text-xs font-medium text-gray-500">Leads Directos</span>
              <input type="text" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Buscar..." className="border rounded px-1.5 py-0.5 text-[10px] w-24 outline-none focus:border-blue-400" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {filteredLeads.map((lead) => (
                <label key={lead.id} className="group relative flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-200 rounded cursor-pointer text-xs transition-colors">
                  <input type="checkbox" checked={selectedLeadIds.has(lead.id!)} onChange={() => toggleLead(lead.id!)} className="rounded" />
                  <span className="flex-1 truncate select-none">{lead.name}</span>
                  {sentLeadIds.has(lead.id!) && <span className="text-green-500 text-[10px]" title="Ya enviado">✓</span>}
                  
                  {/* Tooltip flotante al hacer hover */}
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-10 bg-gray-800 text-white p-2 rounded shadow-lg text-[10px] w-40 pointer-events-none">
                    <p className="font-bold truncate">{lead.name}</p>
                    <p className="text-gray-300 truncate">{lead.email || 'Sin correo'}</p>
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
      <div className="bg-white border rounded-lg p-3 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-600">
            <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="rounded" />
            Programar envío automático
          </label>
          
          {schedule && (
            <div className="flex gap-2">
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                className="border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                className="border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
            </div>
          )}
        </div>

        <button onClick={preConfirmSend} disabled={!selectedTemplate || recipients.length === 0 || sending || (schedule && (!scheduledDate || !scheduledTime))}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-[0.98]">
          {sending ? 'Enviando mensajes...' : schedule ? `Programar envío a ${recipients.length} lead(s)` : `Enviar Ahora a ${recipients.length} lead(s)`}
        </button>

        {result && (
          <div className={`mt-3 p-2.5 rounded-lg text-sm flex items-start gap-2 ${result.errors.length ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <span className="text-lg">{result.errors.length ? '⚠️' : '✅'}</span>
            <div>
              <div className={`font-semibold ${result.errors.length ? 'text-yellow-800' : 'text-green-800'}`}>
                {result.sent} de {result.total} enviados con éxito
              </div>
              {result.errors.length > 0 && (
                <div className="mt-1 space-y-1 text-xs text-red-600">
                  {result.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Historial Compacto */}
      {sentLog.length > 0 && (
        <details className="bg-gray-50 border rounded-lg p-2 group shadow-sm">
          <summary className="text-xs font-semibold text-gray-600 cursor-pointer select-none outline-none flex items-center">
            <span className="w-4 h-4 inline-flex items-center justify-center bg-gray-200 rounded-full mr-2 group-open:rotate-90 transition-transform">▸</span>
            Ver historial de envíos de esta plantilla ({sentLog.length})
          </summary>
          <div className="mt-2 pl-6 max-h-40 overflow-y-auto space-y-1">
            {sentLog.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5 flex-wrap text-[11px] border-b border-gray-100 py-1 last:border-0">
                <span className="font-medium text-gray-800">{l.leadName}</span>
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 bg-gray-200 px-1 rounded">{selectedTemplate?.nombre}</span>
                <span className="text-gray-400 ml-auto">{new Date(l.sentAt).toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal de Vista Previa HTML */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span>👁</span> Vista Previa del Correo
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-red-500 font-bold text-lg w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors">
                ×
              </button>
            </div>
            
            <div className="p-3 border-b bg-white">
               <div className="text-xs mb-2">
                 <span className="font-semibold text-gray-600">Previsualizar como:</span>
                 <select value={previewLead?.id ?? ''} onChange={(e) => setPreviewLead(leads.find((l) => l.id === Number(e.target.value)) || null)}
                    className="ml-2 border rounded px-2 py-1 bg-gray-50 outline-none focus:border-blue-400">
                    <option value="">Elegir destinatario...</option>
                    {recipients.slice(0,20).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                 </select>
                 {recipients.length === 0 && <span className="text-red-500 ml-2">Selecciona un destinatario primero</span>}
               </div>
               
               {previewLead && (
                 <div className="bg-gray-100 p-2 rounded text-xs border border-gray-200">
                   <div className="text-gray-500 mb-1">Para: <span className="text-gray-800 font-medium">{previewLead.email}</span></div>
                   <div className="text-gray-500">Asunto: <span className="text-gray-800 font-medium">{replaceVariables(customSubject, previewLead)}</span></div>
                 </div>
               )}
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {previewLead ? (
                <div className="bg-white mx-auto shadow-sm rounded border min-h-full">
                  <iframe
                    srcDoc={replaceVariables(customBody, previewLead)}
                    title="Preview"
                    className="w-full h-[50vh] border-0 rounded"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  Selecciona al menos un destinatario para ver la previsualización.
                </div>
              )}
            </div>
            
            <div className="p-3 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setShowPreviewModal(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-300 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Envío */}
      {showConfirmModal && selectedTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm">
                ✉️
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-lg">Confirmar Envío</h3>
                <p className="text-xs text-blue-700">{schedule ? 'Se programará este correo' : 'El correo se enviará ahora'}</p>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 space-y-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Plantilla</span>
                  <span className="text-sm font-medium text-gray-800">{selectedTemplate.nombre}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Asunto</span>
                  <span className="text-sm text-gray-700 break-words line-clamp-2">{customSubject}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Destinatarios</span>
                    <div className="text-sm font-medium text-gray-800">
                      {recipients.slice(0, 2).map(r => r.name).join(', ')}
                      {recipients.length > 2 && (
                        <span 
                          className="text-gray-500 text-xs ml-1 cursor-help border-b border-dotted border-gray-400" 
                          title={recipients.slice(2).map(r => r.name).join(', ')}
                        >
                          y {recipients.length - 2} más...
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Adjuntos</span>
                    <span className="text-lg font-bold text-purple-600">{attachments.length}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 border-t bg-white flex gap-2 justify-end">
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeSend} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                {schedule ? 'Programar Envío' : 'Sí, Enviar Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
