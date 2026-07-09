import { useEffect, useState } from 'react';
import {
  useWhatsAppTemplateLists,
  useWhatsAppTemplates,
  useEmailTemplateLists,
  useEmailTemplates,
} from '../hooks/useTemplates';

type Tab = 'whatsapp' | 'email';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

export default function TemplateListsPage() {
  const [tab, setTab] = useState<Tab>('whatsapp');
  const waLists = useWhatsAppTemplateLists();
  const waTemplates = useWhatsAppTemplates();
  const emailLists = useEmailTemplateLists();
  const emailTemplates = useEmailTemplates();

  const [listData, setListData] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const load = async () => {
    if (tab === 'whatsapp') {
      setListData(await waLists.getAll());
      setTemplates(await waTemplates.getAll());
    } else {
      setListData(await emailLists.getAll());
      setTemplates(await emailTemplates.getAll());
    }
  };

  useEffect(() => { load(); setEditing(null); }, [tab]);

  useEffect(() => {
    if (editing) { setName(editing.name); setColor(editing.color); }
    else { setName(''); setColor(COLORS[Math.floor(Math.random() * COLORS.length)]); }
  }, [editing]);

  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const obj = { id: editing?.id || 0, name: name.trim(), color, createdAt: '' };
    if (tab === 'whatsapp') await waLists.save(obj);
    else await emailLists.save(obj);
    setEditing(null);
    load();
  };

  const handleDeleteList = async (id: number) => {
    if (confirm('¿Eliminar esta categoría? Las plantillas asignadas quedarán sin esta categoría.')) {
      if (tab === 'whatsapp') await waLists.remove(id);
      else await emailLists.remove(id);
      load();
    }
  };

  // Get templates in a specific category
  const getTemplatesInList = (listId: number) =>
    templates.filter((t) => (t.templateListIds || []).includes(listId));

  const handleRemoveTemplateFromList = async (templateId: number, listId: number) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    const updated = { ...t, templateListIds: (t.templateListIds || []).filter((id: number) => id !== listId) };
    if (tab === 'whatsapp') await waTemplates.save(updated);
    else await emailTemplates.save(updated);
    load();
  };

  // Templates not in this category
  const getTemplatesNotInList = (listId: number) =>
    templates.filter((t) => !(t.templateListIds || []).includes(listId));

  const handleAddTemplateToList = async (templateId: number, listId: number) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    const updated = { ...t, templateListIds: [...(t.templateListIds || []), listId] };
    if (tab === 'whatsapp') await waTemplates.save(updated);
    else await emailTemplates.save(updated);
    load();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Categorías de Plantillas</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('whatsapp')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          WhatsApp
        </button>
        <button
          onClick={() => setTab('email')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Email
        </button>
      </div>

      {/* Create/Edit Form */}
      <form onSubmit={handleSaveList} className="flex gap-2 mb-6 items-end max-w-md">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de categoría"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          required
        />
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded text-sm">
          {editing ? 'Actualizar' : 'Crear'}
        </button>
        {editing && (
          <button type="button" onClick={() => setEditing(null)} className="bg-gray-200 px-3 py-2 rounded text-sm">
            Cancelar
          </button>
        )}
      </form>

      {/* Categories with their templates */}
      <div className="space-y-6">
        {listData.map((list) => {
          const assigned = getTemplatesInList(list.id!);
          const unassigned = getTemplatesNotInList(list.id!);

          return (
            <div key={list.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                  <span className="text-gray-400 font-normal text-xs">
                    ({assigned.length} plantillas)
                  </span>
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(list)} className="text-xs text-blue-600 hover:text-blue-800">
                    Editar
                  </button>
                  <button onClick={() => handleDeleteList(list.id!)} className="text-xs text-red-600 hover:text-red-800">
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Assigned Templates */}
              {assigned.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {assigned.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs"
                    >
                      {t.nombre}
                      <button
                        onClick={() => handleRemoveTemplateFromList(t.id!, list.id!)}
                        className="text-red-500 hover:text-red-700 ml-1"
                        title={`Quitar de ${list.name}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-3">Sin plantillas asignadas</p>
              )}

              {/* Add template */}
              {unassigned.length > 0 && (
                <details className="text-xs">
                  <summary className="text-blue-600 cursor-pointer hover:text-blue-800">
                    + Agregar plantilla a esta categoría
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {unassigned.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleAddTemplateToList(t.id!, list.id!)}
                        className="px-2 py-1 border rounded text-xs hover:bg-blue-50"
                      >
                        {t.nombre}
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}

        {listData.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            No hay categorías creadas. Crea una arriba.
          </p>
        )}
      </div>
    </div>
  );
}
