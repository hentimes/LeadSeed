import { useEffect, useRef, useMemo, useState } from 'react';
import type { Lead, LeadList, LeadStatus } from '../../types';
import { STATUS_LABELS, STATUS_COLORS } from '../../types';
import type { SortConfig, SortField } from '../../hooks/useSort';
import type { ColumnDef } from '../ColumnSelector';
import { Icon } from '../../utils/icons';
import { useSendCounts } from '../../hooks/useSendCounts';
import LeadsTableControls from './LeadsTableControls';
import LeadsTableRow from './LeadsTableRow';

interface Props {
  leads: Lead[];
  lists: LeadList[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onRangeSelect: (from: number, to: number, select: boolean) => void;
  onSelectAll: () => void;
  onEdit: (lead: Lead) => void;
  onView: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
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
      const leadId = row.getAttribute('data-lead-id')!;
      if (isNaN(idx) || !leadId) return;

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

  return (
    <div>
      <LeadsTableControls
        search={search}
        onSearchChange={onSearchChange}
        totalCount={totalCount}
        visibleCount={visibleCount}
        selectedCount={selectedCount}
        lists={lists}
        filterListId={filterListId}
        onFilterChange={onFilterChange}
        filterStatus={filterStatus}
        onFilterStatusChange={onFilterStatusChange}
        filterDate={filterDate}
        onFilterDateChange={onFilterDateChange}
      />

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 dark:bg-gray-800">
            {compactMode ? (
              <tr>
                <th className="w-8 px-2 py-2"><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md'}`} onClick={onSelectAll}><svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 1 : 0}/></svg></div></th>
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
                <th className="w-8 px-2 py-2"><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md'}`} onClick={onSelectAll}><svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 1 : 0}/></svg></div></th>
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
                <div className="text-3xl mb-2 opacity-30 flex justify-center">{Icon.Leads()}</div>
                <p className="text-sm font-medium">No hay leads</p>
                <p className="text-xs mt-1">Creá uno o importá desde un archivo</p>
              </td></tr>
            ) : (
              leads.map((lead, idx) => (
                <LeadsTableRow 
                  key={lead.id}
                  lead={lead}
                  idx={idx}
                  selectedIds={selectedIds}
                  sendCounts={sendCounts}
                  listsMap={listsMap}
                  compactMode={compactMode}
                  filterMode={filterMode}
                  isTrash={isTrash}
                  nameVis={nameVis}
                  rutVis={rutVis}
                  phoneVis={phoneVis}
                  emailVis={emailVis}
                  companyVis={companyVis}
                  dateVis={dateVis}
                  listsVis={listsVis}
                  statusVis={statusVis}
                  scoreVis={scoreVis}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRestore={onRestore}
                  getScore={getScore}
                  shortName={shortName}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
