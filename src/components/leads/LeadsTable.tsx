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
  currentPage: number;
  pageCount: number;
  pageSize: number;
  isLoadingPage?: boolean;
  onPageChange: (page: number) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
  onReorderCols?: (from: number, to: number) => void;
  compactMode: boolean;
  lastClickedIndex: number | null;
  onSetLastClicked: (index: number) => void;
  leftActions?: React.ReactNode;
  bulkActions?: React.ReactNode;
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
  sort, onSort, totalCount, visibleCount, selectedCount, currentPage, pageCount, pageSize, isLoadingPage, onPageChange, visibleCols, onColsChange,
  compactMode, lastClickedIndex, onSetLastClicked, leftActions, bulkActions,
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
        leftActions={leftActions}
        bulkActions={bulkActions}
        search={search}
        onSearchChange={onSearchChange}
        totalCount={totalCount}
        visibleCount={visibleCount}
        selectedCount={selectedCount}
        currentPage={currentPage}
        pageCount={pageCount}
        pageSize={pageSize}
        isLoadingPage={isLoadingPage}
        onPageChange={onPageChange}
        lists={lists}
        filterListId={filterListId}
        onFilterChange={onFilterChange}
        filterStatus={filterStatus}
        onFilterStatusChange={onFilterStatusChange}
        filterDate={filterDate}
        onFilterDateChange={onFilterDateChange}
      />

      <div className="bg-white border border-[#E6EAF0] rounded-[6px] overflow-x-auto shadow-sm w-full min-w-0">
        <table className="w-full text-[13px] text-[#161A24]">
          <thead className="border-b border-[#E6EAF0] text-[#5B6475] bg-white">
            {compactMode ? (
              <tr>
                <th className="w-8 px-2 py-3"><div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 'bg-[#6C4CF6] border-[#6C4CF6]' : 'border-[#E6EAF0] bg-white'}`} onClick={onSelectAll}><svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0 ? 1 : 0}/></svg></div></th>
                <th onClick={() => onSort('name')} className="text-left px-3 py-3 font-medium cursor-pointer select-none hover:bg-gray-50 w-[30%] min-w-[140px]">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    {nameLabel} <span className="text-gray-400 text-xs flex-shrink-0">{sortIcon('name', sort)}</span>
                  </div>
                </th>
                {companyVis && <th className="text-left px-3 py-3 font-medium w-[15%] min-w-[100px]">Empresa</th>}
                {contactLabel && <th className="text-left px-3 py-3 font-medium w-[25%] min-w-[130px]">{contactLabel}</th>}
                {dateVis && <th onClick={() => onSort('createdAt')} className="text-left px-3 py-3 font-medium cursor-pointer select-none hover:bg-gray-50 w-[15%] min-w-[80px]">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    Ingreso <span className="text-gray-400 text-xs flex-shrink-0">{sortIcon('createdAt', sort)}</span>
                  </div>
                </th>}
                {listsVis && <th className="text-left px-3 py-3 font-medium w-[20%] min-w-[100px]">Listas</th>}
                {statusVis && <th className="text-left px-3 py-3 font-medium w-[15%] min-w-[80px]">Estado</th>}
                {scoreVis && <th className="text-left px-3 py-3 font-medium w-[10%] min-w-[70px]">Score</th>}
                <th className="w-[100px] min-w-[100px] px-3 py-3 text-right sticky right-0 bg-white shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10 font-normal">
                  <span className="text-[11px] text-[#5B6475] font-medium whitespace-nowrap">Pag. {currentPage}/{pageCount}</span>
                </th>
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
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    RUT <span className="text-gray-400 text-xs flex-shrink-0">{sortIcon('rut', sort)}</span>
                  </div>
                </th>}
                {dateVis && <th onClick={() => onSort('createdAt')} draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'createdAt')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'createdAt')); }} className="text-left px-2 py-2 font-medium cursor-pointer select-none hover:bg-gray-200">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    Ingreso <span className="text-gray-400 text-xs flex-shrink-0">{sortIcon('createdAt', sort)}</span>
                  </div>
                </th>}
                {listsVis && <th draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'lists')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'lists')); }} className="text-left px-2 py-2 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100">Listas</th>}
                {statusVis && <th draggable onDragStart={(e) => e.dataTransfer.setData('col-key', 'status')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onReorderCols?.(visibleCols.findIndex(c => c.key === e.dataTransfer.getData('col-key')), visibleCols.findIndex(c => c.key === 'status')); }} className="text-left px-2 py-2 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100">Estado</th>}
                <th className="w-[100px] min-w-[100px] px-2 py-2 text-right sticky right-0 bg-white shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10 font-normal">
                  <span className="text-[11px] text-[#5B6475] font-medium whitespace-nowrap">Pag. {currentPage}/{pageCount}</span>
                </th>
              </tr>
            )}
          </thead>
          <tbody ref={tbodyRef}>
            {isLoadingPage && leads.length === 0 ? (
              <tr><td colSpan={headerColSpan + 1} className="px-3 py-12 text-center text-slate-400 dark:text-slate-500">
                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"></div>
                <p className="text-sm font-medium">Cargando leads...</p>
              </td></tr>
            ) : leads.length === 0 ? (
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
      
      {/* Bottom Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center items-center mt-6 gap-1">
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || !!isLoadingPage} className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E6EAF0] bg-white text-[#5B6475] hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => {
            if (p === 1 || p === pageCount || (p >= currentPage - 1 && p <= currentPage + 1)) {
              return (
                <button key={p} onClick={() => onPageChange(p)} disabled={!!isLoadingPage} className={`w-8 h-8 flex items-center justify-center rounded-[6px] text-[13px] font-medium transition-colors ${p === currentPage ? 'bg-[#F2EEFF] text-[#6C4CF6]' : 'text-[#5B6475] hover:bg-gray-50'}`}>
                  {p}
                </button>
              );
            }
            if (p === currentPage - 2 || p === currentPage + 2) {
              return <span key={p} className="w-8 h-8 flex items-center justify-center text-[#5B6475]">...</span>;
            }
            return null;
          })}
          
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= pageCount || !!isLoadingPage} className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#E6EAF0] bg-white text-[#5B6475] hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      )}
    </div>
  );
}
