import { useState, useMemo, useEffect } from 'react';
import type { Lead, WhatsAppTemplate, WhatsAppTemplateList, LeadList, SendLog } from '../types';
import { replaceVariables, openWhatsAppForLeads } from '../utils/waHelper';
import { db } from '../db/database';
import { Icon } from '../utils/icons';

interface Props {
  leads: Lead[];
  templates: WhatsAppTemplate[];
  templateLists: WhatsAppTemplateList[];
  leadLists: LeadList[];
}

export default function WhatsAppSender({ leads, templates, templateLists, leadLists }: Props) {
  const [catId, setCatId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [sentLog, setSentLog] = useState<SendLog[]>([]);

  const filteredTemplates = catId
    ? templates.filter((t) => (t.templateListIds || []).includes(catId))
    : templates;

  // Load sent log when template changes
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
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleList = (id: number) => {
    setSelectedListIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredLeads = leadSearch
    ? leads.filter((l) => l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone.includes(leadSearch))
    : leads;

  const handleSend = async () => {
    if (!selectedTemplate || recipients.length === 0) return;
    // Log sends
    const now = new Date().toISOString();
    const logs = recipients.map((l) => ({
      templateId: selectedTemplate.id!,
      templateType: 'whatsapp' as const,
      leadId: l.id!,
      leadName: l.name,
      leadPhone: l.phone,
      sentAt: now,
    }));
    await db.sendLog.bulkAdd(logs);
    // Marcar leads como contactados
    for (const l of recipients) {
      await db.leads.update(l.id!, { status: 'contactado' });
    }
    // Reload log
    const updated = await db.sendLog.where('templateId').equals(selectedTemplate.id!).toArray();
    setSentLog(updated);
    // Open WhatsApp
    openWhatsAppForLeads(recipients, selectedTemplate.contenido);
  };

  return (
    <div>
      {/* Template */}
      <div className="mb-3">
        <h3 className="text-xs font-medium text-gray-500 mb-1">1. Plantilla</h3>
        <div className="flex gap-1 mb-1">
          <select value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : null); setSelectedTemplate(null); }}
            className="border rounded px-2 py-1 text-xs flex-1">
            <option value="">Todas las categorías</option>
            {templateLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="border rounded max-h-32 overflow-y-auto">
          {filteredTemplates.map((t) => (
            <button key={t.id} onClick={() => setSelectedTemplate(t)}
              className={`w-full text-left px-2 py-1.5 text-xs border-b last:border-0 ${selectedTemplate?.id === t.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}>
              {t.nombre || '(sin nombre)'}
            </button>
          ))}
        </div>
      </div>

      {/* Recipients */}
      <div className="mb-3">
        <h3 className="text-xs font-medium text-gray-500 mb-1">2. Destinatarios ({recipients.length})</h3>
        <details className="mb-1" open>
          <summary className="text-xs text-gray-500 cursor-pointer">Listas ({selectedListIds.size} seleccionadas)</summary>
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
          <summary className="text-xs text-gray-500 cursor-pointer">Leads ({selectedLeadIds.size} seleccionados)</summary>
          <input type="text" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Buscar lead..." className="w-full border rounded px-2 py-1 text-xs mt-1 mb-1" />
          <div className="border rounded max-h-40 overflow-y-auto">
            {filteredLeads.slice(0, 50).map((lead) => (
              <label key={lead.id} className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 cursor-pointer border-b text-xs">
                <input type="checkbox" checked={selectedLeadIds.has(lead.id!)} onChange={() => toggleLead(lead.id!)}
                  className="rounded" />
                <span className="flex-1 truncate">{lead.name}</span>
                <span className="text-gray-400">{lead.phone}</span>
                {sentLeadIds.has(lead.id!) && <span className="text-green-500 text-xs">✓</span>}
              </label>
            ))}
          </div>
        </details>
      </div>

      {/* Preview */}
      {selectedTemplate && recipients.length > 0 && (
        <div className="border rounded p-2 mb-3">
          <h3 className="text-xs font-medium text-gray-500 mb-1">3. Vista previa</h3>
          <select value={previewLead?.id ?? ''} onChange={(e) => setPreviewLead(leads.find((l) => l.id === Number(e.target.value)) || null)}
            className="w-full border rounded px-2 py-1 text-xs mb-1">
            <option value="">Elegir lead para previsualizar</option>
            {recipients.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {previewLead && (
            <div className="bg-[#efeae2] p-2 rounded">
              <div className="bg-white rounded-lg p-2 shadow-sm inline-block max-w-[85%] text-xs whitespace-pre-wrap">
                {replaceVariables(selectedTemplate.contenido, previewLead)}
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={handleSend} disabled={!selectedTemplate || recipients.length === 0}
        className="w-full bg-green-600 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
        Abrir WhatsApp para {recipients.length} lead(s)
      </button>

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
                  onClick={() => setSelectedTemplate(selectedTemplate)}
                  className="text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2"
                  title="Ver plantilla"
                >
                  {selectedTemplate?.nombre || 'Plantilla'}
                </button>
                <span className="text-gray-400">via</span>
                <span title="WhatsApp" className="text-green-600">{Icon.Send()}</span>
                <span className="text-gray-400 ml-auto">{new Date(l.sentAt).toLocaleString('es-CL')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
