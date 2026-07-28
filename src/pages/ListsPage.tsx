import { useEffect, useState } from 'react';
import { useLists } from '../hooks/useLists';
import { useLeads } from '../hooks/useLeads';
import { Icon } from '../utils/icons';
import type { Lead, LeadList } from '../types';
import { useSort } from '../hooks/useSort';
import { useAuth } from '../contexts/AuthContext';
import ListEditor from '../components/lists/ListEditor';
import ListLeadsTable from '../components/lists/ListLeadsTable';
import PageHeader from '../components/ui/PageHeader';

export default function ListsPage() {
  const { hasFeature } = useAuth();
  const { getAll: getLists, save, remove: removeList } = useLists();
  const { getAll: getLeads, addToList, removeFromList, remove: deleteLead } = useLeads();
  const [lists, setLists] = useState<LeadList[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadSearch, setLeadSearch] = useState('');
  
  const [creating, setCreating] = useState(false);
  const [editingList, setEditingList] = useState<LeadList | null>(null);

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
    rut: (l) => l.rut || '',
  });

  const filteredNotInList = leadSearch
    ? leadsNotInList.filter((l) =>
        l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
        l.phone.includes(leadSearch) ||
        (l.email && l.email.toLowerCase().includes(leadSearch.toLowerCase())))
    : leadsNotInList;

  const handleSaveList = async (data: { name: string; color: string }) => {
    if (editingList) {
      await save({ ...editingList, ...data });
    } else {
      await save({ name: data.name, color: data.color, createdAt: '' });
    }
    setCreating(false);
    setEditingList(null);
    load();
  };

  const handleDeleteList = async (id: number) => {
    if (!confirm('¿Eliminar esta lista?')) return;
    await removeList(id);
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const handleRemoveLead = async (leadId: string) => {
    await removeFromList(leadId, expandedId!);
    setSelectedLeadIds((prev) => { const n = new Set(prev); n.delete(leadId); return n; });
    load();
  };

  const handleBulkRemove = async () => {
    if (selectedLeadIds.size === 0) return;
    for (const id of selectedLeadIds) await removeFromList(id, expandedId!);
    setSelectedLeadIds(new Set());
    load();
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedLeadIds.size} leads permanentemente?`)) return;
    for (const id of selectedLeadIds) await deleteLead(id);
    setSelectedLeadIds(new Set());
    load();
  };

  const handleAddLead = async (leadId: string) => {
    await addToList(leadId, expandedId!);
    setLeadSearch('');
    load();
  };

  const toggleLead = (id: string) => {
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
    <div className="max-w-4xl">
      <PageHeader
        title="Listas"
        description="Organiza tus contactos en grupos para campañas masivas."
      >
        <button 
          onClick={() => {
            if (lists.length >= 2 && !hasFeature('pro:unlimited_lists')) {
              alert(' Límite Alcanzado: El Plan Free solo permite crear 2 listas. Actualiza al Plan Pro para crear listas ilimitadas.');
              return;
            }
            setCreating(true); 
            setEditingList(null); 
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
        >
          {Icon.Plus()} Nueva lista
        </button>
      </PageHeader>

      {creating && (
        <ListEditor 
          onSave={handleSaveList} 
          onCancel={() => setCreating(false)} 
          submitLabel="Crear Lista"
        />
      )}

      {editingList && (
        <ListEditor 
          initialData={editingList} 
          onSave={handleSaveList} 
          onCancel={() => setEditingList(null)} 
          submitLabel="Actualizar"
        />
      )}

      <div className="space-y-3">
        {lists.map((list) => {
          const count = allLeads.filter((l) => l.listaIds.includes(list.id!)).length;
          const isExpanded = expandedId === list.id;

          return (
            <div key={list.id} className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border rounded-xl shadow-sm overflow-hidden transition-all duration-200">
              <div
                onClick={() => { setExpandedId(isExpanded ? null : list.id!); setSelectedLeadIds(new Set()); setLeadSearch(''); }}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:bg-slate-900/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: list.color }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{list.name}</span>
                  <span className="bg-gray-100 text-slate-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full font-medium">{count} leads</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingList(list); setCreating(false); }}
                    className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    ️
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id!); }}
                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {Icon.Trash()}
                  </button>
                  <div className={`transform transition-transform text-gray-400 p-1.5 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-slate-50 dark:bg-slate-900/50 p-4">
                  {selectedLeadIds.size > 0 && (
                    <div className="flex gap-3 mb-4 items-center bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-sm">
                      <span className="text-blue-800 font-semibold">{selectedLeadIds.size} seleccionados</span>
                      <div className="h-4 w-px bg-blue-200 mx-2"></div>
                      <button onClick={handleBulkRemove} className="text-orange-700 font-medium hover:text-orange-900 flex items-center gap-1">
                        Quitar de lista
                      </button>
                      <button onClick={handleBulkDelete} className="text-red-700 font-medium hover:text-red-900 flex items-center gap-1">
                        Eliminar permanentemente
                      </button>
                      <button onClick={() => setSelectedLeadIds(new Set())} className="text-slate-400 dark:text-slate-500 font-medium ml-auto hover:text-slate-600 dark:text-slate-300">
                        Deseleccionar todo
                      </button>
                    </div>
                  )}

                  <div className="mb-4 relative">
                    <input 
                      type="text" 
                      value={leadSearch} 
                      onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Buscar y agregar lead a la lista..." 
                      className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" 
                    />
                    
                    {leadSearch && filteredNotInList.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredNotInList.slice(0, 15).map((lead) => (
                          <button 
                            key={lead.id} 
                            onClick={() => handleAddLead(lead.id!)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-0 text-sm flex justify-between items-center transition-colors"
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {lead.name} <span className="text-gray-400 font-normal ml-2">{lead.phone}</span>
                            </span>
                            <span className="text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center font-bold">+</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <ListLeadsTable 
                    leads={sorted}
                    selectedIds={selectedLeadIds}
                    onToggleLead={toggleLead}
                    onSelectAll={selectAll}
                    onRemoveLead={handleRemoveLead}
                    sort={sort}
                    onSort={onSort}
                  />
                </div>
              )}
            </div>
          );
        })}
        {lists.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border rounded-xl border-dashed">
            <span className="text-4xl mb-3 block"></span>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">No tienes listas aún</h3>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">Crea tu primera lista para organizar tus contactos.</p>
            <button 
              onClick={() => {
                if (lists.length >= 2 && !hasFeature('pro:unlimited_lists')) {
                  alert(' Límite Alcanzado: El Plan Free solo permite crear 2 listas. Actualiza al Plan Pro para crear listas ilimitadas.');
                  return;
                }
                setCreating(true); 
                setEditingList(null); 
              }}
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Crear lista ahora →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
