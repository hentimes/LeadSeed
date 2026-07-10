import { useState, useMemo, useEffect } from 'react';
import type { Lead, EmailTemplate, EmailTemplateList, LeadList, SendLog } from '../types';
import { replaceVariables } from '../utils/waHelper';
import { sendEmailToLeads } from '../utils/emailSender';
import { db } from '../db/database';
import { Icon } from '../utils/icons';

interface Props {
  leads: Lead[];
  templates: EmailTemplate[];
  templateLists: EmailTemplateList[];
  leadLists: LeadList[];
}

export default function EmailSender({ leads, templates, templateLists, leadLists }: Props) {
  const [catId, setCatId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; sent: number; errors: string[] } | null>(null);
  const [sentLog, setSentLog] = useState<SendLog[]>([]);
  const [schedule, setSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const filteredTemplates = catId
    ? templates.filter((t) => (t.templateListIds || []).includes(catId))
    : templates;

  useEffect(() => {
    if (selectedTemplate) {
      db.sendLog.where('templateId').equals(selectedTemplate.id!).toArray().then(setSentLog);
    } else {
      setSentLog([]);
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

  const toggleLead = (id: number) => {
    setSelectedLeadIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleList = (id: number) => {
    setSelectedListIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const filteredLeads = leadSearch
    ? leads.filter((l) => l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone.includes(leadSearch))
    : leads;

  const handleSend = async () => {
    if (!selectedTemplate || recipients.length === 0) return;
    const now = new Date().toISOString();

    if (schedule && scheduledDate && scheduledTime) {
      // Programar envío
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
    const res = await sendEmailToLeads(recipients, selectedTemplate.asunto, selectedTemplate.contenido, selectedTemplate.isHtml);
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
    <div>
      <div className="mb-3">
        <h3 className="text-xs font-medium text-gray-500 mb-1">1. Plantilla</h3>
        <select value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : null); setSelectedTemplate(null); }}
          className="w-full border rounded px-2 py-1 text-xs mb-1">
          <option value="">Todas las categorías</option>
          {templateLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div className="border rounded max-h-32 overflow-y-auto">
          {filteredTemplates.map((t) => (
            <button key={t.id} onClick={() => setSelectedTemplate(t)}
              className={`w-full text-left px-2 py-1.5 text-xs border-b last:border-0 ${selectedTemplate?.id === t.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}>
              {t.nombre || '(sin nombre)'} {t.isHtml && <span className="text-purple-500">HTML</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <h3 className="text-xs font-medium text-gray-500 mb-1">2. Destinatarios ({recipients.length})</h3>
        <details className="mb-1" open>
          <summary className="text-xs text-gray-500 cursor-pointer">Listas ({selectedListIds.size})</summary>
          <div className="flex flex-wrap gap-1 mt-1">
            {leadLists.map((list) => {
              const on = selectedListIds.has(list.id!);
              return (
                <button key={list.id} onClick={() => toggleList(list.id!)}
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${on ? 'text-white border-transparent' : 'text-gray-600 border-gray-300'}`}
                  style={on ? { backgroundColor: list.color } : {}}>
                  {list.name} ({leads.filter((l) => l.listaIds.includes(list.id!)).length})
                </button>
              );
            })}
          </div>
        </details>
        <details className="mb-1" open>
          <summary className="text-xs text-gray-500 cursor-pointer">Leads ({selectedLeadIds.size})</summary>
          <input type="text" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Buscar..." className="w-full border rounded px-2 py-1 text-xs mt-1 mb-1" />
          <div className="border rounded max-h-40 overflow-y-auto">
            {filteredLeads.slice(0, 50).map((lead) => (
              <label key={lead.id} className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 cursor-pointer border-b text-xs">
                <input type="checkbox" checked={selectedLeadIds.has(lead.id!)} onChange={() => toggleLead(lead.id!)} className="rounded" />
                <span className="flex-1 truncate">{lead.name}</span>
                <span className="text-gray-400">{lead.email || lead.phone}</span>
                {sentLeadIds.has(lead.id!) && <span className="text-green-500">✓</span>}
              </label>
            ))}
          </div>
        </details>
      </div>

      {selectedTemplate && recipients.length > 0 && (
        <div className="border rounded p-2 mb-3">
          <h3 className="text-xs font-medium text-gray-500 mb-1">3. Vista previa</h3>
          <select value={previewLead?.id ?? ''} onChange={(e) => setPreviewLead(leads.find((l) => l.id === Number(e.target.value)) || null)}
            className="w-full border rounded px-2 py-1 text-xs mb-1">
            <option value="">Elegir lead para previsualizar</option>
            {recipients.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {previewLead && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Asunto: {replaceVariables(selectedTemplate.asunto, previewLead)}</p>
              <div className="text-xs border rounded p-2 bg-gray-50 max-h-48 overflow-y-auto">
                {selectedTemplate.isHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: replaceVariables(selectedTemplate.contenido, previewLead) }} />
                ) : (
                  <p className="whitespace-pre-wrap">{replaceVariables(selectedTemplate.contenido, previewLead)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Programar envío */}
      <div className="mb-3">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="rounded" />
          Programar envío para después
        </label>
        {schedule && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              className="border rounded px-2 py-1 text-xs" />
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
              className="border rounded px-2 py-1 text-xs" />
          </div>
        )}
      </div>

      <button onClick={handleSend} disabled={!selectedTemplate || recipients.length === 0 || sending || (schedule && (!scheduledDate || !scheduledTime))}
        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {sending ? 'Enviando...' : schedule ? `Programar para ${recipients.length} lead(s)` : `Enviar a ${recipients.length} lead(s)`}
      </button>

      {result && (
        <div className={`mt-2 p-2 rounded text-xs ${result.errors.length ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          <div className="font-medium text-gray-800">{result.sent}/{result.total} enviados</div>
          {result.errors.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {result.errors.map((err, i) => (
                <div key={i} className="text-red-600 flex gap-1">
                  <span className="shrink-0 text-red-400">⚠</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sentLog.length > 0 && (
        <div className="mt-2 border rounded p-2 text-xs">
          <p className="font-medium text-gray-600 mb-1">Enviado anteriormente a:</p>
          <div className="max-h-24 overflow-y-auto space-y-0.5">
            {sentLog.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium">{l.leadName}</span>
                <span className="text-green-500">✓</span>
                <span className="text-gray-400">·</span>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2"
                  title="Ver plantilla"
                >
                  {selectedTemplate?.nombre || 'Plantilla'}
                </button>
                <span className="text-gray-400">via</span>
                <span title="Email" className="text-blue-600">{Icon.Email()}</span>
                <span className="text-gray-400 ml-auto">{new Date(l.sentAt).toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
