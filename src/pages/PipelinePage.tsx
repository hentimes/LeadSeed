import { useEffect, useState, useMemo, useRef } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useWhatsAppTemplates } from '../hooks/useTemplates';
import { useLists } from '../hooks/useLists';
import { useAuth } from '../contexts/AuthContext';
import type { Lead, LeadStatus, WhatsAppTemplate, LeadList } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { Icon } from '../utils/icons';
import { openWhatsAppForLeads } from '../utils/waHelper';
import LeadDetail from '../components/leads/LeadDetail';
import { createFollowUpTaskForLead } from '../services/tasksService';
import { Button } from '../design';
import { Card } from '../design';


export default function PipelinePage() {
  const { user } = useAuth();
  const { getAll: getLeads, save: saveLead, refreshKey: leadsRefreshKey } = useLeads();
  const { getAll: getWaTemplates } = useWhatsAppTemplates();
  const { getAll: getLists } = useLists();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<LeadStatus>('nuevo');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [taskPrompt, setTaskPrompt] = useState<{ leadId: string; leadName: string; lead: Lead | null; newStatus: LeadStatus } | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  
  const draggingRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedLeads = await getLeads();
      setLeads(fetchedLeads);
      const fetchedLists = await getLists();
      setLists(fetchedLists);
      const fetchedTemplates = await getWaTemplates();
      setWaTemplates(fetchedTemplates);
    };
    fetchData();
  }, [getLeads, getLists, getWaTemplates, leadsRefreshKey]);

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
    
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      // Guardar en Supabase
      await saveLead({ ...lead, status });
      
      if (status !== 'nuevo') {
        setTaskPrompt({ leadId: lead.id!, leadName: lead.name, lead, newStatus: status });
        setTaskTitle(`Seguimiento para ${lead.name}`);
        setTaskDate('');
        setTaskTime('');
      }
    }
  };

  const createTask = async () => {
    if (!taskPrompt || !taskTitle.trim() || !user) return;
    const dueDate = taskDate && taskTime
      ? new Date(`${taskDate}T${taskTime}:00`).toISOString()
      : null;

    await createFollowUpTaskForLead({
      userId: user.id,
      leadId: taskPrompt.leadId,
      leadName: taskPrompt.leadName,
      newStatus: taskPrompt.newStatus,
      title: taskTitle,
      dueDateIso: dueDate,
    });
    
    setTaskPrompt(null);
  };

  const totalInSearch = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  const renderNuevoTab = () => {
    const isDragOver = dragOver === 'nuevo';
    const isActive = activeTab === 'nuevo';
    const total = leads.filter((l) => (l.status || 'nuevo') === 'nuevo').length;
    return (
      <button
        onClick={() => setActiveTab('nuevo')}
        onDragOver={(e) => { e.preventDefault(); setDragOver('nuevo'); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => { e.preventDefault(); handleDrop('nuevo'); }}
        className={`flex-1 w-full py-1.5 px-2 rounded text-[10px] font-bold transition-all border ${
          isDragOver ? 'scale-105 z-10 opacity-100' : 
          isActive ? 'opacity-100 ring-2' : 'opacity-70 hover:opacity-100'
        }`}
        style={{
          backgroundColor: `${STATUS_COLORS['nuevo']}15`,
          borderColor: STATUS_COLORS['nuevo'],
          color: STATUS_COLORS['nuevo']
        }}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="uppercase tracking-wider">NUEVO</span>
          <span className="text-[10px] px-1.5 rounded bg-white dark:bg-slate-800/80 dark:backdrop-blur-md/70 text-slate-700 dark:text-slate-200 shadow-sm">{total}</span>
        </div>
      </button>
    );
  };

  const renderSquareCard = (s: LeadStatus) => {
    const isDragOver = dragOver === s;
    const isActive = activeTab === s;
    const items = grouped[s];
    return (
      <div
        key={s}
        onClick={() => setActiveTab(s)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(s); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => { e.preventDefault(); handleDrop(s); }}
        className={`card-standard flex flex-col border-2 transition-all cursor-pointer overflow-hidden h-[160px] sm:h-[180px] ${
          isDragOver ? 'scale-105 shadow-xl z-10' : 
          isActive ? 'shadow-md ring-2 ring-offset-2 dark:ring-offset-gray-900' : 'opacity-90 hover:opacity-100 hover:shadow-md'
        }`}
        style={{
          borderColor: STATUS_COLORS[s],
          backgroundColor: isActive || isDragOver ? `${STATUS_COLORS[s]}08` : undefined,
          boxShadow: isActive || isDragOver ? `0 0 0 2px ${STATUS_COLORS[s]}40` : undefined,
        }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ backgroundColor: `${STATUS_COLORS[s]}15`, borderColor: `${STATUS_COLORS[s]}30` }}>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</span>
          <span className="text-[10px] font-bold bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200 dark:text-gray-200 shadow-sm">{items.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {items.map((lead) => (
             <div 
               key={lead.id} 
               draggable
               onDragStart={(e) => {
                 e.stopPropagation();
                 handleDragStart(e, lead);
               }}
               onDragEnd={handleDragEnd}
               className="text-[10px] sm:text-[11px] truncate px-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white dark:bg-slate-800/80 dark:backdrop-blur-md/5 rounded text-slate-600 dark:text-slate-300 dark:text-gray-300 font-medium cursor-grab active:cursor-grabbing flex justify-between items-center group/item"
             >
               <span className="truncate">{lead.name}</span>
               <span className="text-[10px] text-gray-300 group-hover/item:text-slate-400 dark:text-slate-500 opacity-0 group-hover/item:opacity-100 font-mono tracking-tighter ml-1">|||</span>
             </div>
          ))}
          {items.length === 0 && (
             <div className="text-[10px] text-center text-gray-400 mt-6 flex flex-col items-center opacity-50">
               <div className="text-xl mb-1">{Icon.Pipeline()}</div>
               <span className="mt-1">Vacío</span>
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-6">


      <div className="flex gap-2 mb-3 w-full">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre, teléfono, email, RUT..."
            className="w-full border border-slate-300 dark:border-slate-600/50 rounded h-full px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {searchLower && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">{totalInSearch} encontrados</span>
          )}
        </div>
        <div className="w-1/4 min-w-[100px] flex">
          {renderNuevoTab()}
        </div>
      </div>

      <Card className="flex flex-col max-h-[250px] min-h-[150px] overflow-hidden mb-5">
        <div className="bg-slate-50 dark:bg-slate-900 dark:bg-gray-900 border-b border-slate-200 dark:border-slate-700/50 dark:border-gray-700 px-3 py-2 flex justify-between items-center shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-gray-300 flex items-center gap-2">
            Lista: <span style={{ color: STATUS_COLORS[activeTab] }}>{STATUS_LABELS[activeTab]}</span>
          </span>
          <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 dark:text-gray-300">
            {grouped[activeTab].length} items
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {grouped[activeTab].length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 flex flex-col items-center justify-center h-full">
               <span className="text-3xl mb-3 opacity-20">{Icon.Pipeline()}</span>
               <span>No hay leads aquí</span>
               <span className="text-xs mt-1 text-gray-300">Arrastra leads desde otras listas</span>
            </div>
          ) : (
            grouped[activeTab].map((lead) => (
              <div
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead)}
                onDragEnd={handleDragEnd}
                className="border-b border-gray-100 dark:border-gray-700 last:border-0 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-grab active:cursor-grabbing active:opacity-50 flex justify-between items-center transition-colors group"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-medium text-slate-700 dark:text-slate-200 dark:text-gray-200 text-xs group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{lead.name}</span>
                  {(lead.company || lead.phone || lead.email) && (
                    <span className="text-gray-400 text-[10px] truncate flex items-center gap-2">
                      {lead.company && <span className="flex items-center gap-1"><div className="w-3">{Icon.Messages()}</div> {lead.company}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><div className="w-3">{Icon.Phone()}</div> ...{lead.phone.slice(-4)}</span>}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setViewLead(lead)} className="text-gray-400 hover:text-blue-500 cursor-pointer p-1" title="Ver detalle" aria-label={`Ver detalle de ${lead.name}`}><div className="w-4">{Icon.View()}</div></button>
                  <span className="text-[10px] text-gray-400 font-mono tracking-tighter">|||</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {(['contactado', 'interesado', 'convertido', 'descartado'] as LeadStatus[]).map((s) => renderSquareCard(s))}
      </div>

      {taskPrompt && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg shadow-sm animate-scale-in">
          <p className="text-xs font-medium text-amber-800 mb-2">
            ¿Crear tarea de seguimiento para {taskPrompt.leadName}?
          </p>
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Título de la tarea"
            className="w-full border rounded px-2 py-1.5 text-xs mb-2 outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)}
              className="border rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-500" />
            <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)}
              className="border rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          {waTemplates.length > 0 && (
            <div className="flex gap-2 items-center mb-3">
              <select value={selectedTemplate ?? ''} onChange={(e) => setSelectedTemplate(e.target.value ? Number(e.target.value) : null)}
                className="border rounded px-2 py-1 text-xs flex-1 outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Enviar WhatsApp con plantilla...</option>
                {waTemplates.map((t: WhatsAppTemplate) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {selectedTemplate && taskPrompt?.lead && (
                <Button
                  variant="primary"
                  className="shrink-0"
                  onClick={() => { openWhatsAppForLeads([taskPrompt.lead!], waTemplates.find((t: WhatsAppTemplate) => t.id === selectedTemplate)?.contenido || ''); }}
                >
                  Enviar
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setTaskPrompt(null); setSelectedTemplate(null); }} className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 px-2 py-1.5">
              Omitir
            </button>
            <Button variant="primary" onClick={createTask}>
              Crear tarea
            </Button>
          </div>
        </div>
      )}

      {viewLead && (
        <LeadDetail 
          lead={viewLead} 
          lists={lists} 
          onClose={() => setViewLead(null)} 
          onEdit={() => { /* Solo lectura en pipeline */ }} 
        />
      )}
    </div>
  );
}
