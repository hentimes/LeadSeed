import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import type { Lead, LeadList, LeadSourceChannel, LeadStatus, Page } from '../../types';
import type { LeadOrigin, LeadSortConfig, LeadSortField } from '../../repositories/leadsRepository';
import type { ColumnDef } from '../../types';
import { Icon } from '../../utils/icons';
import { useSendCounts } from '../../hooks/useSendCounts';
import { useLeadPendingFlags } from './useLeadPendingFlags';
import { getPlatform } from '../../platform/registry';
import LeadsTableControls from './LeadsTableControls';
import LeadsTableRow from './LeadsTableRow';
import LoadingOverlay from '../LoadingOverlay';
import { useResponsiveColumns } from '../../hooks/useResponsiveColumns';
import { LEAD_COLUMN_BY_KEY } from '../../config/leadColumns';


interface Props {
  /** Para saltar a la cita o la tarea del distintivo de una fila. */
  onNavigate?: (page: Page) => void;
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
  filterOrigin: LeadOrigin | null;
  onFilterOriginChange: (origin: LeadOrigin | null) => void;
  filterCaptureLinkId: number | null;
  onFilterCaptureLinkIdChange: (id: number | null) => void;
  filterSourceChannel: LeadSourceChannel | null;
  onFilterSourceChannelChange: (channel: LeadSourceChannel | null) => void;
  ocultarSinNombre: boolean;
  onOcultarSinNombreChange: (ocultar: boolean) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sort: LeadSortConfig;
  onSort: (field: LeadSortField) => void;
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

const sortIcon = (f: LeadSortField, s: LeadSortConfig) => {
  if (s.field !== f) return Icon.Sort();
  return s.dir === 'asc' ? Icon.SortUp() : Icon.SortDown();
};

/*
 * `shortName` vivia aqui y se pasaba a cada fila como prop. Se mudo a
 * `utils/leadDisplay.ts` como `nombreCorto`, con su documentacion y sus
 * pruebas, porque la tabla de listas tenia otra funcion con el mismo nombre y
 * una regla distinta -y equivocada- para el mismo lead. La fila la importa
 * directamente, asi que la prop tambien desaparecio.
 */

export default function LeadsTable({
  onNavigate,
  leads, lists, selectedIds, onToggleSelect, onRangeSelect, onSelectAll,
  onEdit, onView, onDelete, onRestore, onTogglePin, isTrash, filterMode, filterListId, onFilterChange, filterStatus, onFilterStatusChange, filterDate, onFilterDateChange,
  filterOrigin, onFilterOriginChange, filterCaptureLinkId, onFilterCaptureLinkIdChange,
  filterSourceChannel, onFilterSourceChannelChange,
  ocultarSinNombre, onOcultarSinNombreChange, search, onSearchChange,
  sort, onSort, totalCount, visibleCount, selectedCount, currentPage, pageCount, pageSize, isLoadingPage, onPageChange, visibleCols, compactMode, lastClickedIndex, onSetLastClicked, leftActions, bulkActions,
  onReorderCols, onReorderPinned,
}: Props) {
  const sendCounts = useSendCounts();
  const pendingFlags = useLeadPendingFlags();

  /*
   * El distintivo lleva al elemento CONCRETO, no a la pantalla.
   *
   * La ruta se escribe antes de cambiar de pagina: `useAgenda` y `TasksPage`
   * leen el identificador al montarse, asi que si se navegara primero
   * llegarian a una ruta que todavia no dice a que abrir.
   */
  const abrirPendiente = useCallback(
    (destino: { citaId?: string; tareaId?: string }) => {
      const { navigation } = getPlatform();

      if (destino.citaId) {
        navigation.replace({ name: 'agenda', appointmentId: destino.citaId });
        onNavigate?.('agenda');
        return;
      }

      if (destino.tareaId) {
        navigation.replace({ name: 'tasks', taskId: destino.tareaId });
        onNavigate?.('tasks');
      }
    },
    [onNavigate],
  );
  
  const { containerRef, renderedColumns, hiddenCount, canScrollBack, canScrollForward, scrollBack, scrollForward } =
    useResponsiveColumns(visibleCols);

  const [dragColKey, setDragColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);
  /** Reordena los leads fijados; el resto de la lista no se toca. */
  const handlePinDrop = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const pinnedIds = leads.filter((lead) => lead.isPinned).map((lead) => lead.id!);
    const from = pinnedIds.indexOf(sourceId);
    const to = pinnedIds.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const reordered = [...pinnedIds];
    const [moved] = reordered.splice(from, 1);
    // splice devuelve un array vacio si `from` cae fuera de rango; en ese caso
    // no hay nada que reinsertar y reordenar no tiene sentido.
    if (moved === undefined) return;
    reordered.splice(to, 0, moved);

    onReorderPinned?.(reordered);
  };

  /*
   * Cabecera delgada, igual que la de `ListPanel`: `px-3 py-2` con texto micro
   * en mayusculas. Antes era `py-2.5` con el tamano de texto de la tabla, asi
   * que pesaba mas que las filas que encabezaba y no se parecia en nada a la
   * cabecera de las otras listas. El ternario tampoco hacia nada: las dos
   * ramas daban el mismo valor.
   */
  const headPad = 'px-3 py-2';
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
        filterOrigin={filterOrigin}
        onFilterOriginChange={onFilterOriginChange}
        filterCaptureLinkId={filterCaptureLinkId}
        onFilterCaptureLinkIdChange={onFilterCaptureLinkIdChange}
        filterSourceChannel={filterSourceChannel}
        onFilterSourceChannelChange={onFilterSourceChannelChange}
        ocultarSinNombre={ocultarSinNombre}
        onOcultarSinNombreChange={onOcultarSinNombreChange}
      />

      {/*
        La tabla vivia dentro de un `<Card>`, que trae `p-3`. Esos 12px de
        relleno dejaban aire por encima de la cabecera, y con su borde propio la
        cabecera se leia como una fila mas flotando dentro de la tarjeta en vez
        de como el techo de la lista.
        Ahora el contenedor pinta el borde y el radio pero no rellena, asi que
        la cabecera arranca pegada al borde superior: no hay nada encima de ella.
      */}
      <div className="w-full min-w-0 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div ref={containerRef} className="overflow-x-auto">
        <table className="w-full table-fixed text-[13px] text-ink">
          <thead className="border-b border-line bg-surface-muted text-micro font-bold uppercase tracking-wide text-ink-secondary">
            <tr>
              <th className={`w-8 ${headPad}`}>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${allSelected ? 'bg-primary border-primary' : 'border-line bg-surface'}`}
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
                    style={{ width: definition?.width, maxWidth: definition?.width }}
                    className={`text-left align-middle ${headPad} font-medium select-none whitespace-nowrap ${
                      sortField ? 'cursor-pointer hover:bg-surface-hover' : 'cursor-grab active:cursor-grabbing hover:bg-surface-hover'
                    } ${isDragTarget ? 'bg-primary-soft border-l-2 border-l-primary' : ''} ${dragColKey === column.key ? 'opacity-40' : ''}`}
                    title={definition?.fixed ? undefined : 'Arrastra para reordenar'}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {sortField && <span className="text-ink-muted text-xs flex-shrink-0">{sortIcon(sortField, sort)}</span>}
                    </div>
                  </th>
                );
              })}

              <th className={`w-[92px] ${headPad} sticky right-0 bg-surface shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10 font-normal`}>
                <div className="flex items-center justify-end gap-0.5">
                  {(canScrollBack || canScrollForward) ? (
                    <>
                      <button
                        type="button"
                        onClick={scrollBack}
                        disabled={!canScrollBack}
                        title="Ver columnas anteriores"
                        className="w-5 h-5 flex items-center justify-center rounded-[4px] text-ink-secondary hover:bg-primary-soft hover:text-primary disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                      </button>
                      {hiddenCount > 0 && (
                        <span className="text-[10px] text-ink-secondary font-medium tabular-nums">{hiddenCount}</span>
                      )}
                      <button
                        type="button"
                        onClick={scrollForward}
                        disabled={!canScrollForward}
                        title="Ver mas columnas"
                        className="w-5 h-5 flex items-center justify-center rounded-[4px] text-ink-secondary hover:bg-primary-soft hover:text-primary disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-ink-secondary font-medium whitespace-nowrap">Pag. {currentPage}/{pageCount}</span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {isLoadingPage && leads.length === 0 ? (
              <tr><td colSpan={100} className="p-0 text-center text-ink-muted">
                <LoadingOverlay message="Cargando leads..." />
              </td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={100} className="px-3 py-12 text-center text-ink-muted">
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
                  pendingFlags={pendingFlags}
                  onOpenPending={abrirPendiente}
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
                  onPinDrop={onReorderPinned ? handlePinDrop : undefined}
                />
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
      
      {/* Bottom Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center items-center mt-6 gap-1">
          <button aria-label="Pagina anterior" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || !!isLoadingPage} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[13px] font-medium transition-colors text-ink-secondary hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => {
            if (p === 1 || p === pageCount || (p >= currentPage - 1 && p <= currentPage + 1)) {
              return (
                <button key={p} onClick={() => onPageChange(p)} disabled={!!isLoadingPage} className={`w-8 h-8 flex items-center justify-center rounded-[6px] text-[13px] font-medium transition-colors ${p === currentPage ? 'bg-primary-soft text-primary' : 'text-ink-secondary hover:bg-surface-hover'}`}>
                  {p}
                </button>
              );
            }
            if (p === currentPage - 2 || p === currentPage + 2) {
              return <span key={p} className="w-8 h-8 flex items-center justify-center text-ink-secondary">...</span>;
            }
            return null;
          })}
          
          <button aria-label="Pagina siguiente" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= pageCount || !!isLoadingPage} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[13px] font-medium transition-colors text-ink-secondary hover:bg-surface-hover disabled:opacity-40 disabled:pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      )}
    </div>
  );
}
