import { useEffect, useRef, useMemo, useState } from 'react';
import type { Lead, LeadList, LeadStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import type { SortConfig, SortField } from '../hooks/useSort';
import type { ColumnDef } from './ColumnSelector';
import { Icon } from '../utils/icons';
import { useSendCounts } from '../hooks/useSendCounts';

interface Props {
  leads: Lead[];
  lists: LeadList[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onRangeSelect: (from: number, to: number, select: boolean) => void;
  onSelectAll: () => void;
  onEdit: (lead: Lead) => void;
  onView: (lead: Lead) => void;
  onDelete: (id: number) => void;
  onRestore?: (id: number) => void;
  isTrash?: boolean;
  filterMode?: string | null;
  filterListId: number | null;
  onFilterChange: (listId: number | null) => void;
  filterStatus: LeadStatus | null;
  onFilterStatusChange: (status: LeadStatus | null) => void;
  filterDate: string;
  onFilterDateChange: (v: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: SortConfig;
  onSort: (field: SortField) => void;
  totalCount: number;
  visibleCount: number;
  selectedCount: number;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
  onReorderCols?: (from: number, to: number) => void;
  compactMode: boolean;
  lastClickedIndex: number | null;
  onSetLastClicked: (index: number) => void;
}

const sortIcon = (f: SortField, s: SortConfig) => {
  if (s.field !== f) return Icon.Sort();
  return s.dir === 'asc' ? Icon.SortUp() : Icon.SortDown();
};

// Extract first name and first last name
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  // Assume: first name + middle name(s) + last name(s)
  // Return first + last
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function LeadsTable({
  leads, lists, selectedIds, onToggleSelect, onRangeSelect, onSelectAll,
  onEdit, onView, onDelete, onRestore, isTrash, filterMode, filterListId, onFilterChange, filterStatus, onFilterStatusChange, filterDate, onFilterDateChange, search, onSearchChange,
  sort, onSort, totalCount, visibleCount, selectedCount, visibleCols, onColsChange,
  compactMode, lastClickedIndex, onSetLastClicked,
  onReorderCols,
}: Props) {
  const sendCounts = useSendCounts();
  
  const nameVis = visibleCols.find((c) => c.key === 'name')?.visible ?? true;
  const rutVis = visibleCols.find((c) => c.key === 'rut')?.visible ?? true;
  const phoneVis = visibleCols.find((c) => c.key === 'phone')?.visible ?? true;
  const emailVis = visibleCols.find((c) => c.key === 'email')?.visible ?? true;
  const companyVis = visibleCols.find((c) => c.key === 'company')?.visible ?? true;
  const dateVis = visibleCols.find((c) => c.key === 'createdAt')?.visible ?? true;
  const listsVis = visibleCols.find((c) => c.key === 'lists')?.visible ?? true;
  const statusVis = visibleCols.find((c) => c.key === 'status')?.visible ?? true;
  const scoreVis = visibleCols.find((c) => c.key === 'score')?.visible ?? false;

  const listsMap = useMemo(() => {
    const map = new Map<number, LeadList>();
    for (const l of lists) map.set(l.id!, l);
    return map;
  }, [lists]);

  const getScore = (lead: Lead): number => {
    let s = 0;
    if (lead.phone) s++;
    if (lead.email) s++;
    if (lead.company) s++;
    if (lead.rut) s++;
    if (lead.notes) s++;
    return s;
  };

  const headerColSpan = compactMode ? 3 : 2 + visibleCols.filter((c) => c.visible).length;

  const nameLabel = nameVis && rutVis ? 'Nombre y RUT' : nameVis ? 'Nombre' : rutVis ? 'RUT' : 'Contacto';
  const contactLabel = phoneVis && emailVis ? 'Teléfono y Correo' : phoneVis ? 'Teléfono' : emailVis ? 'Correo' : '';

  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Refs para evitar que el useEffect se re-ejecute en cada render
  const onRangeSelectRef = useRef(onRangeSelect);
  const onToggleSelectRef = useRef(onToggleSelect);
  const onSetLastClickedRef = useRef(onSetLastClicked);
  const lastClickedRef = useRef(lastClickedIndex);
  const selectedIdsRef = useRef(selectedIds);

  onRangeSelectRef.current = onRangeSelect;
  onToggleSelectRef.current = onToggleSelect;
  onSetLastClickedRef.current = onSetLastClicked;
  lastClickedRef.current = lastClickedIndex;
  selectedIdsRef.current = selectedIds;

  // Listener de click nativo - se registra UNA sola vez
  useEffect(() => {
    const tbody = tbodyRef.current;
    if (!tbody) return;

    const handler = (e: MouseEvent) => {
      // Ignorar clicks en botones (editar/eliminar)
      let target = e.target as HTMLElement | null;
      while (target && target !== tbody) {
        if (target.tagName === 'BUTTON') return;
        target = target.parentElement;
      }

      const row = (e.target as HTMLElement).closest('tr[data-row-index]') as HTMLTableRowElement | null;
      if (!row) return;

      const idx = parseInt(row.getAttribute('data-row-index')!, 10);
      const leadId = parseInt(row.getAttribute('data-lead-id')!, 10);
      if (isNaN(idx) || isNaN(leadId)) return;

      if (e.shiftKey && lastClickedRef.current !== null) {
        // Si la fila clickeada está seleccionada → deseleccionar el rango, si no → seleccionar
        const select = !selectedIdsRef.current.has(leadId);
        onRangeSelectRef.current(lastClickedRef.current, idx, select);
      } else {
        onToggleSelectRef.current(leadId);
      }
      onSetLastClickedRef.current(idx);
    };

    tbody.addEventListener('click', handler);
    return () => tbody.removeEventListener('click', handler);
  }, []);

  const [showFilters, setShowFilters] = useState(false);
  const activeFiltersCount = (filterListId ? 1 : 0) + (filterStatus ? 1 : 0) + (filterDate ? 1 : 0);

  return (
    <div>
      {showFilters && (
        <div className="flex gap-2 mb-2 items-center flex-wrap bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded p-2 animate-toast-in">
          <span className="text-xs font-semibold text-gray-500 mr-1">Filtrar por:</span>
          <select value={filterListId ?? ''} onChange={(e) => onFilterChange(e.target.value ? Number(e.target.value) : null)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todas las listas</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={filterStatus ?? ''} onChange={(e) => onFilterStatusChange(e.target.value ? e.target.value as LeadStatus : null)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todos los estados</option>
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select value={filterDate} onChange={(e) => onFilterDateChange(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todas las fechas</option>
            <option value="7d">Última semana</option>
            <option value="30d">Último mes</option>
            <option value="thisMonth">Este mes</option>
          </select>
          {activeFiltersCount > 0 && (
            <button onClick={() => { onFilterChange(null); onFilterStatusChange(null); onFilterDateChange(''); }} className="text-xs text-red-500 hover:text-red-700 ml-auto underline decoration-dotted">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <div className="flex-1 max-w-sm">
          <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar nombre, teléfono, email, RUT..." className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-xs text-gray-500 hidden sm:inline-block">
            {visibleCount !== totalCount ? `${visibleCount}/${totalCount} leads` : `${totalCount} leads`}
            {selectedCount > 0 && <span className="ml-1 text-blue-600 font-medium">{selectedCount} sel.</span>}
          </span>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            {compactMode ? (
              <tr>
                <th className="w-8 px-2 py-2"><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`} onClick={onSelectAll}><svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 1 : 0}/></svg></div></th>
                <th onClick={() => onSort('name')} className="text-left px-2 py-2 font-medium cursor-pointer select-none hover:bg-gray-200">
                  {nameLabel} <span className="text-gray-400 text-xs">{sortIcon('name', sort)}</span>
                </th>
                {companyVis && <th className="text-left px-2 py-2 font-medium">Empresa</th>}
                {contactLabel && <th className="text-left px-2 py-2 font-medium">{contactLabel}</th>}
                {dateVis && <th onClick={() => onSort('createdAt')} className="text-left px-2 py-2 font-medium cursor-pointer select-none hover:bg-gray-200">
                  Ingreso <span className="text-gray-400 text-xs">{sortIcon('createdAt', sort)}</span></th>}
                {listsVis && <th className="text-left px-2 py-2 font-medium">Listas</th>}
                {statusVis && <th className="text-left px-2 py-2 font-medium">Estado</th>}
                {scoreVis && <th className="text-left px-2 py-2 font-medium">Score</th>}
                <th className="w-12 px-2 py-2"></th>
              </tr>
            ) : (
              <tr>
                <th className="w-8 px-2 py-2"><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`} onClick={onSelectAll}><svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 1 : 0}/></svg></div></th>
                {nameVis && <th onClick={() => onSort('name')} draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'name')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'name')); }} className="text-left px-2 py-2 font-medium cursor-pointer select-none hover:bg-gray-200">
                  Nombre <span className="text-gray-400 text-xs">{sortIcon('name', sort)}</span></th>}
                {phoneVis && <th draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'phone')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'phone')); }} className="text-left px-2 py-2 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100">Teléfono</th>}
                {emailVis && <th draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'email')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'email')); }} className="text-left px-2 py-2 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100">Email</th>}
                {companyVis && <th draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'company')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'company')); }} className="text-left px-2 py-2 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100">Empresa</th>}
                {rutVis && <th onClick={() => onSort('rut')} draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'rut')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'rut')); }} className="text-left px-2 py-2 font-medium cursor-pointer select-none hover:bg-gray-200">
                  RUT <span className="text-gray-400 text-xs">{sortIcon('rut', sort)}</span></th>}
                {dateVis && <th onClick={() => onSort('createdAt')} draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'createdAt')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'createdAt')); }} className="text-left px-2 py-2 font-medium cursor-pointer select-none hover:bg-gray-200">
                  Ingreso <span className="text-gray-400 text-xs">{sortIcon('createdAt', sort)}</span></th>}
                {listsVis && <th draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'lists')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'lists')); }} className="text-left px-2 py-2 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100">Listas</th>}
                {statusVis && <th draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'status')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'status')); }} className="text-left px-2 py-2 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100">Estado</th>}
                <th className="w-12 px-2 py-2"></th>
              </tr>
            )}
          </thead>
          <tbody ref={tbodyRef}>
            {leads.length === 0 ? (
              <tr><td colSpan={headerColSpan + 1} className="px-3 py-12 text-center text-gray-400">
                <div className="text-3xl mb-2 opacity-30">👥</div>
                <p className="text-sm font-medium">No hay leads</p>
                <p className="text-xs mt-1">Creá uno o importá desde un archivo</p>
              </td></tr>
            ) : compactMode ? (
              leads.map((lead, idx) => (
                <tr key={lead.id} data-row-index={idx} data-lead-id={lead.id!} className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${selectedIds.has(lead.id!) ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}>
                  <td className="px-2 py-1.5"><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedIds.has(lead.id!) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600 bg-white'}`}><svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={selectedIds.has(lead.id!) ? 1 : 0}/></svg></div></td>
                  <td className="px-2 py-1.5">
                    <div className="font-medium text-xs flex items-center gap-1.5">
                      {shortName(lead.name)}
                      {sendCounts[lead.id!]?.whatsapp > 0 && (
                        <span onClick={(e) => { e.stopPropagation(); onView(lead); }} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-green-500 rounded-full cursor-pointer hover:bg-green-600 shadow-sm" title={`${sendCounts[lead.id!].whatsapp} WhatsApp(s) enviado(s)`}>
                          {sendCounts[lead.id!].whatsapp}
                        </span>
                      )}
                      {sendCounts[lead.id!]?.email > 0 && (
                        <span onClick={(e) => { e.stopPropagation(); onView(lead); }} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 shadow-sm" title={`${sendCounts[lead.id!].email} Email(s) enviado(s)`}>
                          {sendCounts[lead.id!].email}
                        </span>
                      )}
                      {filterMode === 'olvidados' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 whitespace-nowrap">
                          {Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24))} días olv.
                        </span>
                      )}
                    </div>
                    {rutVis && lead.rut && <div className="text-xs text-gray-500 font-mono">RUT: {lead.rut}</div>}
                    {nameVis && !rutVis && !lead.rut && <div className="text-xs text-gray-400">-</div>}
                  </td>
                  {companyVis && <td className="px-2 py-1.5 text-xs">{lead.company || '-'}</td>}
                  <td className="px-2 py-1.5">
                    {phoneVis && <div className="text-xs">{lead.phone ? <a href={`https://wa.me/${lead.phone.replace(/[^+\d]/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2" title="Abrir WhatsApp">{lead.phone}</a> : '-'}</div>}
                    {emailVis && <div className="text-xs text-blue-600">{lead.email ? <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2" title={`Enviar email a ${lead.email}`}>{lead.email.length > 13 ? <span title={lead.email}>{lead.email.slice(0, 10)}...</span> : lead.email}</a> : '-'}</div>}
                  </td>
                  {dateVis && <td className="px-2 py-1.5 text-xs text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString('es-CL')}</td>}
                  {listsVis && <td className="px-2 py-1.5">
                    <div className="flex gap-0.5 flex-wrap">
                      {lead.listaIds.map((lid) => {
                        const list = listsMap.get(lid);
                        return list ? <span key={lid} className="px-1 py-0.5 rounded text-xs text-white" style={{ backgroundColor: list.color }}>{list.name}</span> : null;
                      })}
                    </div></td>}
                  {statusVis && <td className="px-2 py-1.5"><span className="px-1.5 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: STATUS_COLORS[lead.status || 'nuevo'] }}>{STATUS_LABELS[lead.status || 'nuevo']}</span></td>}
                  {scoreVis && <td className="px-2 py-1.5 text-xs text-amber-500">{'★'.repeat(getScore(lead))}{'☆'.repeat(5 - getScore(lead))}</td>}
                  <td className="px-1 py-1.5">
                    <div className="flex gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); onView(lead); }} title="Ver" className="text-gray-400 hover:text-blue-600 text-xs p-0.5">{Icon.View()}</button>
                      {isTrash ? (
                        <>
                          {onRestore && <button onClick={(e) => { e.stopPropagation(); onRestore(lead.id!); }} title="Restaurar" className="text-gray-400 hover:text-green-600 text-xs p-0.5">{Icon.Restore()}</button>}
                          <button onClick={(e) => { e.stopPropagation(); onDelete(lead.id!); }} title="Eliminar definitivo" className="text-gray-400 hover:text-red-600 text-xs p-0.5">{Icon.Trash()}</button>
                        </>
                      ) : (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Editar" className="text-gray-400 hover:text-blue-600 text-xs p-0.5">{Icon.Edit()}</button>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(lead.id!); }} title="Eliminar" className="text-gray-400 hover:text-red-600 text-xs p-0.5">{Icon.Trash()}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              leads.map((lead, idx) => (
                <tr key={lead.id} data-row-index={idx} data-lead-id={lead.id!} className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${selectedIds.has(lead.id!) ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}>
                  <td className="px-2 py-1.5"><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedIds.has(lead.id!) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600 bg-white'}`}><svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={selectedIds.has(lead.id!) ? 1 : 0}/></svg></div></td>
                  {nameVis && <td className="px-2 py-1.5 font-medium text-xs">
                    <div className="flex items-center gap-1.5">
                      {lead.name}
                      {sendCounts[lead.id!]?.whatsapp > 0 && (
                        <span onClick={(e) => { e.stopPropagation(); onView(lead); }} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-green-500 rounded-full cursor-pointer hover:bg-green-600 shadow-sm" title={`${sendCounts[lead.id!].whatsapp} WhatsApp(s) enviado(s)`}>
                          {sendCounts[lead.id!].whatsapp}
                        </span>
                      )}
                      {sendCounts[lead.id!]?.email > 0 && (
                        <span onClick={(e) => { e.stopPropagation(); onView(lead); }} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 shadow-sm" title={`${sendCounts[lead.id!].email} Email(s) enviado(s)`}>
                          {sendCounts[lead.id!].email}
                        </span>
                      )}
                      {filterMode === 'olvidados' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 whitespace-nowrap">
                          {Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24))} días olv.
                        </span>
                      )}
                    </div>
                  </td>}
                  {phoneVis && <td className="px-2 py-1.5 text-xs">{lead.phone}</td>}
                  {emailVis && <td className="px-2 py-1.5 text-xs text-blue-600">{lead.email ? <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2" title={`Enviar email a ${lead.email}`}>{lead.email.length > 13 ? <span title={lead.email}>{lead.email.slice(0, 10)}...</span> : lead.email}</a> : '-'}</td>}
                  {companyVis && <td className="px-2 py-1.5 text-xs">{lead.company || '-'}</td>}
                  {rutVis && <td className="px-2 py-1.5 text-xs font-mono">{lead.rut || '-'}</td>}
                  {dateVis && <td className="px-2 py-1.5 text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString('es-CL')}</td>}
                  {listsVis && <td className="px-2 py-1.5">
                    <div className="flex gap-0.5 flex-wrap">
                      {lead.listaIds.map((lid) => {
                        const list = listsMap.get(lid);
                        return list ? <span key={lid} className="px-1 py-0.5 rounded text-xs text-white" style={{ backgroundColor: list.color }}>{list.name}</span> : null;
                      })}
                    </div></td>}
                  <td className="px-1 py-1.5">
                    <div className="flex gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); onView(lead); }} title="Ver" className="text-gray-400 hover:text-blue-600 text-xs p-0.5">{Icon.View()}</button>
                      {isTrash ? (
                        <>
                          {onRestore && <button onClick={(e) => { e.stopPropagation(); onRestore(lead.id!); }} title="Restaurar" className="text-gray-400 hover:text-green-600 text-xs p-0.5">{Icon.Restore()}</button>}
                          <button onClick={(e) => { e.stopPropagation(); onDelete(lead.id!); }} title="Eliminar definitivo" className="text-gray-400 hover:text-red-600 text-xs p-0.5">{Icon.Trash()}</button>
                        </>
                      ) : (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Editar" className="text-gray-400 hover:text-blue-600 text-xs p-0.5">{Icon.Edit()}</button>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(lead.id!); }} title="Eliminar" className="text-gray-400 hover:text-red-600 text-xs p-0.5">{Icon.Trash()}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
