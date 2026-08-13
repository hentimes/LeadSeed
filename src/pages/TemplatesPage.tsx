import { useEffect, useState } from 'react';
import {
  useWhatsAppTemplates, useWhatsAppTemplateLists,
  useEmailTemplates, useEmailTemplateLists,
  useCallTemplates, useCallTemplateLists,
} from '../hooks/useTemplates';
import type { SendLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import TemplateEditor from '../components/templates/TemplateEditor';
import { fetchSendLogsForTemplate } from '../services/historyService';
import WhatsAppClientToggle from '../components/settings/WhatsAppClientToggle';
import { Icon } from '../utils/icons';
import { Button } from '../design';

type Tab = 'whatsapp' | 'email' | 'call';

const COLORS = [
  { name: 'Azul', value: '#3B82F6' }, { name: 'Rojo', value: '#EF4444' },
  { name: 'Verde', value: '#10B981' }, { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' }, { name: 'Rosa', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' }, { name: 'Naranja', value: '#F97316' },
];

interface Props {
  highlightTemplate?: { type: 'whatsapp' | 'email' | 'call'; id: number } | null;
  onClearHighlight?: () => void;
}

export default function TemplatesPage({ highlightTemplate }: Props = {}) {
  const { hasFeature } = useAuth();
  const [tab, setTab] = useState<Tab>(highlightTemplate?.type || 'whatsapp');
  const waT = useWhatsAppTemplates(); const waL = useWhatsAppTemplateLists();
  const emT = useEmailTemplates(); const emL = useEmailTemplateLists();
  const caT = useCallTemplates(); const caL = useCallTemplateLists();

  const [templates, setTemplates] = useState<any[]>([]);
  const [tplLists, setTplLists] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showLog, setShowLog] = useState<number | null>(null); // templateId to show log
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);

  // Category form
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(COLORS[0].value);

  // View filters
  const [filterCatId, setFilterCatId] = useState<number | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);

  const load = async () => {
    if (tab === 'whatsapp') {
      setTemplates(await waT.getAll());
      setTplLists(await waL.getAll());
    } else if (tab === 'email') {
      setTemplates(await emT.getAll());
      setTplLists(await emL.getAll());
    } else {
      setTemplates(await caT.getAll());
      setTplLists(await caL.getAll());
    }
  };

  useEffect(() => { load(); setEditing(null); setSelectedIds(new Set()); setShowLog(null); }, [tab]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (tab === 'whatsapp') await waL.save({ name: catName.trim(), color: catColor, createdAt: '' });
    else if (tab === 'email') await emL.save({ name: catName.trim(), color: catColor, createdAt: '' });
    else await caL.save({ name: catName.trim(), color: catColor, createdAt: '' });
    setCatName(''); load();
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    if (tab === 'whatsapp') await waL.remove(id); 
    else if (tab === 'email') await emL.remove(id);
    else await caL.remove(id);
    if (filterCatId === id) setFilterCatId(null);
    load();
  };

  const handleSave = async (data: { id?: number; nombre: string; contenido: string; asunto?: string; isHtml?: boolean; templateListIds?: number[] }) => {
    if (saving) return; // prevent double submit
    setSaving(true);
    const existing = templates.find((t) => t.id === data.id);
    const base = { 
      ...data, 
      templateListIds: data.templateListIds || existing?.templateListIds || [], 
      leadIds: existing?.leadIds || [], 
      leadListIds: existing?.leadListIds || [], 
      createdAt: existing?.createdAt || '' 
    };
    if (tab === 'whatsapp') await waT.save(base);
    else if (tab === 'email') await emT.save({ ...base, isHtml: data.isHtml || false } as any);
    else await caT.save(base);
    setEditing(null); setSaving(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    if (tab === 'whatsapp') await waT.remove(id); 
    else if (tab === 'email') await emT.remove(id);
    else await caT.remove(id);
    if (editing?.id === id) setEditing(null);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    load();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} plantillas?`)) return;
    for (const id of selectedIds) {
      if (tab === 'whatsapp') await waT.remove(id); 
      else if (tab === 'email') await emT.remove(id);
      else await caT.remove(id);
    }
    setSelectedIds(new Set());
    load();
  };

  const toggleSel = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };


  const handleShowLog = async (templateId: number) => {
    if (showLog === templateId) { setShowLog(null); return; }
    setShowLog(templateId);
    setSendLogs(await fetchSendLogsForTemplate(templateId));
  };

  const filtered = filterCatId ? templates.filter((t) => (t.templateListIds || []).includes(filterCatId)) : templates;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex gap-1">
          <button onClick={() => setTab('whatsapp')} className={`px-2 py-1 rounded text-xs font-medium ${tab === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>WhatsApp</button>
          <button onClick={() => setTab('email')} className={`px-2 py-1 rounded text-xs font-medium ${tab === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Email</button>
          <button onClick={() => setTab('call')} className={`px-2 py-1 rounded text-xs font-medium ${tab === 'call' ? 'bg-amber-500 text-white' : 'bg-gray-200'}`}>Llamadas</button>
        </div>
      </div>

      {tab === 'whatsapp' && (
        <div className="mb-6">
          <WhatsAppClientToggle />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Button
          variant="primary"
          onClick={() => {
            if (templates.length >= 3 && !hasFeature('pro:unlimited_templates')) {
              alert(`Limite alcanzado: el Plan Free solo permite crear 3 plantillas de ${tab}. Actualiza al Plan Pro para crear plantillas ilimitadas.`);
              return;
            }
            setEditing({ nombre: '', contenido: '', asunto: '', isHtml: false });
          }}
        >
          + Nueva plantilla
        </Button>

        {/* Category filter */}
        <select value={filterCatId ?? ''} onChange={(e) => setFilterCatId(e.target.value ? Number(e.target.value) : null)}
          className="border border-slate-200 rounded-[6px] px-3 py-1.5 text-[13px] outline-none bg-white">
          <option value="">Todas las categorías</option>
          {tplLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <Button
          variant={showCatManager ? 'primary' : 'secondary'}
          aria-expanded={showCatManager}
          onClick={() => setShowCatManager(!showCatManager)}
        >
          Gestionar categorías
        </Button>

        {selectedIds.size > 0 && (
          <Button variant="danger" onClick={handleBulkDelete}>
            Eliminar ({selectedIds.size})
          </Button>
        )}

        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{templates.length} plantillas</span>
      </div>

      {/* Category manager */}
      {showCatManager && (
        <div className="card-standard p-4 mb-4 bg-slate-50">
          <h3 className="text-[14px] font-semibold text-slate-800 mb-3">Categorías</h3>
          <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
            <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
              placeholder="Nueva categoría" className="flex-1 border border-slate-200 rounded-[6px] px-3 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary" required />
            <select value={catColor} onChange={(e) => setCatColor(e.target.value)} className="border border-slate-200 rounded-[6px] px-3 py-1.5 text-[13px] outline-none">
              {COLORS.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
            <Button type="submit" variant="primary">Crear</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {tplLists.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[13px] border bg-white" style={{ borderColor: l.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
                <button onClick={() => handleDeleteCategory(l.id!)} className="text-slate-400 hover:text-red-500 ml-1 transition-colors"><Icon.Trash /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Template editor */}
      {editing && (
        <div className="card-standard p-5 mb-4">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-[16px] font-semibold text-slate-800">{editing.id ? 'Editar' : 'Nueva'} Plantilla</h3>
            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><Icon.Close /></button>
          </div>

          <TemplateEditor template={editing} type={tab} categories={tplLists} onSave={handleSave} onCancel={() => setEditing(null)} />
        </div>
      )}

      {/* Templates list */}
      <div className="grid gap-3">
        {filtered.map((t) => (
          <div key={t.id}>
            <div className={`card-standard p-4 flex items-start gap-3 transition-colors ${selectedIds.has(t.id!) ? 'border-primary bg-primary-soft/30' : 'hover:border-slate-300'}`}>
              <input type="checkbox" checked={selectedIds.has(t.id!)} onChange={() => toggleSel(t.id!)} className="rounded mt-1 border-slate-300 text-primary focus:ring-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <button onClick={() => { setEditing(t); }} className="text-left flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-slate-800 truncate mb-1">{t.nombre || '(sin nombre)'}</div>
                    <div className="text-[13px] text-slate-500 truncate">{t.contenido?.substring(0, 80) || '...'}</div>
                  </button>
                  <button onClick={() => handleDelete(t.id!)} className="text-slate-400 hover:text-red-500 transition-colors ml-2 shrink-0 p-1"><Icon.Trash /></button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(t.templateListIds || []).map((lid: number) => {
                    const cat = tplLists.find((c: any) => c.id === lid);
                    return cat ? (
                      <span key={lid} className="px-1 py-0 rounded text-xs text-white" style={{ backgroundColor: cat.color }}>{cat.name}</span>
                    ) : null;
                  })}
                  <button onClick={() => handleShowLog(t.id!)}
                    className="text-xs text-gray-400 hover:text-blue-600 ml-auto">
                    {showLog === t.id ? 'Ocultar log' : 'Ver envíos'}
                  </button>
                </div>
              </div>
            </div>

            {/* Send log for this template */}
            {showLog === t.id && (
              <div className="ml-6 border rounded p-2 mb-1 bg-slate-50 dark:bg-slate-900 text-xs">
                <h4 className="font-medium text-slate-500 dark:text-slate-400 mb-1">Historial de envíos</h4>
                {sendLogs.length === 0 ? (
                  <p className="text-gray-400">No se ha enviado este mensaje aún.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {sendLogs.map((log) => (
                      <div key={log.id} className="flex justify-between text-xs border-b py-0.5">
                        <span>{log.leadName} <span className="text-gray-400">{log.leadPhone}</span></span>
                        <span className="text-gray-400">{new Date(log.sentAt).toLocaleString('es-CL')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No hay plantillas. Crea la primera con "+ Nueva plantilla".</p>
        )}
      </div>
    </div>
  );
}
