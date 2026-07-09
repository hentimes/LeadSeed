import { useEffect, useState, useMemo, useRef } from 'react';
import { db } from '../db/database';
import type { Lead, LeadStatus, WhatsAppTemplate } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { Icon } from '../utils/icons';
import { openWhatsAppForLeads } from '../utils/waHelper';

const STATUS_ORDER: LeadStatus[] = ['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(STATUS_ORDER));
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [taskPrompt, setTaskPrompt] = useState<{ leadId: number; leadName: string; lead: Lead | null; newStatus: LeadStatus } | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const draggingRef = useRef<number | null>(null);

  useEffect(() => { loadLeads(); loadTemplates(); }, []);

  const loadTemplates = async () => {
    setTemplates(await db.whatsappTemplates.toArray());
  };

  const loadLeads = async () => {
    setLeads(await db.leads.toArray());
  };

  const searchLower = search.toLowerCase().trim();

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = { nuevo: [], contactado: [], interesado: [], convertido: [], descartado: [] };
    for (const l of leads) {
      if (searchLower) {
        const match = l.name.toLowerCase().includes(searchLower) ||
          (l.company || '').toLowerCase().includes(searchLower) ||
          (l.phone || '').includes(searchLower) ||
          (l.email || '').toLowerCase().includes(searchLower) ||
          (l.rut || '').toLowerCase().includes(searchLower);
        if (!match) continue;
      }
      const s = (l.status || 'nuevo') as LeadStatus;
      map[s].push(l);
    }
    return map;
  }, [leads, searchLower]);

  const handleDragStart = (_e: React.DragEvent, lead: Lead) => {
    draggingRef.current = lead.id!;
  };

  const handleDragEnd = () => {
    draggingRef.current = null;
  };

  const handleDrop = async (status: LeadStatus) => {
    setDragOver(null);
    const leadId = draggingRef.current;
    if (leadId == null) return;
    draggingRef.current = null;
    await db.leads.update(leadId, { status });
    const lead = leads.find((l) => l.id === leadId);
    if (lead && status !== 'nuevo') {
      setTaskPrompt({ leadId: lead.id!, leadName: lead.name, lead, newStatus: status });
      setTaskTitle(`Seguimiento para ${lead.name}`);
      setTaskDate('');
      setTaskTime('');
    }
    loadLeads();
  };

  const createTask = async () => {
    if (!taskPrompt || !taskTitle.trim()) return;
    const dueDate = taskDate && taskTime
      ? new Date(`${taskDate}T${taskTime}:00`).toISOString()
      : '';
    await db.tasks.add({
      titulo: taskTitle.trim(),
      descripcion: `Lead: ${taskPrompt.leadName} (${STATUS_LABELS[taskPrompt.newStatus]})`,
      leadIds: [taskPrompt.leadId],
      leadListIds: [],
      fechaVencimiento: dueDate,
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    });
    setTaskPrompt(null);
  };

  const toggleStatus = (s: LeadStatus) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const totalInSearch = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Pipeline</h2>

      {taskPrompt && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-medium text-amber-800 mb-2">
            ¿Crear tarea de seguimiento para {taskPrompt.leadName}?
          </p>
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Título de la tarea"
            className="w-full border rounded px-2 py-1.5 text-xs mb-2"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)}
              className="border rounded px-2 py-1 text-xs" />
            <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)}
              className="border rounded px-2 py-1 text-xs" />
          </div>
          {templates.length > 0 && (
            <div className="flex gap-2 items-center mb-2">
              <select value={selectedTemplate ?? ''} onChange={(e) => setSelectedTemplate(e.target.value ? Number(e.target.value) : null)}
                className="border rounded px-2 py-1 text-xs flex-1">
                <option value="">Enviar WhatsApp con plantilla...</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {selectedTemplate && taskPrompt?.lead && (
                <button onClick={() => { openWhatsAppForLeads([taskPrompt.lead!], templates.find((t) => t.id === selectedTemplate)?.contenido || ''); }}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700 shrink-0">
                  Enviar
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={createTask} className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-amber-700">
              Crear tarea
            </button>
            <button onClick={() => { setTaskPrompt(null); setSelectedTemplate(null); }} className="text-xs text-gray-500 hover:text-gray-700">
              Omitir
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar nombre, teléfono, email, RUT..."
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-blue-500"
      />
      {searchLower && (
        <p className="text-xs text-gray-500 -mt-2 mb-3">{totalInSearch} encontrados</p>
      )}

      <div className="space-y-2">
        {STATUS_ORDER.map((s) => {
          const items = grouped[s];
          const isOpen = expanded.has(s);
          const total = leads.filter((l) => (l.status || 'nuevo') === s).length;
          const percentage = leads.length ? Math.round((total / leads.length) * 100) : 0;
          return (
            <div
              key={s}
              className={`border rounded-lg overflow-hidden ${dragOver === s ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-200'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(s); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); handleDrop(s); }}
            >
              <button
                onClick={() => toggleStatus(s)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
              >
                <span className="text-xs">{isOpen ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
                <span className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: STATUS_COLORS[s] }}>
                  {STATUS_LABELS[s]}
                </span>
                <span className="text-xs text-gray-500">
                  {searchLower ? `${items.length}/${total}` : total} lead{total !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-300 ml-auto">{percentage}%</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 max-h-80 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-gray-400">
                      {searchLower ? 'Sin resultados' : 'Soltá leads aquí'}
                    </p>
                  ) : (
                    items.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onDragEnd={handleDragEnd}
                        className="border-t border-gray-100 px-3 py-2 hover:bg-blue-50 cursor-grab active:cursor-grabbing active:opacity-50 text-xs flex justify-between items-center transition-colors"
                      >
                        <span className="font-medium truncate">{lead.name}</span>
                        <span className="text-gray-400 shrink-0 ml-2 text-[10px]">{lead.company || lead.phone}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
