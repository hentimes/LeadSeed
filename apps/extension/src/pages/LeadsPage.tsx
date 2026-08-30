import type { Page } from '../types';
import LeadsTable from '../components/leads/LeadsTable';
import LeadForm from '../components/leads/LeadForm';
import LeadDetail from '../components/leads/LeadDetail';
import ImportModal from '../components/leads/ImportModal';
import BulkActionBar from '../components/leads/BulkActionBar';
import LeadsPageToasts from '../components/leads/LeadsPageToasts';
import type { ColumnDef } from '../types';
import { Icon } from '../utils/icons';
import { useLeadsPageController } from '../hooks/useLeadsPageController';
import { Modal } from '../design/Modal';
import DiscardReasonModal from '../components/leads/DiscardReasonModal';

interface LeadsPageProps {
  compactMode: boolean;
  visibleCols: ColumnDef[];
  onColsChange?: (cols: ColumnDef[]) => void;
  onNavigate?: (page: Page) => void;
}

export default function LeadsPage({ compactMode, visibleCols, onColsChange, onNavigate }: LeadsPageProps) {
  const p = useLeadsPageController();

  return (
    <div className="flex flex-col animate-ios-slide-up pb-4 w-full min-w-0">
      {p.showForm && (
        <Modal
          onClose={() => {
            p.setShowForm(false);
            p.setEditing(null);
          }}
          label={p.editing ? 'Editar lead' : 'Nuevo lead'}
        >
          <>
            <div className="flex items-center justify-between p-4 pb-3 border-b border-line shrink-0">
              <h2 className="text-[15px] font-bold text-ink leading-tight">{p.editing ? 'Editar Lead' : 'Nuevo Lead'}</h2>
              <button
                onClick={() => {
                  p.setShowForm(false);
                  p.setEditing(null);
                }}
                className="text-ink-muted hover:text-ink-secondary transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <LeadForm
                lead={p.editing}
                lists={p.lists}
                onSave={p.handleSave}
                onCancel={() => {
                  p.setShowForm(false);
                  p.setEditing(null);
                }}
              />
            </div>
          </>
        </Modal>
      )}

      <LeadsTable
        bulkActions={
          <BulkActionBar
            selectedIds={p.selectedIds}
            showTrash={p.showTrash}
            exportFormat={p.exportFormat}
            lists={p.lists}
            onExport={() => {
              void p.handleExport();
            }}
            onRestore={p.handleBulkRestore}
            onDelete={p.handleBulkDelete}
            onStatusChange={p.handleBulkStatusChange}
            onAddToList={p.handleAddToList}
            onClearSelection={p.clearSelection}
          />
        }
        leftActions={
          <div className="flex gap-2 items-center">
            {p.filterMode === 'olvidados' && (
              <span className="bg-red-600 text-white text-[12px] px-2.5 h-[34px] rounded-[6px] font-medium flex items-center gap-1.5 shadow-sm">
                Olvidados
                <button
                  onClick={() => {
                    p.setFilterMode(null);
                    window.location.hash = '#leads';
                  }}
                  className="opacity-80 hover:opacity-100 transition-opacity font-bold ml-1"
                />
              </span>
            )}
            <button
              onClick={p.handleNewLeadClick}
              className="bg-primary text-white px-3 h-[34px] rounded-[6px] text-[13px] font-medium hover:bg-primary-hover transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nuevo lead
            </button>
            <button
              onClick={() => {
                p.setShowTrash(!p.showTrash);
                p.clearSelection();
              }}
              className={`px-2.5 h-[34px] rounded-[6px] text-[13px] font-medium transition-colors flex items-center shadow-sm border shrink-0 ${p.showTrash ? 'border-state-danger-soft bg-state-danger-soft text-state-danger-ink' : 'border-line bg-surface text-ink-secondary hover:bg-surface-hover'}`}
              title={p.showTrash ? 'Volver a leads' : 'Papelera'}
            >
              {p.showTrash ? 'Salir de papelera' : <div className="w-[14px] h-[14px] flex items-center justify-center scale-90 opacity-80">{Icon.Trash()}</div>}
            </button>
          </div>
        }
        filterMode={p.filterMode}
        leads={p.leads}
        lists={p.lists}
        selectedIds={p.selectedIds}
        onToggleSelect={p.toggleSelect}
        onRangeSelect={p.rangeSelect}
        onSelectAll={p.selectAll}
        onEdit={(lead) => {
          p.setEditing(lead);
          p.setShowForm(true);
        }}
        onView={p.viewLead}
        onDelete={p.handleDelete}
        onRestore={p.showTrash ? p.handleRestore : undefined}
        isTrash={p.showTrash}
        filterListId={p.filterListId}
        onFilterChange={p.setFilterListId}
        filterStatus={p.filterStatus}
        onFilterStatusChange={p.setFilterStatus}
        filterDate={p.filterDate}
        onFilterDateChange={p.setFilterDate}
        filterOrigin={p.filterOrigin}
        onFilterOriginChange={p.setFilterOrigin}
        filterCaptureLinkId={p.filterCaptureLinkId}
        onFilterCaptureLinkIdChange={p.setFilterCaptureLinkId}
        filterSourceChannel={p.filterSourceChannel}
        ocultarSinNombre={p.ocultarSinNombre}
        onOcultarSinNombreChange={p.setOcultarSinNombre}
        onFilterSourceChannelChange={p.setFilterSourceChannel}
        search={p.search}
        onSearchChange={p.setSearch}
        sort={p.sort}
        onSort={p.onSort}
        totalCount={p.totalCount}
        visibleCount={p.filteredCount}
        selectedCount={p.selectedIds.size}
        currentPage={p.currentPage}
        pageCount={Math.max(1, Math.ceil(p.filteredCount / p.pageSize))}
        pageSize={p.pageSize}
        isLoadingPage={p.isLoadingPage}
        onPageChange={(page) => p.setCurrentPage(Math.max(1, page))}
        visibleCols={visibleCols}
        onColsChange={onColsChange || (() => {})}
        onReorderCols={(from, to) => {
          if (onColsChange && from >= 0 && to >= 0) {
            const newCols = [...visibleCols];
            const [moved] = newCols.splice(from, 1);
            // splice devuelve vacio si el origen cae fuera de rango; sin
            // columna que mover, reordenar no significa nada.
            if (moved === undefined) return;
            newCols.splice(to, 0, moved);
            onColsChange(newCols);
          }
        }}
        compactMode={compactMode}
        onTogglePin={p.handleTogglePin}
        onReorderPinned={(orderedIds) => void p.handleReorderPinned(orderedIds)}
        lastClickedIndex={p.lastClickedIndex}
        onSetLastClicked={p.setLastClickedIndex}
      />

      {p.showImport && (
        <ImportModal
          existingRuts={p.existingRuts}
          existingPhones={p.existingPhones}
          onImport={p.handleImport}
          onClose={() => p.setShowImport(false)}
        />
      )}

      {p.viewing && (
        <LeadDetail
          lead={p.viewing}
          lists={p.lists}
          onClose={() => {
            p.setViewing(null);
            void p.loadLeads();
          }}
          onEdit={(lead) => {
            p.setEditing(lead);
            p.setShowForm(true);
          }}
          onNavigate={onNavigate}
        />
      )}

      {p.pendingDiscard !== null && (
        <DiscardReasonModal
          cantidad={p.pendingDiscard}
          onConfirm={p.confirmBulkDiscard}
          onCancel={p.cancelBulkDiscard}
        />
      )}

      <LeadsPageToasts
        toast={p.toast}
        onUndoDelete={p.handleUndoDelete}
        onDismissToast={p.dismissToast}
        pinToast={p.pinToast}
        newLeadToast={p.newLeadToast}
        onViewNewLead={() => {
          const lead = p.leads.find((item) => item.id === p.newLeadToast?.id);
          if (lead) p.setViewing(lead);
          p.dismissNewLeadToast();
        }}
        onDismissNewLeadToast={p.dismissNewLeadToast}
      />
    </div>
  );
}
