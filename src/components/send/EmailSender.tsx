import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lead, EmailDeliveryChannelOption, EmailTemplate, EmailTemplateList, LeadList, SendLog } from '../../types';
import { replaceVariables } from '../../utils/waHelper';
import type { EmailAttachment } from '../../utils/emailSender';
import { Icon } from '../../utils/icons';
import EmailEditor from './EmailEditor';
import EmailScheduler from './EmailScheduler';
import { getCurrentSession } from '../../services/authService';
import { loadTemplateSendLog, scheduleEmailSend, sendImmediateEmail } from '../../services/sendService';
import { getSettings } from '../../services/appSettingsService';
import { getMyCalendarConnectionStatus } from '../../services/agendaService';
import { listEmailChannels } from '../../repositories/emailChannelsRepository';

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
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
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
  const [channelOptions, setChannelOptions] = useState<EmailDeliveryChannelOption[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const selectedChannel = useMemo(
    () => channelOptions.find((option) => option.id === selectedChannelId) || null,
    [channelOptions, selectedChannelId],
  );

  const findTemplateById = (value: string) => templates.find((template) => String(template.id ?? '') === value) || null;

  const filteredTemplates = catId
    ? templates.filter((t) => (t.templateListIds || []).includes(catId))
    : templates;

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateSendLog(selectedTemplate.id!).then(setSentLog);
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

  useEffect(() => {
    let active = true;

    async function loadEmailChannels() {
      try {
        const [settings, channels, googleStatus] = await Promise.all([
          getSettings(),
          listEmailChannels().catch(() => []),
          getMyCalendarConnectionStatus().catch(() => null),
        ]);
        if (!active) return;

        const activeProvider = settings.emailProvider || 'gmail';
        const options: EmailDeliveryChannelOption[] = [];

        if (googleStatus?.isConnected && googleStatus.tokenScope?.includes('https://www.googleapis.com/auth/gmail.send')) {
          options.push({
            id: 'gmail-oauth',
            provider: 'gmail',
            label: 'Gmail',
            fromName: googleStatus.googleEmail.split('@')[0] || 'Gmail',
            fromEmail: googleStatus.googleEmail,
            isConnected: true,
            isDefault: activeProvider === 'gmail',
            isActiveProvider: activeProvider === 'gmail',
          });
        }

        channels
          .filter((channel: any) => channel.isActive)
          .forEach((channel: any) => {
            options.push({
              id: channel.id,
              provider: 'resend',
              label: channel.channelName,
              fromName: channel.fromName,
              fromEmail: channel.fromEmail,
              isConnected: true,
              isDefault: channel.isDefault,
              isActiveProvider: activeProvider === 'resend' && channel.isDefault,
              dailyLimit: channel.dailyLimit,
            });
          });

        setChannelOptions(options);

        const preferredOption =
          options.find((option) => option.isActiveProvider) ||
          options.find((option) => option.isDefault) ||
          options[0];

        setSelectedChannelId(preferredOption?.id || '');
      } catch {
        if (!active) return;
        setChannelOptions([]);
        setSelectedChannelId('');
      }
    }

    void loadEmailChannels();
    return () => {
      active = false;
    };
  }, []);

  const sentLeadIds = useMemo(() => new Set(sentLog.map((l) => l.leadId)), [sentLog]);

  const recipients = useMemo(() => {
    const ids = new Set<string>(selectedLeadIds);
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

    if (schedule && scheduledDate && scheduledTime) {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      setSentLog(await scheduleEmailSend(userId, selectedTemplate.id!, recipients, scheduledFor));
      try { chrome.storage.local.set({ hasScheduledEmails: true }); } catch { /* noop */ }
      setSchedule(false);
      setScheduledDate('');
      setScheduledTime('');
      setResult({ total: recipients.length, sent: 0, errors: [`${recipients.length} email(s) programados para ${new Date(scheduledFor).toLocaleString('es-CL')}`] });
      return;
    }

    setSending(true);
    const { result: sendResult, sentLog: updatedLog } = await sendImmediateEmail(
      userId,
      selectedTemplate.id!,
      recipients,
      customSubject,
      customBody,
      selectedTemplate.isHtml,
      attachments,
      selectedChannelId
        ? {
            provider: selectedChannel?.provider,
            channelId: selectedChannel?.provider === 'resend' ? selectedChannelId : undefined,
          }
        : undefined,
    );
    setResult(sendResult);
    setSentLog(updatedLog);
    setSending(false);
  };

  return (
    <div className="space-y-4 relative">
      
      {/* 1. Selección de Plantilla (Fila unificada) */}
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
                setSelectedTemplate(findTemplateById(e.target.value));
              }}
              className="w-full border rounded px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900">
              <option value="">Elegir plantilla...</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre || '(sin nombre)'} {t.isHtml ? '(HTML)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {channelOptions.length > 0 ? (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="shrink-0">Canal remitente</span>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="max-w-[280px] rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {channelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} · {option.fromEmail}{option.isActiveProvider ? ' · Activo' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* 2. Edición Dinámica (Al Vuelo) */}
      {selectedTemplate && (
        <EmailEditor 
          selectedTemplate={selectedTemplate}
          customSubject={customSubject}
          setCustomSubject={setCustomSubject}
          customBody={customBody}
          setCustomBody={setCustomBody}
          attachments={attachments}
          setAttachments={setAttachments}
          setShowPreviewModal={setShowPreviewModal}
        />
      )}

      {/* 3. Selección de Destinatarios (Dos columnas) */}
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
                {leadLists.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">No hay listas creadas</p>}
             </div>
          </div>

          {/* Columna Derecha: Leads */}
          <div className="border border-gray-100 rounded-lg bg-slate-50 dark:bg-slate-900 p-2 flex flex-col h-48">
            <div className="flex justify-between items-center border-b pb-1 mb-2">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Leads Directos</span>
              <input type="text" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Buscar..." className="border rounded px-1.5 py-0.5 text-[10px] w-24 outline-none focus:border-blue-400" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {filteredLeads.map((lead) => (
                <label key={lead.id} className="group relative flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-200 rounded cursor-pointer text-xs transition-colors">
                  <input type="checkbox" checked={selectedLeadIds.has(lead.id!)} onChange={() => toggleLead(lead.id!)} className="rounded" />
                  <span className="flex-1 truncate select-none">{lead.name}</span>
                  {sentLeadIds.has(lead.id!) && <span className="text-green-500 text-[10px]" title="Ya enviado"><Icon.Check /></span>}
                  
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
      <EmailScheduler 
        schedule={schedule}
        setSchedule={setSchedule}
        scheduledDate={scheduledDate}
        setScheduledDate={setScheduledDate}
        scheduledTime={scheduledTime}
        setScheduledTime={setScheduledTime}
        preConfirmSend={preConfirmSend}
        sending={sending}
        selectedTemplate={selectedTemplate}
        recipients={recipients}
        result={result}
      />

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
                <span className="text-green-500 font-bold"><Icon.Check /></span>
                <span className="text-gray-400">·</span>
                <span className="text-slate-400 dark:text-slate-500 bg-gray-200 px-1 rounded">{selectedTemplate?.nombre}</span>
                <span className="text-gray-400 ml-auto">{new Date(l.sentAt).toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal de Vista Previa HTML */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span><Icon.View /></span> Vista Previa del Correo
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-red-500 font-bold text-lg w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors">
                ×
              </button>
            </div>
            
            <div className="p-3 border-b bg-white dark:bg-slate-800/80 dark:backdrop-blur-md">
               <div className="text-xs mb-2">
                 <span className="font-semibold text-slate-500 dark:text-slate-400">Previsualizar como:</span>
                 <select value={previewLead?.id ?? ''} onChange={(e) => setPreviewLead(leads.find((l) => l.id === e.target.value) || null)}
                    className="ml-2 border rounded px-2 py-1 bg-slate-50 dark:bg-slate-900 outline-none focus:border-blue-400">
                    <option value="">Elegir destinatario...</option>
                    {recipients.slice(0,20).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                 </select>
                 {recipients.length === 0 && <span className="text-red-500 ml-2">Selecciona un destinatario primero</span>}
               </div>
               
               {previewLead && (
                 <div className="bg-gray-100 p-2 rounded text-xs border border-slate-200 dark:border-slate-700/50">
                   <div className="text-slate-400 dark:text-slate-500 mb-1">Para: <span className="text-slate-700 dark:text-slate-200 font-medium">{previewLead.email}</span></div>
                   <div className="text-slate-400 dark:text-slate-500">Asunto: <span className="text-slate-700 dark:text-slate-200 font-medium">{replaceVariables(customSubject, previewLead)}</span></div>
                 </div>
               )}
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {previewLead ? (
                <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md mx-auto shadow-sm rounded border min-h-full">
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
            
            <div className="p-3 border-t bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button onClick={() => setShowPreviewModal(false)} className="bg-gray-200 text-slate-600 dark:text-slate-300 px-4 py-2 rounded font-medium hover:bg-gray-300 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Envío */}
      {showConfirmModal && selectedTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700/50">
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm">
                <Icon.Email />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-lg">Confirmar Envío</h3>
                <p className="text-xs text-blue-700">{schedule ? 'Se programará este correo' : 'El correo se enviará ahora'}</p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
              <div className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-2">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Plantilla</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedTemplate.nombre}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Asunto</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 break-words line-clamp-2">{customSubject}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
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
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Adjuntos</span>
                    <span className="text-lg font-bold text-purple-600">{attachments.length}</span>
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
