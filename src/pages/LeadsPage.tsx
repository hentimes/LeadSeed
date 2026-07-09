import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import type { Lead, LeadList, ExportFormat, LeadStatus } from '../types';
import { STATUS_LABELS } from '../types';
import LeadsTable from '../components/LeadsTable';
import LeadForm from '../components/LeadForm';
import LeadDetail from '../components/LeadDetail';
import ImportModal from '../components/ImportModal';
import { useSort } from '../hooks/useSort';
import type { ColumnDef } from '../components/ColumnSelector';
import { ParsedRow } from '../utils/importParser';
import { exportToJSON, exportToExcel } from '../utils/exportData';
import { getSettings } from '../db/database';
import { Icon } from '../utils/icons';

function extractRut(lead: Lead): string {
  return lead.rut || '';
}

export default function LeadsPage({ compactMode, visibleCols, onColsChange }: { compactMode: boolean; visibleCols: ColumnDef[]; onColsChange?: (cols: ColumnDef[]) => void }) {
  const { getAll, getDeleted, save, remove, restore, permanentDelete, purgeOldDeleted, addToList, importLeads, refreshKey } = useLeads();
  const { getAll: getLists } = useLists();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ id: number; name: string } | null>(null);
  const [filterListId, setFilterListId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  useEffect(() => {
    getSettings().then((s) => setExportFormat(s.exportFormat));
  }, []);

  const existingRuts = useMemo(() => {
    const ruts = new Set<string>();
    for (const lead of leads) {
      if (lead.rut) ruts.add(lead.rut);
    }
    return ruts;
  }, [leads]);

  const existingPhones = useMemo(() => {
    const phones = new Set<string>();
    for (const lead of leads) {
      if (lead.phone) {
        phones.add(lead.phone.replace(/[^+\d]/g, ''));
      }
    }
    return phones;
  }, [leads]);

  const loadLeads = async () => {
    if (showTrash) {
      setLeads(await getDeleted());
    } else {
      setLeads(await getAll());
    }
  };

  const loadLists = async () => {
    const data = await getLists();
    setLists(data);
  };

  useEffect(() => {
    loadLeads();
    loadLists();
  }, [refreshKey, showTrash]);

  const filtered = useMemo(() => {
    let result = leads;
    if (filterListId !== null) {
      result = result.filter((l) => l.listaIds.includes(filterListId));
    }
    if (filterStatus !== null) {
      result = result.filter((l) => (l.status || 'nuevo') === filterStatus);
    }
    if (filterDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (filterDate === '7d') {
        const cutoff = new Date(today.getTime() - 7 * 86400000).toISOString();
        result = result.filter((l) => l.createdAt >= cutoff);
      } else if (filterDate === '30d') {
        const cutoff = new Date(today.getTime() - 30 * 86400000).toISOString();
        result = result.filter((l) => l.createdAt >= cutoff);
      } else if (filterDate === 'thisMonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        result = result.filter((l) => l.createdAt >= start);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.rut.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, filterListId, filterStatus, filterDate, search]);

  const { sort, toggle: onSort, sorted } = useSort(filtered, {
    createdAt: (l) => l.createdAt,
    name: (l) => l.name.toLowerCase(),
    rut: (l) => extractRut(l),
  });

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === sorted.length) {
        return new Set();
      }
      return new Set(sorted.map((l) => l.id!));
    });
  }, [sorted]);

  const rangeSelect = useCallback((from: number, to: number, select: boolean) => {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const idsInRange = sorted.slice(start, end + 1).map((l) => l.id!);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of idsInRange) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, [sorted]);

  const handleSave = async (lead: Lead) => {
    // Detectar duplicados
    const dupRut = lead.rut && existingRuts.has(lead.rut);
    const dupPhone = lead.phone && existingPhones.has(lead.phone.replace(/[^+\d]/g, ''));
    // Si es edición del mismo lead, no es duplicado
    const isSelfRut = lead.id && leads.find((l) => l.id === lead.id)?.rut === lead.rut;
    const isSelfPhone = lead.id && leads.find((l) => l.id === lead.id)?.phone === lead.phone;
    if ((dupRut && !isSelfRut) || (dupPhone && !isSelfPhone)) {
      const msgs: string[] = [];
      if (dupRut && !isSelfRut) msgs.push(`RUT ${lead.rut} ya existe`);
      if (dupPhone && !isSelfPhone) msgs.push(`Teléfono ${lead.phone} ya existe`);
      if (!confirm(`${msgs.join(' y ')}. ¿Guardar de todas formas?`)) return;
    }
    await save(lead);
    setEditing(null);
    setShowForm(false);
    loadLeads();
  };

  const handleDelete = async (id: number) => {
    const lead = leads.find((l) => l.id === id);
    if (showTrash) {
      if (!confirm('¿Eliminar definitivamente?')) return;
      await permanentDelete(id);
    } else {
      await remove(id);
      if (lead) {
        setToast({ id, name: lead.name });
        setTimeout(() => setToast((prev) => prev?.id === id ? null : prev), 6000);
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    loadLeads();
  };

  const handleUndoDelete = async (id: number) => {
    await restore(id);
    setToast(null);
    loadLeads();
  };

  const handleRestore = async (id: number) => {
    await restore(id);
    setSelectedIds(new Set());
    loadLeads();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (showTrash) {
      if (!confirm(`¿Eliminar definitivamente ${selectedIds.size} leads?`)) return;
      for (const id of selectedIds) await permanentDelete(id);
    } else {
      if (!confirm(`¿Mover ${selectedIds.size} leads a la papelera?`)) return;
      for (const id of selectedIds) await remove(id);
    }
    setSelectedIds(new Set());
    loadLeads();
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) await restore(id);
    setSelectedIds(new Set());
    loadLeads();
  };

  const handleBulkStatusChange = async (status: LeadStatus) => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) await save({ id, status } as Lead);
    loadLeads();
  };

  const handleAddToList = async (listaId: number) => {
    for (const id of selectedIds) {
      await addToList(id, listaId);
    }
    loadLeads();
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    let data: Lead[];
    if (selectedIds.size > 0) {
      data = leads.filter((l) => selectedIds.has(l.id!));
    } else if (filterListId !== null || filterStatus !== null || filterDate || search.trim()) {
      data = sorted;  // vista actual filtrada
    } else {
      data = leads;   // todos los leads
    }
    if (exportFormat === 'excel') exportToExcel(data);
    else exportToJSON(data);
  };

  const handleImport = async (rows: ParsedRow[]) => {
    await importLeads(rows);
    loadLeads();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Leads</h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleExport}
            title={`Exportar ${selectedIds.size > 0 ? 'seleccionados' : filterListId || filterStatus || filterDate || search.trim() ? 'vista actual' : 'todos'} como ${exportFormat.toUpperCase()}`}
            className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700"
          >
            Exportar
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-700"
          >
            Importar
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            Nuevo Lead
          </button>
          <button
            onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}
            className={`px-3 py-2 rounded text-sm font-medium ${showTrash ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            title={showTrash ? 'Volver a leads' : 'Papelera'}
          >
            {showTrash ? 'Salir de papelera' : Icon.Trash()}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3">{editing ? 'Editar Lead' : 'Nuevo Lead'}</h3>
          <LeadForm
            lead={editing}
            lists={lists}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} seleccionados
          </span>
          <button
            onClick={handleExport}
            title={`Exportar seleccionados como ${exportFormat.toUpperCase()}`}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700"
          >
            Exportar
          </button>
          {showTrash ? (
            <>
              <button onClick={handleBulkRestore} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700">
                Restaurar seleccionados
              </button>
              <button onClick={handleBulkDelete} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700">
                Eliminar definitivo
              </button>
            </>
          ) : (
            <button onClick={handleBulkDelete} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700">
              Eliminar seleccionados
            </button>
          )}
          {!showTrash && (
            <select
              onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value as LeadStatus); e.target.value = ''; }}
              className="border border-blue-300 rounded px-2 py-1 text-xs bg-white"
              defaultValue=""
            >
              <option value="" disabled>Cambiar estado...</option>
              {(['nuevo', 'contactado', 'interesado', 'convertido', 'descartado'] as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600">Agregar a lista:</span>
            {lists.length === 0 ? (
              <span className="text-xs text-gray-400">No hay listas. Créalas en la pestaña Listas.</span>
            ) : (
              lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => handleAddToList(list.id!)}
                  className="px-2 py-1 rounded-full text-xs text-white font-medium hover:ring-2 hover:ring-offset-1 cursor-pointer"
                  style={{ backgroundColor: list.color, border: `2px solid ${list.color}` }}
                >
                  {list.name}
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-blue-600 hover:text-blue-800 ml-auto"
          >
            Deseleccionar todo
          </button>
        </div>
      )}

      <LeadsTable
        leads={sorted}
        lists={lists}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onRangeSelect={rangeSelect}
        onSelectAll={selectAll}
        onEdit={(lead) => { setEditing(lead); setShowForm(true); }}
        onView={setViewing}
        onDelete={handleDelete}
        onRestore={showTrash ? handleRestore : undefined}
        isTrash={showTrash}
        filterListId={filterListId}
        onFilterChange={setFilterListId}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterDate={filterDate}
        onFilterDateChange={setFilterDate}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSort={onSort}
        totalCount={leads.length}
        visibleCount={sorted.length}
        selectedCount={selectedIds.size}
        visibleCols={visibleCols}
        onColsChange={onColsChange || (() => {})}
        onReorderCols={(from, to) => {
          if (onColsChange && from >= 2 && to >= 2) {
            const newCols = [...visibleCols];
            const [moved] = newCols.splice(from, 1);
            newCols.splice(to, 0, moved);
            onColsChange(newCols);
          }
        }}
        compactMode={compactMode}
        lastClickedIndex={lastClickedIndex}
        onSetLastClicked={setLastClickedIndex}
      />

      {showImport && (
        <ImportModal
          existingRuts={existingRuts}
          existingPhones={existingPhones}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {viewing && (
        <LeadDetail
          lead={viewing}
          lists={lists}
          onClose={() => setViewing(null)}
          onEdit={(lead) => { setEditing(lead); setShowForm(true); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center animate-toast-in">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-sm">
            <span>{toast.name} movido a la papelera</span>
            <button onClick={() => handleUndoDelete(toast.id)} className="text-blue-400 hover:text-blue-300 font-medium underline">Deshacer</button>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-300 ml-1">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}
