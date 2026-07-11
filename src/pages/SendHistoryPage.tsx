import { useEffect, useState, useMemo } from 'react';
import { db } from '../db/database';
import type { SendLog, WhatsAppTemplate, EmailTemplate, LeadNote, Lead } from '../types';
import type { Page } from '../types';
import { Icon } from '../utils/icons';

type EnrichedLog = SendLog & {
  templateNombre: string;
  templateContenido: string;
  isHtml: boolean;
};

type ActivityItem = {
  type: 'send' | 'note';
  text: string;
  time: string;
  leadName?: string;
};

interface Props {
  onNavigate: (page: Page) => void;
  onViewTemplate: (type: 'whatsapp' | 'email' | 'call', id: number) => void;
}

const PAGE_SIZE = 8;

export default function SendHistoryPage({ onNavigate, onViewTemplate }: Props) {
  const [logs, setLogs] = useState<EnrichedLog[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'todos' | 'whatsapp' | 'email'>('todos');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'envios' | 'actividad'>('envios');
  const [page, setPage] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [rawLogs, waTemplates, emailTemplates, notes, leads] = await Promise.all([
      db.sendLog.orderBy('sentAt').reverse().toArray(),
      db.whatsappTemplates.toArray(),
      db.emailTemplates.toArray(),
      db.leadNotes.orderBy('createdAt').reverse().toArray(),
      db.leads.toArray(),
    ]);

    const waMap = new Map<number, WhatsAppTemplate>();
    for (const t of waTemplates) waMap.set(t.id!, t);
    const emailMap = new Map<number, EmailTemplate>();
    for (const t of emailTemplates) emailMap.set(t.id!, t);

    const enriched: EnrichedLog[] = rawLogs.map((log) => {
      if (log.templateType === 'whatsapp') {
        const t = waMap.get(log.templateId);
        return { ...log, templateNombre: t?.nombre || '(plantilla eliminada)', templateContenido: t?.contenido || '', isHtml: false };
      }
      const t = emailMap.get(log.templateId);
      return { ...log, templateNombre: t?.nombre || '(plantilla eliminada)', templateContenido: t?.contenido || '', isHtml: t?.isHtml || false };
    });
    setLogs(enriched);

    // Actividad combinada
    const act: ActivityItem[] = [];
    for (const log of rawLogs.slice(0, 50)) {
      act.push({ type: 'send', text: `Mensaje enviado a ${log.leadName}`, time: log.sentAt, leadName: log.leadName });
    }
    for (const note of notes.slice(0, 50)) {
      const lead = leads.find((l) => l.id === note.leadId);
      act.push({ type: 'note', text: `Nota${lead ? ` en ${lead.name}` : ''}`, time: note.createdAt, leadName: lead?.name });
    }
    act.sort((a, b) => b.time.localeCompare(a.time));
    setActivity(act);
  };

  const searchLower = search.toLowerCase().trim();

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (filter !== 'todos') result = result.filter((l) => l.templateType === filter);
    if (searchLower) {
      result = result.filter((l) =>
        (l.leadName || '').toLowerCase().includes(searchLower) ||
        (l.leadPhone || '').includes(searchLower) ||
        (l.templateNombre || '').toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [logs, filter, searchLower]);

  const filteredActivity = useMemo(() => {
    if (!searchLower) return activity;
    return activity.filter((a) =>
      (a.leadName || '').toLowerCase().includes(searchLower) ||
      (a.text || '').toLowerCase().includes(searchLower)
    );
  }, [activity, searchLower]);

  const pagedLogs = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedActivity = filteredActivity.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil((tab === 'envios' ? filteredLogs.length : filteredActivity.length) / PAGE_SIZE));

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Historial</h2>

      {/* Search + tabs */}
      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Buscar lead, plantilla, email..." className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm w-44" />
        <div className="flex gap-0 border rounded overflow-hidden">
          <button onClick={() => { setTab('envios'); setPage(0); }} className={`px-3 py-1.5 text-xs font-medium ${tab === 'envios' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600'}`}>Envíos ({filteredLogs.length})</button>
          <button onClick={() => { setTab('actividad'); setPage(0); }} className={`px-3 py-1.5 text-xs font-medium ${tab === 'actividad' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600'}`}>Actividad ({filteredActivity.length})</button>
        </div>
        {tab === 'envios' && (
          <select value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(0); }}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs">
            <option value="todos">Todos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        )}
      </div>

      {/* Content */}
      {tab === 'envios' ? (
        <div className="border rounded-lg overflow-hidden dark:border-gray-700">
          {filteredLogs.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-gray-400">No hay envíos.</p>
          ) : (
            pagedLogs.map((log) => (
              <div key={log.id} className={`border-b last:border-0 dark:border-gray-700 ${expandedId === log.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <div className="px-3 py-1.5 text-xs flex items-center gap-2">
                  {log.templateType === 'whatsapp' && <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"><Icon.Messages /> WP</span>}
                  {log.templateType === 'email' && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"><Icon.Email /> EM</span>}
                  {log.templateType === 'call' && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"><Icon.Phone /> LLAMADA</span>}
                  <span className="font-medium truncate">{log.leadName}</span>
                  <span className="text-gray-400 truncate hidden sm:inline">{log.leadPhone}</span>
                  <span className="text-gray-400">·</span>
                  <button onClick={() => { if (log.templateContenido) onViewTemplate(log.templateType as 'whatsapp' | 'email' | 'call', log.templateId); }}
                    className={`${log.templateContenido ? 'text-blue-600 hover:text-blue-800 underline' : 'text-gray-400 cursor-default'}`}>
                    {log.templateNombre}
                  </button>
                  <span className="text-gray-400 ml-auto shrink-0">{new Date(log.sentAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  {log.scheduledFor && <span className="text-amber-500 text-[10px] shrink-0">Prog.</span>}
                  {log.templateContenido && (
                    <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id!)} className="text-gray-400 hover:text-blue-600 shrink-0 ml-1">
                      {expandedId === log.id ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {expandedId === log.id && log.templateContenido && (
                  <div className="px-3 pb-2 text-xs border-t dark:border-gray-700 bg-white dark:bg-gray-900 max-h-40 overflow-y-auto">
                    {log.isHtml ? <div dangerouslySetInnerHTML={{ __html: log.templateContenido }} /> : <div className="whitespace-pre-wrap">{log.templateContenido}</div>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden dark:border-gray-700">
          {filteredActivity.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-gray-400">No hay actividad.</p>
          ) : (
            pagedActivity.map((a, i) => (
              <div key={i} className="px-3 py-1.5 text-xs flex items-center gap-2 border-b last:border-0 dark:border-gray-700">
                <span className={a.type === 'send' ? 'text-green-500' : 'text-blue-500'}>{a.type === 'send' ? 'WA/@' : 'N'}</span>
                <span className="text-gray-600 dark:text-gray-400 truncate">{a.text}</span>
                <span className="text-gray-400 ml-auto shrink-0">{new Date(a.time).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="px-2 py-1 text-xs border rounded disabled:opacity-30 dark:border-gray-600">{'‹'}</button>
          <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="px-2 py-1 text-xs border rounded disabled:opacity-30 dark:border-gray-600">{'›'}</button>
        </div>
      )}
    </div>
  );
}
