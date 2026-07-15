import type { LeadList, LeadStatus, ExportFormat } from '../../types';
import { STATUS_LABELS } from '../../types';

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
  onClearSelection,
}: BulkActionBarProps) {
  if (selectedIds.size === 0) return null;

  return (
    <div className="mb-3 p-2 bg-blue-50/50 border border-blue-100 rounded flex items-center gap-2 flex-wrap shadow-sm">
      <span className="text-xs font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded">
        {selectedIds.size} sel.
      </span>
      <button
        onClick={onExport}
        title={`Exportar seleccionados como ${exportFormat.toUpperCase()}`}
        className="bg-white border border-gray-200 text-gray-700 px-1.5 py-1 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
      >
        Exportar
      </button>
      {showTrash ? (
        <>
          <button onClick={onRestore} className="bg-white border border-green-200 text-green-700 px-1.5 py-1 rounded text-xs font-medium hover:bg-green-50 transition-colors">
            Restaurar
          </button>
          <button onClick={onDelete} className="bg-white border border-red-200 text-red-700 px-1.5 py-1 rounded text-xs font-medium hover:bg-red-50 transition-colors">
            Eliminar def.
          </button>
        </>
      ) : (
        <button onClick={onDelete} className="bg-white border border-red-200 text-red-600 px-1.5 py-1 rounded text-xs font-medium hover:bg-red-50 transition-colors flex items-center gap-1">
          Eliminar
        </button>
      )}
      {!showTrash && (
        <>
          <select
            onChange={(e) => { if (e.target.value) onStatusChange(e.target.value as LeadStatus); e.target.value = ''; }}
            className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white text-gray-700 outline-none focus:border-blue-300"
            defaultValue=""
          >
            <option value="" disabled>Estado...</option>
            {(['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'] as LeadStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            onChange={(e) => { if (e.target.value) onAddToList(Number(e.target.value)); e.target.value = ''; }}
            className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white text-gray-700 outline-none focus:border-blue-300"
            defaultValue=""
          >
            <option value="" disabled>Lista...</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
        </>
      )}
      <button
        onClick={onClearSelection}
        className="text-xs text-gray-500 hover:text-gray-700 ml-auto underline decoration-dotted"
      >
        Deseleccionar
      </button>
    </div>
  );
}
