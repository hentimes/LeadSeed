import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import { useLeadFilters } from '../hooks/useLeadFilters';
import type { Lead, LeadList, ExportFormat, LeadStatus } from '../types';
import LeadsTable from '../components/LeadsTable';
import LeadForm from '../components/LeadForm';
import LeadDetail from '../components/LeadDetail';
import ImportModal from '../components/ImportModal';
import BulkActionBar from '../components/leads/BulkActionBar';
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
  
  const { filtered, filterListId, setFilterListId, filterStatus, setFilterStatus, filterDate, setFilterDate, search, setSearch } = useLeadFilters(leads);

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

  // Los leads filtrados ahora se manejan con useLeadFilters

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
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Leads</h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleExport}
            title={`Exportar ${selectedIds.size > 0 ? 'seleccionados' : filterListId || filterStatus || filterDate || search.trim() ? 'vista actual' : 'todos'} como ${exportFormat.toUpperCase()}`}
            className="bg-green-600 text-white px-2.5 py-1.5 rounded text-xs font-medium hover:bg-green-700 transition-colors"
          >
            Exportar
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            Importar
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            + Lead
          </button>
          <button
            onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex items-center ${showTrash ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title={showTrash ? 'Volver a leads' : 'Papelera'}
          >
            {showTrash ? 'Salir de papelera' : Icon.Trash()}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-base font-semibold mb-3">{editing ? 'Editar Lead' : 'Nuevo Lead'}</h3>
          <LeadForm
            lead={editing}
            lists={lists}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      <BulkActionBar
        selectedIds={selectedIds}
        showTrash={showTrash}
        exportFormat={exportFormat}
        lists={lists}
        onExport={handleExport}
        onRestore={handleBulkRestore}
        onDelete={handleBulkDelete}
        onStatusChange={handleBulkStatusChange}
        onAddToList={handleAddToList}
        onClearSelection={() => setSelectedIds(new Set())}
      />

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
