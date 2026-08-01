import { useEffect, useRef, useMemo, useState } from 'react';
import type { Lead, LeadList, LeadStatus } from '../../types';
import type { SortConfig, SortField } from '../../hooks/useSort';
import type { ColumnDef } from '../ColumnSelector';
import { Icon } from '../../utils/icons';
import { useSendCounts } from '../../hooks/useSendCounts';
import LeadsTableControls from './LeadsTableControls';
import LeadsTableRow from './LeadsTableRow';
import LoadingOverlay from '../LoadingOverlay';
import { useResponsiveColumns } from '../../hooks/useResponsiveColumns';
import { LEAD_COLUMN_BY_KEY } from '../../config/leadColumns';

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
  onTogglePin: (lead: Lead, isPinned: boolean) => void;
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
  /** Nuevo orden de los ids de leads fijados. */
  onReorderPinned?: (orderedIds: string[]) => void;
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
  onEdit, onView, onDelete, onRestore, onTogglePin, isTrash, filterMode, filterListId, onFilterChange, filterStatus, onFilterStatusChange, filterDate, onFilterDateChange, search, onSearchChange,
  sort, onSort, totalCount, visibleCount, selectedCount, currentPage, pageCount, pageSize, isLoadingPage, onPageChange, visibleCols, onColsChange,
  compactMode, lastClickedIndex, onSetLastClicked, leftActions, bulkActions,
  onReorderCols, onReorderPinned,
}: Props) {
  const sendCounts = useSendCounts();
  
  const { containerRef, renderedColumns, hiddenByWidth } = useResponsiveColumns(visibleCols);

  const [dragColKey, setDragColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);
  const [pinDragId, setPinDragId] = useState<string | null>(null);
  const [pinOverId, setPinOverId] = useState<string | null>(null);

  /** Reordena los leads fijados; el resto de la lista no se toca. */
  const handlePinDrop = () => {
    const sourceId = pinDragId;
    const targetId = pinOverId;
    setPinDragId(null);
    setPinOverId(null);
    if (!sourceId || !targetId || sourceId === targetId) return;

    const pinnedIds = leads.filter((lead) => lead.isPinned).map((lead) => lead.id!);
    const from = pinnedIds.indexOf(sourceId);
    const to = pinnedIds.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const reordered = [...pinnedIds];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    onReorderPinned?.(reordered);
  };

  const headPad = compactMode ? 'px-2 py-2.5' : 'px-2 py-2';
  const allSelected = selectedIds.size > 0 && selectedIds.size === leads.length && leads.length > 0;

  /**
   * Mueve la columna arrastrada a la posicion de la soltada, operando sobre
   * la lista completa y no sobre la visible: el indice tiene que ser el real.
   */
  const handleColumnDrop = (targetKey: string, droppedKey?: string) => {
    // El dataTransfer es la fuente confiable; el estado es solo respaldo.
    const sourceKey = droppedKey || dragColKey;
    setDragColKey(null);
    setDragOverColKey(null);
    if (!sourceKey || sourceKey === targetKey) return;

    const from = visibleCols.findIndex((column) => column.key === sourceKey);
    const to = visibleCols.findIndex((column) => column.key === targetKey);
    if (from < 0 || to < 0) return;

    onReorderCols?.(from, to);
  };

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

      <div ref={containerRef} className="card-standard overflow-x-auto w-full min-w-0">
        <table className="w-full text-[13px] text-[#161A24]">
          <thead className="border-b border-[#E6EAF0] text-[#5B6475] bg-white">
            <tr>
              <th className={`w-8 ${headPad}`}>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${allSelected ? 'bg-[#6C4CF6] border-[#6C4CF6]' : 'border-[#E6EAF0] bg-white'}`}
                  onClick={onSelectAll}
                >
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={allSelected ? 1 : 0} />
                  </svg>
                </div>
              </th>

              {renderedColumns.map((column) => {
                const definition = LEAD_COLUMN_BY_KEY.get(column.key);
                const sortField = definition?.sortField;
                const isDragTarget = dragOverColKey === column.key && dragColKey !== column.key;

                return (
                  <th
                    key={column.key}
                    draggable={!definition?.fixed}
                    onDragStart={(event) => {
                      // setData es obligatorio: sin el, Chrome puede no
                      // llegar a disparar el drop.
                      event.dataTransfer.setData('text/plain', column.key);
                      event.dataTransfer.effectAllowed = 'move';
                      setDragColKey(column.key);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverColKey(column.key);
                    }}
                    onDragLeave={() => setDragOverColKey((current) => (current === column.key ? null : current))}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleColumnDrop(column.key, event.dataTransfer.getData('text/plain'));
                    }}
                    onDragEnd={() => {
                      setDragColKey(null);
                      setDragOverColKey(null);
                    }}
                    onClick={sortField ? () => onSort(sortField) : undefined}
                    style={{ minWidth: definition?.width }}
                    className={`text-left ${headPad} font-medium select-none whitespace-nowrap ${
                      sortField ? 'cursor-pointer hover:bg-gray-50' : 'cursor-grab active:cursor-grabbing hover:bg-gray-50'
                    } ${isDragTarget ? 'bg-[#F2EEFF] border-l-2 border-l-[#6C4CF6]' : ''} ${dragColKey === column.key ? 'opacity-40' : ''}`}
                    title={definition?.fixed ? undefined : 'Arrastra para reordenar'}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {sortField && <span className="text-gray-400 text-xs flex-shrink-0">{sortIcon(sortField, sort)}</span>}
                    </div>
                  </th>
                );
              })}

              <th className={`w-[100px] min-w-[100px] ${headPad} text-right sticky right-0 bg-white shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10 font-normal`}>
                <span className="text-[11px] text-[#5B6475] font-medium whitespace-nowrap">
                  {hiddenByWidth > 0 ? `+${hiddenByWidth} col.` : `Pag. ${currentPage}/${pageCount}`}
                </span>
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {isLoadingPage && leads.length === 0 ? (
              <tr><td colSpan={100} className="p-0 text-center text-slate-400">
                <LoadingOverlay message="Cargando leads..." />
              </td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={100} className="px-3 py-12 text-center text-gray-400">
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
                  columns={renderedColumns}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRestore={onRestore}
                  onTogglePin={onTogglePin}
                  getScore={getScore}
                  shortName={shortName}
                  isPinDragging={pinDragId === lead.id}
                  onPinDragStart={onReorderPinned ? setPinDragId : undefined}
                  onPinDragOver={setPinOverId}
                  onPinDrop={handlePinDrop}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Bottom Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center items-center mt-6 gap-1">
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || !!isLoadingPage} className="btn btn-secondary w-8 h-8 flex items-center justify-center p-0">
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
          
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= pageCount || !!isLoadingPage} className="btn btn-secondary w-8 h-8 flex items-center justify-center p-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      )}
    </div>
  );
}
