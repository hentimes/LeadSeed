import type { LeadList, LeadStatus, ExportFormat } from '../../types';
import { PIPELINE_STAGES, STATUS_LABELS } from '../../types';

interface BulkActionBarProps {
  selectedIds: Set<string>;
  showTrash: boolean;
  exportFormat: ExportFormat;
  lists: LeadList[];
  onExport: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onAddToList: (listaId: number) => void;
  onClearSelection: () => void;
}

export default function BulkActionBar({
  selectedIds,
  showTrash,
  exportFormat,
  lists,
  onExport,
  onRestore,
  onDelete,
  onStatusChange,
  onAddToList,
  }: BulkActionBarProps) {
  if (selectedIds.size === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-[6px]">
        {selectedIds.size} sel.
      </span>
      <button
        onClick={onExport}
        title={`Exportar seleccionados como ${exportFormat.toUpperCase()}`}
        className="text-ink-secondary px-2 py-1 rounded text-[12px] font-medium hover:bg-surface-hover transition-colors"
      >
        Exportar
      </button>
      {showTrash ? (
        <>
          <button onClick={onRestore} className="text-green-700 px-2 py-1 rounded text-[12px] font-medium hover:bg-green-50 transition-colors">
            Restaurar
          </button>
          <button onClick={onDelete} className="text-red-700 px-2 py-1 rounded text-[12px] font-medium hover:bg-red-50 transition-colors">
            Eliminar def.
          </button>
        </>
      ) : (
        <button onClick={onDelete} className="text-red-600 px-2 py-1 rounded text-[12px] font-medium hover:bg-red-50 transition-colors">
          Eliminar
        </button>
      )}
      {!showTrash && (
        <>
          <select
            onChange={(e) => { if (e.target.value) onStatusChange(e.target.value as LeadStatus); e.target.value = ''; }}
            className="rounded px-1.5 py-1 text-[12px] text-ink-secondary hover:bg-surface-hover outline-none cursor-pointer border-none bg-transparent font-medium"
            defaultValue=""
          >
            <option value="" disabled>Estado...</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            onChange={(e) => { if (e.target.value) onAddToList(Number(e.target.value)); e.target.value = ''; }}
            className="rounded px-1.5 py-1 text-[12px] text-ink-secondary hover:bg-surface-hover outline-none cursor-pointer border-none bg-transparent font-medium"
            defaultValue=""
          >
            <option value="" disabled>Lista...</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
