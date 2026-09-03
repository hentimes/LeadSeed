import React, { useState, useEffect, useMemo } from 'react';
import { getPlatform } from '../platform/registry';
import { useLists } from '../hooks/useLists';
import { useLeads } from '../hooks/useLeads';
import { Icon } from '../utils/icons';
import type { Lead, LeadList, AppSettings } from '../types';
import { useSort } from '../hooks/useSort';
import { useAuth } from '../contexts/AuthContext';
import ListLeadsTable from '../components/lists/ListLeadsTable';
import { SmartListSettingsModal } from '../components/lists/SmartListSettingsModal';
import ListDescription from '../components/lists/ListDescription';
import CreateListRow from '../components/lists/CreateListRow';
import { SMART_LIST_DEFS, getSmartListLeads } from '../utils/smartLists';
import { getSettings, saveSettings } from '../services/appSettingsService';


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
  const { getAll: getLists, save, remove: removeList, setColor: setListsColor } = useLists();
  const { getAll: getLeads, getDeleted, addToList, removeFromList, remove: deleteLead } = useLeads();
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [deletedLeads, setDeletedLeads] = useState<Lead[]>([]);
  
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadSearch, setLeadSearch] = useState('');
  
  const [showSmartSettings, setShowSmartSettings] = useState(false);
  

  
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

  /*
   * Lanza en vez de avisar por su cuenta: `CreateListRow` es quien tiene el
   * sitio para mostrar el motivo, debajo del campo. Antes esto era un
   * `alert()`, que en un panel de 320px tapa la extension entera.
   */
  /** Pinta varias listas de una vez desde la configuracion. */
  const handleApplyColor = async (ids: number[], color: string) => {
    await setListsColor(ids, color);
    load();
  };

  const handleCreateList = async ({ name, color }: { name: string; color: string }) => {
    if (lists.length >= 2 && !hasFeature('pro:unlimited_lists')) {
      throw new Error('El plan Free permite 2 listas. Pasá a Pro para crear las que quieras.');
    }

    await save({ name, color, createdAt: '' });
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
    if (
      !(await getPlatform().dialogs.confirm('Los leads no se borran: solo dejan de estar en esta lista.', {
        title: '¿Eliminar esta lista?',
        confirmLabel: 'Eliminar',
        tone: 'danger',
      }))
    ) {
      return;
    }
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
    if (
      !(await getPlatform().dialogs.confirm(
        'Se borran de toda la aplicación, no solo de esta lista. No se puede deshacer.',
        {
          title: `¿Eliminar ${selectedLeadIds.size} leads?`,
          confirmLabel: 'Eliminar',
          tone: 'danger',
        },
      ))
    ) {
      return;
    }
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
          /*
            Alto fijo para TODAS las filas.

            Las listas propias se veian mas gruesas que las automaticas, y la
            causa no era la descripcion -`text-meta` es mas bajo que el nombre-:
            era el tacho, que solo se pinta cuando la lista NO es automatica.
            Con su relleno y su icono medía unos 32px, mas que ningun otro hijo
            de la fila, asi que estiraba solo las filas donde existia. Se veia
            como dos densidades distintas en la misma lista sin ningun motivo.

            `min-h` con `items-center` en vez de `py` suelto: asi la altura la
            fija la fila y no el hijo mas alto que le toque, y deja de depender
            de que controles aparezcan en cada caso.
          */
          className={`flex min-h-[44px] items-center justify-between gap-2 px-5 py-1.5 cursor-pointer hover:bg-surface-muted ${insideGroup ? 'pl-10' : ''}`}
        >
          {/*
            Todo en una linea: punto, nombre, descripcion y contador.
 
            El nombre se topa al 45% para que la descripcion tenga sitio; sin
            ese tope, un nombre largo se lo comeria entero y la descripcion no
            se veria nunca. Cada tramo lleva `min-w-0` porque un hijo de flex
            no se encoge por debajo de su contenido salvo que se le diga.
          */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full shadow-sm"
              style={{ backgroundColor: list.color }}
            />

            <span className="min-w-0 max-w-[45%] truncate text-body font-medium text-ink">
              {list.name}
            </span>

            {list.isSmart && (
              <span className="shrink-0 rounded border border-accent-border bg-accent-soft px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-accent">
                Automática
              </span>
            )}

            <ListDescription
              description={list.description}
              editable={!list.isSmart}
              listName={list.name}
              onSave={(descripcion) => handleSaveDescription(list, descripcion)}
              className="min-w-0 flex-1"
            />

            <span className="shrink-0 rounded-md border border-line bg-surface-hover px-2 py-0.5 text-micro font-semibold text-ink-secondary">
              {leads.length} leads
            </span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {insideGroup && (
               <button onClick={(e) => { e.stopPropagation(); handleRemoveFromGroup(list.id); }} className="flex h-7 shrink-0 items-center rounded-md px-2 text-micro font-medium text-ink-muted transition-colors hover:bg-state-warning-soft hover:text-state-warning-ink" title="Sacar de la carpeta" aria-label={`Sacar ${list.name} de la carpeta`}>Sacar</button>
            )}
            {!list.isSmart && (
              <button onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id as number); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger-ink [&_svg]:h-3.5 [&_svg]:w-3.5" title="Eliminar lista" aria-label={`Eliminar la lista ${list.name}`}>
                {Icon.Trash()}
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-line bg-surface-muted/50 p-5">
            {!list.isSmart && selectedLeadIds.size > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-state-info-soft bg-state-info-soft p-2.5 text-body text-ink">
                <span className="text-blue-800 font-semibold">{selectedLeadIds.size} seleccionados</span>
                <div className="mx-2 h-4 w-px bg-line"></div>
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
                  className="w-full rounded-lg border border-line-strong bg-surface px-4 py-2 text-body text-ink shadow-sm outline-none transition-colors placeholder:text-ink-muted focus:border-focus focus:ring-1 focus:ring-focus" 
                />
                
                {leadSearch && filteredNotInList.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredNotInList.slice(0, 15).map((lead) => (
                      <button 
                        key={lead.id} 
                        onClick={() => handleAddLead(lead.id!)}
                        className="flex w-full items-center justify-between border-b px-4 py-2 text-left text-body transition-colors last:border-0 hover:bg-surface-hover"
                      >
                        <span className="font-medium text-ink">
                          {lead.name} <span className="text-ink-muted font-normal ml-2">{lead.phone}</span>
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-ink">+</span>
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
      
      <CreateListRow
        existingNames={lists.map((lista) => lista.name)}
        existingColors={lists.map((lista) => lista.color)}
        onCreate={handleCreateList}
        onOpenSettings={() => setShowSmartSettings(true)}
      />

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
            lists={lists}
            onSave={handleSaveSmartSettings}
            onApplyColor={handleApplyColor}
            onClose={() => setShowSmartSettings(false)}
         />
      )}
    </div>
  );
}
