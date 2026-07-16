import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import { useLeadFilters } from '../hooks/useLeadFilters';
import type { ExportFormat, Lead, LeadList, LeadStatus } from '../types';
import { supabase } from '../lib/supabaseClient';
import LeadsTable from '../components/leads/LeadsTable';
import LeadForm from '../components/leads/LeadForm';
import LeadDetail from '../components/leads/LeadDetail';
import ImportModal from '../components/leads/ImportModal';
import BulkActionBar from '../components/leads/BulkActionBar';
import { useSort } from '../hooks/useSort';
import type { ColumnDef } from '../components/ColumnSelector';
import { ParsedRow } from '../utils/importParser';
import { exportToJSON, exportToExcel } from '../utils/exportData';
import { getSettings } from '../db/database';
import { Icon } from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';

function extractRut(lead: Lead): string {
  return lead.rut || '';
}

export default function LeadsPage({ compactMode, visibleCols, onColsChange }: { compactMode: boolean; visibleCols: ColumnDef[]; onColsChange?: (cols: ColumnDef[]) => void }) {
  const { getAll, getDeleted, save, remove, restore, permanentDelete, purgeOldDeleted, addToList, importLeads, refreshKey } = useLeads();
  const { getAll: getLists } = useLists();

  const [filterMode, setFilterMode] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('filter=olvidados')) {
      setFilterMode('olvidados');
    } else {
      setFilterMode(null);
    }
    if (hash.includes('action=new')) {
      setEditing(null);
      setShowForm(true);
      window.location.hash = '#leads'; // reset hash to avoid opening on reload
    }
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ id: string; name: string } | null>(null);
  
  const [showTrash, setShowTrash] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  
  const { hasFeature } = useAuth();

  const { filtered, filterListId, setFilterListId, filterStatus, setFilterStatus, filterDate, setFilterDate, search, setSearch } = useLeadFilters(leads);

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
    let data = showTrash ? await getDeleted() : await getAll();
    
    if (!showTrash && filterMode === 'olvidados') {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      const { data: logsData } = await supabase.from('send_logs').select('lead_id').eq('user_id', userId);
      const logLeadIds = new Set((logsData || []).map(l => l.lead_id));
      
      data = data.filter(l => {
        const daysSince = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 3600 * 24));
        if (daysSince <= 7) return false;
        return !logLeadIds.has(l.id);
      });
    }

    setLeads(data);
  };

  const loadLists = async () => {
    const data = await getLists();
    setLists(data);
  };

  useEffect(() => {
    loadLeads();
    loadLists();
  }, [refreshKey, showTrash, filterMode]);

  const { sort, toggle: onSort, sorted } = useSort(filtered, {
    createdAt: (l) => l.createdAt,
    name: (l) => l.name.toLowerCase(),
    rut: (l) => extractRut(l),
  });

  const toggleSelect = useCallback((id: string) => {
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
    const dupRut = lead.rut && existingRuts.has(lead.rut);
    const dupPhone = lead.phone && existingPhones.has(lead.phone.replace(/[^+\d]/g, ''));
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

  const handleDelete = async (id: string) => {
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

  const handleUndoDelete = async (id: string) => {
    await restore(id);
    setToast(null);
    loadLeads();
  };

  const handleRestore = async (id: string) => {
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
      data = sorted;
    } else {
      data = leads;
    }
    if (exportFormat === 'excel') exportToExcel(data);
    else exportToJSON(data);
  };

  const handleImport = async (rows: ParsedRow[]) => {
    // Si no tiene límite ilimitado, verificar que la suma no pase de 100
    if (!hasFeature('pro:unlimited_leads') && leads.length + rows.length > 100) {
      alert('Has superado el límite de 100 prospectos del plan Free. Actualiza tu plan para poder importar más leads.');
      return;
    }
    await importLeads(rows as any);
    loadLeads();
  };

  const handleNewLeadClick = () => {
    if (!hasFeature('pro:unlimited_leads') && leads.length >= 100) {
      alert('Has superado el límite de 100 prospectos del plan Free. ¡Mejora tu plan para tener leads ilimitados!');
      return;
    }
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">Leads</h2>
        <div className="flex gap-2 items-center">
          <div className="flex gap-2 mb-0 items-center">
            {filterMode === 'olvidados' && (
              <span className="bg-red-600 text-white text-xs px-2.5 py-1.5 rounded font-medium flex items-center gap-1.5 shadow-sm">
                Olvidados
                <button onClick={() => { setFilterMode(null); window.location.hash = '#leads'; }} className="opacity-80 hover:opacity-100 transition-opacity font-bold ml-1"></button>
              </span>
            )}
            <button
              onClick={handleNewLeadClick}
              className="bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              + Lead
            </button>
          </div>
          <button
            onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex items-center ${showTrash ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-gray-200'}`}
            title={showTrash ? 'Volver a leads' : 'Papelera'}
          >
            {showTrash ? 'Salir de papelera' : Icon.Trash()}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
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
        filterMode={filterMode}
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
          onImport={handleImport as any}
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
