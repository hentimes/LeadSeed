import { useEffect, useState } from 'react';
import {
  useWhatsAppTemplates, useWhatsAppTemplateLists,
  useEmailTemplates, useEmailTemplateLists,
  useCallTemplates, useCallTemplateLists,
} from '../hooks/useTemplates';
import type { SendLog } from '../types';
import type { AnyTemplate, AnyTemplateList, EditableTemplate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import TemplateEditor from '../components/templates/TemplateEditor';
import { fetchSendLogsForTemplate } from '../services/historyService';
import WhatsAppClientToggle from '../components/settings/WhatsAppClientToggle';
import { Icon } from '../utils/icons';
import { Button } from '../design';
import { useMessageReasons } from '../hooks/useMessageReasons';
import {
  isDuplicateReason,
  normalizeReasonText,
  MAX_REASON_LENGTH,
  type MessageReason,
} from '../services/messageReasonsService';

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
  const motivos = useMessageReasons();

  // Los tres canales comparten la forma de WhatsAppTemplate; lo que cambia es
  // de que hook vienen, no el tipo.
  const [templates, setTemplates] = useState<AnyTemplate[]>([]);
  const [tplLists, setTplLists] = useState<AnyTemplateList[]>([]);
  const [editing, setEditing] = useState<EditableTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showLog, setShowLog] = useState<number | null>(null); // templateId to show log
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);

  // Category form
  const [catName, setCatName] = useState('');
  // COLORS es una constante de este archivo y nunca esta vacia; el respaldo
  // existe para no depender de eso desde otro punto del codigo.
  const [catColor, setCatColor] = useState(COLORS[0]?.value ?? '#3B82F6');

  // View filters
  const [filterCatId, setFilterCatId] = useState<number | null>(null);
  const [showCatManager, setShowCatManager] = useState(false);

  // Catalogo de motivos: alimenta la variable {motivo} de las plantillas. Se
  // administra aqui y no en Ajustes porque es contenido de mensajes, no una
  // preferencia de la cuenta.
  const [showReasonManager, setShowReasonManager] = useState(false);
  const [reasons, setReasons] = useState<MessageReason[]>([]);
  const [reasonText, setReasonText] = useState('');
  const [reasonError, setReasonError] = useState('');

  const loadReasons = async () => setReasons(await motivos.getAll());

  const handleCreateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = normalizeReasonText(reasonText);
    if (text === null) {
      setReasonError(`Escribe un motivo de hasta ${MAX_REASON_LENGTH} caracteres.`);
      return;
    }
    if (isDuplicateReason(text, reasons)) {
      setReasonError('Ese motivo ya esta en la lista.');
      return;
    }
    setReasonError('');
    await motivos.save({ text, createdAt: '' });
    setReasonText('');
    await loadReasons();
  };

  const handleDeleteReason = async (id: number) => {
    // Las plantillas que lo tuvieran como valor por defecto lo pierden, pero no
    // se rompen: la columna es `on delete set null`.
    if (!confirm('¿Eliminar este motivo? Las plantillas que lo usaran por defecto quedaran sin motivo.')) return;
    await motivos.remove(id);
    await loadReasons();
  };

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

  // Los motivos no dependen de la pestaña: el catalogo es uno solo para los tres
  // canales. Se recarga cuando cambian desde otra pestaña del navegador.
  useEffect(() => { loadReasons(); }, [motivos.refreshKey]);

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

  const handleSave = async (data: { id?: number; nombre: string; contenido: string; asunto?: string; isHtml?: boolean; templateListIds?: number[]; defaultReasonId?: number | null }) => {
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

  /**
   * El id de una plantilla es `string | number` en el tipo porque asi lo
   * declara el dominio, pero la seleccion y el editor trabajan con numeros.
   * Se convierte en un solo sitio en vez de repartir `as number` por el JSX.
   */
  const idNumerico = (t: AnyTemplate): number | null => {
    if (typeof t.id === 'number') return t.id;
    if (typeof t.id === 'string' && t.id.trim() !== '') {
      const n = Number(t.id);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  /** Recorta una plantilla a lo que el editor necesita. */
  const aEditable = (t: AnyTemplate): EditableTemplate => ({
    ...(idNumerico(t) !== null ? { id: idNumerico(t) as number } : {}),
    nombre: t.nombre,
    contenido: t.contenido,
    ...('asunto' in t ? { asunto: t.asunto } : {}),
    ...('isHtml' in t ? { isHtml: t.isHtml } : {}),
    templateListIds: t.templateListIds,
  });

  /** Solo las categorias ya guardadas: sin id no hay nada a que asociar. */
  const categoriasConId = tplLists.flatMap((l) =>
    typeof l.id === 'number' ? [{ id: l.id, name: l.name, color: l.color }] : [],
  );

  const toggleSel = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
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
          className="border border-line rounded-[6px] px-3 py-1.5 text-[13px] outline-none bg-surface">
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

        <Button
          variant={showReasonManager ? 'primary' : 'secondary'}
          aria-expanded={showReasonManager}
          onClick={() => setShowReasonManager(!showReasonManager)}
        >
          Gestionar motivos
        </Button>

        {selectedIds.size > 0 && (
          <Button variant="danger" onClick={handleBulkDelete}>
            Eliminar ({selectedIds.size})
          </Button>
        )}

        <span className="text-xs text-ink-muted ml-auto">{templates.length} plantillas</span>
      </div>

      {/* Category manager */}
      {showCatManager && (
        <div className="card-standard p-4 mb-4 bg-surface-muted">
          <h3 className="text-[14px] font-semibold text-ink mb-3">Categorías</h3>
          <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
            <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
              placeholder="Nueva categoría" className="flex-1 border border-line rounded-[6px] px-3 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary" required />
            <select value={catColor} onChange={(e) => setCatColor(e.target.value)} className="border border-line rounded-[6px] px-3 py-1.5 text-[13px] outline-none">
              {COLORS.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
            <Button type="submit" variant="primary">Crear</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {tplLists.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[13px] border bg-surface" style={{ borderColor: l.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.name}
                <button onClick={() => handleDeleteCategory(l.id!)} className="text-ink-muted hover:text-red-500 ml-1 transition-colors"><Icon.Trash /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {showReasonManager && (
        <div className="card-standard p-4 mb-4 bg-surface-muted">
          <h3 className="text-[14px] font-semibold text-ink mb-1">Motivos del mensaje</h3>
          <p className="text-[12px] text-ink-secondary mb-3">
            Sustituyen a <code className="font-mono">{'{motivo}'}</code> en tus plantillas. Eliges cual
            usar en cada envio.
          </p>
          <form onSubmit={handleCreateReason} className="flex gap-2 mb-2">
            <input
              type="text"
              value={reasonText}
              onChange={(e) => { setReasonText(e.target.value); setReasonError(''); }}
              placeholder="vi que tu empresa tiene convenio"
              maxLength={MAX_REASON_LENGTH}
              className="flex-1 border border-line rounded-[6px] px-3 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
            <Button type="submit" variant="primary">Crear</Button>
          </form>
          {reasonError && (
            <p role="alert" className="text-[12px] text-state-danger mb-2">{reasonError}</p>
          )}
          {reasons.length === 0 ? (
            <p className="text-[12px] text-ink-muted">
              Todavia no hay motivos. Crea el primero y apareceran al escribir y al enviar.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {reasons.map((reason) => (
                <li
                  key={reason.id}
                  className="flex items-center gap-2 rounded-[6px] border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink"
                >
                  <span className="flex-1">{reason.text}</span>
                  <button
                    onClick={() => handleDeleteReason(reason.id!)}
                    className="text-ink-muted hover:text-state-danger transition-colors"
                    aria-label={`Eliminar el motivo ${reason.text}`}
                  >
                    <Icon.Trash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Template editor */}
      {editing && (
        <div className="card-standard p-5 mb-4">
          <div className="flex justify-between items-center mb-4 border-b border-line pb-3">
            <h3 className="text-[16px] font-semibold text-ink">{editing.id ? 'Editar' : 'Nueva'} Plantilla</h3>
            <button onClick={() => setEditing(null)} className="text-ink-muted hover:text-ink-secondary transition-colors"><Icon.Close /></button>
          </div>

          <TemplateEditor
            template={editing}
            type={tab}
            categories={categoriasConId}
            reasons={reasons.filter((r): r is MessageReason & { id: number } => r.id != null)}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* Templates list */}
      <div className="grid gap-3">
        {filtered.map((t) => (
          <div key={t.id}>
            <div className={`card-standard p-4 flex items-start gap-3 transition-colors ${idNumerico(t) !== null && selectedIds.has(idNumerico(t)!) ? 'border-primary bg-primary-soft/30' : 'hover:border-line-strong'}`}>
              <input type="checkbox" checked={idNumerico(t) !== null && selectedIds.has(idNumerico(t)!)} onChange={() => { const id = idNumerico(t); if (id !== null) toggleSel(id); }} className="rounded mt-1 border-line-strong text-primary focus:ring-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <button onClick={() => { setEditing(aEditable(t)); }} className="text-left flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-ink truncate mb-1">{t.nombre || '(sin nombre)'}</div>
                    <div className="text-[13px] text-ink-secondary truncate">{t.contenido?.substring(0, 80) || '...'}</div>
                  </button>
                  <button onClick={() => { const id = idNumerico(t); if (id !== null) handleDelete(id); }} className="text-ink-muted hover:text-red-500 transition-colors ml-2 shrink-0 p-1"><Icon.Trash /></button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(t.templateListIds || []).map((lid: number) => {
                    const cat = tplLists.find((c) => c.id === lid);
                    return cat ? (
                      <span key={lid} className="px-1 py-0 rounded text-xs text-white" style={{ backgroundColor: cat.color }}>{cat.name}</span>
                    ) : null;
                  })}
                  <button onClick={() => { const id = idNumerico(t); if (id !== null) handleShowLog(id); }}
                    className="text-xs text-ink-muted hover:text-blue-600 ml-auto">
                    {showLog === t.id ? 'Ocultar log' : 'Ver envíos'}
                  </button>
                </div>
              </div>
            </div>

            {/* Send log for this template */}
            {showLog === t.id && (
              <div className="ml-6 border rounded p-2 mb-1 bg-surface-muted text-xs">
                <h4 className="font-medium text-ink-secondary mb-1">Historial de envíos</h4>
                {sendLogs.length === 0 ? (
                  <p className="text-ink-muted">No se ha enviado este mensaje aún.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {sendLogs.map((log) => (
                      <div key={log.id} className="flex justify-between text-xs border-b py-0.5">
                        <span>{log.leadName} <span className="text-ink-muted">{log.leadPhone}</span></span>
                        <span className="text-ink-muted">{new Date(log.sentAt).toLocaleString('es-CL')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-ink-muted text-center py-6">No hay plantillas. Crea la primera con "+ Nueva plantilla".</p>
        )}
      </div>
    </div>
  );
}
