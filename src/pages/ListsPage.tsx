import React, { useState, useEffect, useMemo } from 'react';
import { useLists } from '../hooks/useLists';
import { useLeads } from '../hooks/useLeads';
import { Icon } from '../utils/icons';
import type { Lead, LeadList, AppSettings } from '../types';
import { useSort } from '../hooks/useSort';
import { useAuth } from '../contexts/AuthContext';
import ListLeadsTable from '../components/lists/ListLeadsTable';
import { SmartListSettingsModal } from '../components/lists/SmartListSettingsModal';
import ListDescription from '../components/lists/ListDescription';
import { MAX_LIST_DESCRIPTION } from '../types';
import { SMART_LIST_DEFS, getSmartListLeads } from '../utils/smartLists';
import { getSettings, saveSettings } from '../services/appSettingsService';
import { Button, IconButton } from '../design';

const AVAILABLE_COLORS = [
  // Página 1: Alta Variedad (Claros y Primarios)
  { hex: '#FFFFFF', name: 'Blanco' },
  { hex: '#EF4444', name: 'Rojo Claro' },
  { hex: '#22C55E', name: 'Verde Claro' },
  { hex: '#3B82F6', name: 'Azul Claro' },
  { hex: '#FBBF24', name: 'Amarillo' },
  
  // Página 2: Alta Variedad (Oscuros y Secundarios)
  { hex: '#000000', name: 'Negro' },
  { hex: '#991B1B', name: 'Rojo Oscuro' },
  { hex: '#166534', name: 'Verde Oscuro' },
  { hex: '#1E40AF', name: 'Azul Oscuro' },
  { hex: '#F97316', name: 'Naranja' },
  
  // Página 3: Alta Variedad (Claros y Terciarios)
  { hex: '#94A3B8', name: 'Gris Claro' },
  { hex: '#EC4899', name: 'Rosado Claro' },
  { hex: '#06B6D4', name: 'Cyan Claro' },
  { hex: '#14B8A6', name: 'AquaMarina Claro' },
  { hex: '#A855F7', name: 'Morado Claro' },
  
  // Página 4: Alta Variedad (Oscuros y Terciarios)
  { hex: '#475569', name: 'Gris Oscuro' },
  { hex: '#BE185D', name: 'Rosado Oscuro' },
  { hex: '#155E75', name: 'Cyan Oscuro' },
  { hex: '#0F766E', name: 'AquaMarina Oscuro' },
  { hex: '#6B21A8', name: 'Morado Oscuro' }
];

type UnifiedList = {
  id: string | number;
  name: string;
  color: string;
  isSmart: boolean;
  /** Solo las manuales la tienen: una lista automatica se explica por su regla. */
  description?: string;
};

export default function ListsPage() {
  const { hasFeature } = useAuth();
  const { getAll: getLists, save, remove: removeList } = useLists();
  const { getAll: getLeads, getDeleted, addToList, removeFromList, remove: deleteLead } = useLeads();
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [deletedLeads, setDeletedLeads] = useState<Lead[]>([]);
  
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadSearch, setLeadSearch] = useState('');
  
  const [showSmartSettings, setShowSmartSettings] = useState(false);
  
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListColor, setNewListColor] = useState('#6C4CF6');
  const [colorPageIndex, setColorPageIndex] = useState(0);
  
  // Drag and Drop state
  const [draggedListId, setDraggedListId] = useState<string | number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | number | null>(null);

  const load = async () => {
    const s = await getSettings();
    setSettings(s);
    setLists(await getLists());
    setAllLeads(await getLeads());
    setDeletedLeads(await getDeleted());
  };

  useEffect(() => { load(); }, []);

  const unifiedLists = useMemo<UnifiedList[]>(() => {
    if (!settings) return [];
    
    const smartLists = (settings.activeSmartLists || []).map(id => {
      const def = SMART_LIST_DEFS.find(d => d.id === id);
      return def ? { id: def.id, name: def.name, color: def.color, isSmart: true } : null;
    }).filter(Boolean) as UnifiedList[];
    
    const manualLists = lists.map(l => ({ id: l.id!, name: l.name, color: l.color, isSmart: false, description: l.description }));
    return [...smartLists, ...manualLists];
  }, [settings, lists]);

  const groups = settings?.listGroups || [];

  // Flatten logic to render folders and standalone lists
  const renderedItems = useMemo(() => {
    const inGroupIds = new Set<string | number>();
    groups.forEach(g => g.listIds.forEach(id => inGroupIds.add(id)));
    
    const standaloneLists = unifiedLists.filter(l => !inGroupIds.has(l.id));
    return { groups, standaloneLists };
  }, [groups, unifiedLists]);

  const handleSaveSmartSettings = async (activeIds: string[]) => {
    if (!settings) return;
    const newSettings = { ...settings, activeSmartLists: activeIds };
    setSettings(newSettings);
    await saveSettings(newSettings);
    setShowSmartSettings(false);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    if (lists.length >= 2 && !hasFeature('pro:unlimited_lists')) {
      alert(' Límite Alcanzado: El Plan Free solo permite crear 2 listas. Actualiza al Plan Pro para crear listas ilimitadas.');
      return;
    }

    await save({
      name: newListName.trim(),
      color: newListColor,
      createdAt: '',
      description: newListDescription.trim() || undefined,
    });
    setNewListName('');
    setNewListDescription('');
    load();
  };

  const handleSaveDescription = async (list: UnifiedList, description: string) => {
    // Se reenvian nombre y color porque `saveLeadList` actualiza la fila
    // entera; mandar solo la descripcion los dejaria en null.
    const original = lists.find(l => l.id === list.id);
    if (!original) return;

    await save({ ...original, description });
    load();
  };

  // Drag and Drop Handlers
  const handleDragStart = (id: string | number) => setDraggedListId(id);
  
  const handleDragOver = (e: React.DragEvent, targetId: string | number) => {
    e.preventDefault();
    if (draggedListId && draggedListId !== targetId) {
      setDragOverTarget(targetId);
    }
  };
  
  const handleDragLeave = () => setDragOverTarget(null);

  const handleDropOnList = async (targetId: string | number) => {
    if (!draggedListId || draggedListId === targetId || !settings) {
      setDragOverTarget(null);
      return;
    }
    
    // Check if dropping on a standalone list to form a new group
    const newGroupId = `group_${Date.now()}`;
    const newGroup = { id: newGroupId, name: 'Nueva Carpeta', listIds: [targetId, draggedListId] };
    
    const newSettings = { ...settings, listGroups: [...(settings.listGroups || []), newGroup] };
    setSettings(newSettings);
    await saveSettings(newSettings);
    
    setDraggedListId(null);
    setDragOverTarget(null);
  };
  
  const handleDropOnGroup = async (groupId: string) => {
    if (!draggedListId || !settings) {
      setDragOverTarget(null);
      return;
    }
    
    const newSettings = { ...settings };
    const group = newSettings.listGroups?.find(g => g.id === groupId);
    if (group && !group.listIds.includes(draggedListId)) {
       // Si estaba en otro grupo, removerlo de ahi
       newSettings.listGroups?.forEach(g => {
         g.listIds = g.listIds.filter(id => id !== draggedListId);
       });
       group.listIds.push(draggedListId);
       
       // Limpiar grupos vacios
       newSettings.listGroups = newSettings.listGroups?.filter(g => g.listIds.length > 0);
       
       setSettings(newSettings);
       await saveSettings(newSettings);
    }
    setDraggedListId(null);
    setDragOverTarget(null);
  };

  const handleRenameGroup = async (groupId: string, newName: string) => {
     if (!settings) return;
     const newSettings = { ...settings };
     const g = newSettings.listGroups?.find(g => g.id === groupId);
     if (g) {
       g.name = newName;
       setSettings(newSettings);
       await saveSettings(newSettings);
     }
  };

  const handleRemoveFromGroup = async (listId: string | number) => {
     if (!settings) return;
     const newSettings = { ...settings };
     if (newSettings.listGroups) {
       newSettings.listGroups.forEach(g => {
         g.listIds = g.listIds.filter(id => id !== listId);
       });
       newSettings.listGroups = newSettings.listGroups.filter(g => g.listIds.length > 0);
     }
     setSettings(newSettings);
     await saveSettings(newSettings);
  };

  const currentList = unifiedLists.find(l => l.id === expandedId);
  const leadsInList = currentList ? 
    (currentList.isSmart ? getSmartListLeads(currentList.id as string, allLeads, deletedLeads) : allLeads.filter(l => l.listaIds.includes(currentList.id as number))) 
    : [];

  const leadsNotInList = currentList && !currentList.isSmart ? 
    allLeads.filter(l => !l.listaIds.includes(currentList.id as number)) 
    : [];

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

  const handleDeleteList = async (id: number) => {
    if (!confirm('¿Eliminar esta lista?')) return;
    await removeList(id);
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const handleRemoveLead = async (leadId: string) => {
    if (currentList?.isSmart) return;
    await removeFromList(leadId, expandedId as number);
    setSelectedLeadIds((prev) => { const n = new Set(prev); n.delete(leadId); return n; });
    load();
  };

  const handleBulkRemove = async () => {
    if (selectedLeadIds.size === 0 || currentList?.isSmart) return;
    for (const id of selectedLeadIds) await removeFromList(id, expandedId as number);
    setSelectedLeadIds(new Set());
    load();
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0 || currentList?.isSmart) return; // Smart lists generally read only
    if (!confirm(`¿Eliminar ${selectedLeadIds.size} leads permanentemente?`)) return;
    for (const id of selectedLeadIds) await deleteLead(id);
    setSelectedLeadIds(new Set());
    load();
  };

  const handleAddLead = async (leadId: string) => {
    if (currentList?.isSmart) return;
    await addToList(leadId, expandedId as number);
    setLeadSearch('');
    load();
  };

  const toggleLead = (id: string) => {
    if (currentList?.isSmart) return;
    setSelectedLeadIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (currentList?.isSmart) return;
    if (selectedLeadIds.size === sorted.length) setSelectedLeadIds(new Set());
    else setSelectedLeadIds(new Set(sorted.map((l) => l.id!)));
  };

  // Helper to render a single list row
  const renderListRow = (list: UnifiedList, insideGroup = false) => {
    const isExpanded = expandedId === list.id;
    const leads = list.isSmart ? getSmartListLeads(list.id as string, allLeads, deletedLeads) : allLeads.filter(l => l.listaIds.includes(list.id as number));
    
    return (
      <div 
        key={list.id} 
        draggable
        onDragStart={() => handleDragStart(list.id)}
        onDragOver={(e) => handleDragOver(e, list.id)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDropOnList(list.id)}
        className={`bg-[#ffffff] dark:bg-slate-800 border-b border-line dark:border-slate-700/50 last:border-b-0 transition-colors group ${dragOverTarget === list.id ? 'bg-blue-50 dark:bg-slate-700 ring-2 ring-primary' : ''}`}
      >
        <div
          onClick={() => { setExpandedId(isExpanded ? null : list.id); setSelectedLeadIds(new Set()); setLeadSearch(''); }}
          className={`flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-surface-muted ${insideGroup ? 'pl-10' : ''}`}
        >
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: list.color }} />
            <span className="flex flex-col min-w-0">
              <span className="font-medium text-[13px] text-ink dark:text-slate-200 flex items-center gap-2">
                {list.name}
                {list.isSmart && <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shadow-sm">Automática</span>}
              </span>
              <ListDescription
                description={list.description}
                editable={!list.isSmart}
                listName={list.name}
                onSave={(descripcion) => handleSaveDescription(list, descripcion)}
              />
            </span>
            <span className="bg-surface-hover text-ink-secondary text-[10px] px-2 py-0.5 rounded-md font-semibold border border-line dark:border-slate-600 shrink-0">{leads.length} leads</span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {insideGroup && (
               <button onClick={(e) => { e.stopPropagation(); handleRemoveFromGroup(list.id); }} className="text-ink-muted hover:text-orange-500 p-1.5 rounded-md hover:bg-orange-50 text-[11px] font-medium" title="Sacar de la carpeta" aria-label={`Sacar ${list.name} de la carpeta`}>Sacar</button>
            )}
            {!list.isSmart && (
              <button onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id as number); }} className="text-ink-muted hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Eliminar lista" aria-label={`Eliminar la lista ${list.name}`}>
                {Icon.Trash()}
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-line bg-surface-muted/50 p-5">
            {!list.isSmart && selectedLeadIds.size > 0 && (
              <div className="flex gap-3 mb-4 items-center bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-sm">
                <span className="text-blue-800 font-semibold">{selectedLeadIds.size} seleccionados</span>
                <div className="h-4 w-px bg-blue-200 mx-2"></div>
                <button onClick={handleBulkRemove} className="text-orange-700 font-medium hover:text-orange-900 flex items-center gap-1">
                  Quitar de lista
                </button>
                <button onClick={handleBulkDelete} className="text-red-700 font-medium hover:text-red-900 flex items-center gap-1">
                  Eliminar permanentemente
                </button>
                <button onClick={() => setSelectedLeadIds(new Set())} className="text-ink-muted font-medium ml-auto hover:text-ink-secondary">
                  Deseleccionar todo
                </button>
              </div>
            )}

            {!list.isSmart && (
              <div className="mb-4 relative">
                <input 
                  type="text" 
                  value={leadSearch} 
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Buscar y agregar lead a la lista..." 
                  className="w-full border-line-strong rounded-lg px-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" 
                />
                
                {leadSearch && filteredNotInList.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredNotInList.slice(0, 15).map((lead) => (
                      <button 
                        key={lead.id} 
                        onClick={() => handleAddLead(lead.id!)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-0 text-sm flex justify-between items-center transition-colors"
                      >
                        <span className="font-medium text-ink">
                          {lead.name} <span className="text-ink-muted font-normal ml-2">{lead.phone}</span>
                        </span>
                        <span className="text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center font-bold">+</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ListLeadsTable 
              leads={sorted}
              selectedIds={list.isSmart ? new Set() : selectedLeadIds}
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
  };

  return (
    <div className="pb-20">
      
      {/* Header and Creation Row */}
      <div className="flex gap-2 mb-5 items-center">
         <form onSubmit={handleCreateList} className="flex gap-2 bg-surface border border-line p-1 rounded-md shadow-sm items-center">
            <input 
              type="text" 
              placeholder="Nueva Lista (Ej: Prioritarios)" 
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="px-3 py-1.5 text-sm bg-transparent outline-none flex-1 min-w-[160px]"
            />
            {/* Opcional: crear una lista no deberia obligar a describirla. */}
            <input
              type="text"
              placeholder="De que va (opcional)"
              value={newListDescription}
              onChange={(e) => setNewListDescription(e.target.value)}
              maxLength={MAX_LIST_DESCRIPTION}
              aria-label="Descripcion de la lista nueva"
              className="px-3 py-1.5 text-[13px] bg-transparent outline-none border-l border-line min-w-[150px] flex-1 text-ink-secondary placeholder:text-ink-muted"
            />
            <div className="flex gap-1.5 items-center px-3 border-l border-line">
              {AVAILABLE_COLORS.slice(colorPageIndex * 5, colorPageIndex * 5 + 5).map(c => (
                <button 
                  key={c.hex}
                  type="button" 
                  onClick={() => setNewListColor(c.hex)}
                  className={`w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 transition-all ${newListColor === c.hex ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
              <button 
                type="button"
                onClick={() => setColorPageIndex((prev) => (prev + 1) % (AVAILABLE_COLORS.length / 5))}
                className="w-5 h-5 ml-1.5 flex items-center justify-center text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-full transition-colors"
                title="Siguientes colores"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
            <Button type="submit" variant="primary" size="sm" className="ml-1">
               + Crear
            </Button>
         </form>

         <IconButton
            label="Configurar Listas Inteligentes"
            icon={Icon.Settings()}
            className="ml-auto"
            onClick={() => setShowSmartSettings(true)}
         />
      </div>

      <div className="bg-[#ffffff] dark:bg-slate-800 rounded-md shadow-sm border border-line dark:border-slate-700 overflow-hidden">
         {renderedItems.groups.map(group => (
            <div 
               key={group.id} 
               className={`border-b border-line dark:border-slate-700/50 last:border-0 ${dragOverTarget === group.id ? 'bg-blue-50 dark:bg-slate-700 ring-2 ring-primary' : ''}`}
               onDragOver={(e) => handleDragOver(e, group.id)}
               onDragLeave={handleDragLeave}
               onDrop={() => handleDropOnGroup(group.id)}
            >
               <div className="bg-surface-muted/80 px-5 py-2.5 border-b border-line flex justify-between items-center group/folder">
                  <div className="flex items-center gap-2">
                     <span className="text-ink-muted">{Icon.Lists()}</span>
                     <input 
                        type="text" 
                        value={group.name}
                        onChange={(e) => handleRenameGroup(group.id, e.target.value)}
                        className="bg-transparent font-semibold text-ink text-sm outline-none border-b border-transparent focus:border-blue-500 hover:border-line-strong px-1 py-0.5 w-48"
                     />
                  </div>
                  <span className="text-[10px] text-ink-secondary font-medium bg-[#ffffff] dark:bg-slate-800 border border-line dark:border-slate-700 px-2 py-0.5 rounded-md shadow-sm">
                     {group.listIds.length} listas
                  </span>
               </div>
               
               <div className="divide-y group/listgroup">
                 {group.listIds.map(id => {
                   const lst = unifiedLists.find(l => l.id === id);
                   return lst ? renderListRow(lst, true) : null;
                 })}
               </div>
            </div>
         ))}

         <div className="divide-y">
            {renderedItems.standaloneLists.length === 0 && renderedItems.groups.length === 0 ? (
               <div className="text-center py-12 text-ink-secondary text-sm">
                  No hay listas creadas. Crea una nueva lista o activa listas inteligentes.
               </div>
            ) : (
               renderedItems.standaloneLists.map(list => renderListRow(list, false))
            )}
         </div>
      </div>

      {showSmartSettings && settings && (
         <SmartListSettingsModal 
            activeSmartLists={settings.activeSmartLists || []}
            onSave={handleSaveSmartSettings}
            onClose={() => setShowSmartSettings(false)}
         />
      )}
    </div>
  );
}
