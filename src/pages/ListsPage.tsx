import { useEffect, useState, useMemo } from 'react';
import { useLists } from '../hooks/useLists';
import { useLeads } from '../hooks/useLeads';
import { Icon } from '../utils/icons';
import type { Lead, LeadList } from '../types';
import { useSort } from '../hooks/useSort';

const COLORS = [
  { name: 'Azul', value: '#3B82F6' }, { name: 'Rojo', value: '#EF4444' },
  { name: 'Verde', value: '#10B981' }, { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' }, { name: 'Rosa', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' }, { name: 'Naranja', value: '#F97316' },
];

function extractRut(lead: Lead): string { return lead.rut || ''; }

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function ListsPage() {
  const { getAll: getLists, save, remove: removeList } = useLists();
  const { getAll: getLeads, addToList, removeFromList, remove: deleteLead } = useLeads();
  const [lists, setLists] = useState<LeadList[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [leadSearch, setLeadSearch] = useState('');
  const [editingList, setEditingList] = useState<LeadList | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0].value);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0].value);

  const load = async () => {
    setLists(await getLists());
    setAllLeads(await getLeads());
  };

  useEffect(() => { load(); }, []);

  const leadsInList = expandedId ? allLeads.filter((l) => l.listaIds.includes(expandedId)) : [];
  const leadsNotInList = expandedId ? allLeads.filter((l) => !l.listaIds.includes(expandedId)) : [];

  const { sort, toggle: onSort, sorted } = useSort(leadsInList, {
    createdAt: (l) => l.createdAt,
    name: (l) => l.name.toLowerCase(),
    rut: (l) => extractRut(l),
  });

  const filteredNotInList = leadSearch
    ? leadsNotInList.filter((l) =>
        l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
        l.phone.includes(leadSearch) ||
        (l.email && l.email.toLowerCase().includes(leadSearch.toLowerCase())))
    : leadsNotInList;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await save({ name: newName.trim(), color: newColor, createdAt: '' });
    setNewName(''); setCreating(false);
    load();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingList) return;
    await save({ ...editingList, name: editName.trim(), color: editColor });
    setEditingList(null); load();
  };

  const handleDeleteList = async (id: number) => {
    if (!confirm('¿Eliminar esta lista?')) return;
    await removeList(id);
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const handleRemoveLead = async (leadId: number) => {
    await removeFromList(leadId, expandedId!);
    setSelectedLeadIds((prev) => { const n = new Set(prev); n.delete(leadId); return n; });
    load();
  };

  const handleBulkRemove = async () => {
    if (selectedLeadIds.size === 0) return;
    for (const id of selectedLeadIds) {
      await removeFromList(id, expandedId!);
    }
    setSelectedLeadIds(new Set());
    load();
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedLeadIds.size} leads permanentemente?`)) return;
    for (const id of selectedLeadIds) {
      await deleteLead(id);
    }
    setSelectedLeadIds(new Set());
    load();
  };

  const handleAddLead = async (leadId: number) => {
    await addToList(leadId, expandedId!);
    load();
  };

  const toggleLead = (id: number) => {
    setSelectedLeadIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selectedLeadIds.size === sorted.length) setSelectedLeadIds(new Set());
    else setSelectedLeadIds(new Set(sorted.map((l) => l.id!)));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold">Listas</h2>
        <button onClick={() => setCreating(!creating)}
          className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">+ Nueva lista</button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="flex gap-2 mb-3">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la lista" className="flex-1 border rounded px-2 py-1 text-xs" required autoFocus />
          <select value={newColor} onChange={(e) => setNewColor(e.target.value)} className="border rounded px-1 py-1 text-xs">
            {COLORS.map((c) => <option key={c.value} value={c.value}>● {c.name}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Crear</button>
          <button type="button" onClick={() => setCreating(false)} className="text-gray-400 text-xs">Cancelar</button>
        </form>
      )}

      {editingList && (
        <form onSubmit={handleEdit} className="flex gap-2 mb-3">
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-xs" required autoFocus />
          <select value={editColor} onChange={(e) => setEditColor(e.target.value)} className="border rounded px-1 py-1 text-xs">
            {COLORS.map((c) => <option key={c.value} value={c.value}>● {c.name}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Guardar</button>
          <button type="button" onClick={() => setEditingList(null)} className="text-gray-400 text-xs">Cancelar</button>
        </form>
      )}

      {/* Lists */}
      <div className="space-y-2">
        {lists.map((list) => {
          const count = allLeads.filter((l) => l.listaIds.includes(list.id!)).length;
          const isExpanded = expandedId === list.id;

          return (
            <div key={list.id} className="border rounded-lg overflow-hidden">
              {/* List header */}
              <div
                onClick={() => { setExpandedId(isExpanded ? null : list.id!); setSelectedLeadIds(new Set()); setLeadSearch(''); }}
                className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                  <span className="font-medium text-sm">{list.name}</span>
                  <span className="text-xs text-gray-400">({count})</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditingList(list); setEditName(list.name); setEditColor(list.color); }}
                    className="text-blue-500 hover:text-blue-700 text-xs p-1">✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id!); }}
                    className="text-red-400 hover:text-red-600 text-xs p-1">{Icon.Trash()}</button>
                </div>
              </div>

              {/* Expanded: Leads in list */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-2">
                  {/* Bulk actions */}
                  {selectedLeadIds.size > 0 && (
                    <div className="flex gap-2 mb-2 items-center text-xs">
                      <span className="text-blue-700 font-medium">{selectedLeadIds.size} seleccionados</span>
                      <button onClick={handleBulkRemove} className="text-orange-600 hover:text-orange-800">Quitar de lista</button>
                      <button onClick={handleBulkDelete} className="text-red-600 hover:text-red-800">Eliminar leads</button>
                      <button onClick={() => setSelectedLeadIds(new Set())} className="text-gray-400 ml-auto">Deseleccionar</button>
                    </div>
                  )}

                  {/* Add lead */}
                  <div className="mb-2">
                    <input type="text" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Buscar lead para agregar..." className="w-full border rounded px-2 py-1 text-xs" />
                    {leadSearch && filteredNotInList.length > 0 && (
                      <div className="border rounded max-h-32 overflow-y-auto mt-1 bg-white">
                        {filteredNotInList.slice(0, 20).map((lead) => (
                          <button key={lead.id} onClick={() => handleAddLead(lead.id!)}
                            className="w-full text-left px-2 py-1 hover:bg-blue-50 border-b text-xs flex justify-between">
                            <span>{lead.name} <span className="text-gray-400">{lead.phone}</span></span>
                            <span className="text-blue-600">+</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Leads table compact */}
                  {sorted.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Sin leads en esta lista.</p>
                  ) : (
                    <div className="border rounded overflow-hidden bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="w-6 px-1 py-1.5"><input type="checkbox" onChange={selectAll}
                              checked={selectedLeadIds.size > 0 && selectedLeadIds.size === sorted.length} className="rounded" /></th>
                            <th onClick={() => onSort('name')} className="text-left px-2 py-1.5 font-medium cursor-pointer hover:bg-gray-200">
                              Nombre {sort.field === 'name' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</th>
                            <th className="text-left px-2 py-1.5 font-medium">Teléfono</th>
                            <th onClick={() => onSort('rut')} className="text-left px-2 py-1.5 font-medium cursor-pointer hover:bg-gray-200">
                              RUT {sort.field === 'rut' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</th>
                            <th className="w-12 px-1 py-1.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((lead) => (
                            <tr key={lead.id} className={`border-t hover:bg-gray-50 ${selectedLeadIds.has(lead.id!) ? 'bg-blue-50' : ''}`}>
                              <td className="px-1 py-1"><input type="checkbox" checked={selectedLeadIds.has(lead.id!)}
                                onChange={() => toggleLead(lead.id!)} className="rounded" /></td>
                              <td className="px-2 py-1 font-medium">{shortName(lead.name)}</td>
                              <td className="px-2 py-1">{lead.phone}</td>
                              <td className="px-2 py-1 font-mono text-gray-500">{lead.rut || '-'}</td>
                              <td className="px-1 py-1">
                                <button onClick={() => handleRemoveLead(lead.id!)}
                                  className="text-red-400 hover:text-red-600 text-xs" title="Quitar de la lista">x</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {lists.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No hay listas. Crea la primera.</p>
        )}
      </div>
    </div>
  );
}
