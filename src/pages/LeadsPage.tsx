import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLists } from '../hooks/useLists';
import { useLeadFilters } from '../hooks/useLeadFilters';
import type { ExportFormat, Lead, LeadList, LeadStatus, Page } from '../types';
import LeadsTable from '../components/leads/LeadsTable';
import LeadForm from '../components/leads/LeadForm';
import LeadDetail from '../components/leads/LeadDetail';
import ImportModal from '../components/leads/ImportModal';
import BulkActionBar from '../components/leads/BulkActionBar';
import { useSort } from '../hooks/useSort';
import type { ColumnDef } from '../components/ColumnSelector';
import type { ParsedRow } from '../utils/importParser';
import { exportToJSON, exportToExcel } from '../utils/exportData';
import { getSettings } from '../db/database';
import { Icon } from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';
import { fetchSentLeadIdsSetForUser } from '../services/historyService';
import { cancelMyAppointment, getDefaultAgendaRange, listMyAppointments } from '../services/agendaService';

const ACTIVE_APPOINTMENT_STATUSES = new Set(['pendiente', 'agendada', 'confirmada', 'tentativa']);

function extractRut(lead: Lead): string {
  return lead.rut || '';
}

function getLeadAppointmentMetadata(lead: Lead): { appointmentId: string; appointmentStatus: string } {
  const metadata = (lead.metadata || {}) as Record<string, unknown>;
  const appointmentId = typeof metadata.appointment_id === 'string' ? metadata.appointment_id.trim() : '';
  const appointmentStatus = typeof metadata.appointment_status === 'string' ? metadata.appointment_status.trim().toLowerCase() : '';
  return { appointmentId, appointmentStatus };
}

interface LeadsPageProps {
  compactMode: boolean;
  visibleCols: ColumnDef[];
  onColsChange?: (cols: ColumnDef[]) => void;
  onNavigate?: (page: Page) => void;
}

export default function LeadsPage({ compactMode, visibleCols, onColsChange, onNavigate }: LeadsPageProps) {
  const { getAll, getDeleted, save, remove, restore, permanentDelete, addToList, importLeads, refreshKey } = useLeads();
  const { getAll: getLists } = useLists();
  const { hasFeature, user } = useAuth();

  const [filterMode, setFilterMode] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ id: string; name: string } | null>(null);
  const [newLeadToast, setNewLeadToast] = useState<{ id: string; name: string } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');

  const { filtered, filterListId, setFilterListId, filterStatus, setFilterStatus, filterDate, setFilterDate, search, setSearch } = useLeadFilters(leads);

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
      window.location.hash = '#leads';
    }
  }, []);

  useEffect(() => {
    void getSettings().then((settings) => setExportFormat(settings.exportFormat));
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
      if (lead.phone) phones.add(lead.phone.replace(/[^+\d]/g, ''));
    }
    return phones;
  }, [leads]);

  const resolveActiveAppointmentId = useCallback(async (lead: Lead): Promise<string> => {
    const { appointmentId, appointmentStatus } = getLeadAppointmentMetadata(lead);

    if (appointmentId && ACTIVE_APPOINTMENT_STATUSES.has(appointmentStatus)) {
      return appointmentId;
    }

    if (!lead.id) return '';
    if (!lead.scheduledAt && !ACTIVE_APPOINTMENT_STATUSES.has(appointmentStatus)) {
      return '';
    }

    const range = getDefaultAgendaRange(365);
    const appointments = await listMyAppointments(range.from, range.to);
    const appointment = appointments.find(
      (item) => item.leadId === lead.id && ACTIVE_APPOINTMENT_STATUSES.has(item.status.toLowerCase()),
    );

    return appointment?.id || '';
  }, []);

  const confirmDeleteLeadWithAgenda = (leadName: string, isPermanent: boolean): boolean => {
    const actionLabel = isPermanent ? 'eliminar definitivamente' : 'eliminar';
    return confirm(
      `Este lead tiene una hora agendada. Si confirmas, el sistema va a ${actionLabel} este lead y se va a eliminar tambien la hora agendada. Estas seguro?`,
    );
  };

  const cancelLeadAppointmentBeforeDelete = useCallback(async (lead: Lead, appointmentId: string): Promise<void> => {
    if (!appointmentId) return;
    const result = await cancelMyAppointment(appointmentId, `Cita cancelada por eliminacion del lead ${lead.name}`);
    if (result.googleSyncError) {
      console.warn('Google Calendar quedo pendiente al cancelar cita por eliminacion de lead:', result.googleSyncError);
    }
  }, []);

  const loadLeads = async () => {
    let data = showTrash ? await getDeleted() : await getAll();

    if (!showTrash && filterMode === 'olvidados' && user?.id) {
      const logLeadIds = await fetchSentLeadIdsSetForUser(user.id);
      data = data.filter((lead) => {
        const daysSince = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24));
        if (daysSince <= 7) return false;
        return !lead.id || !logLeadIds.has(lead.id);
      });
    }

    const leadHashMatch = window.location.hash.match(/[?&]lead=([^&]+)/);
    const leadIdFromHash = leadHashMatch ? decodeURIComponent(leadHashMatch[1]) : '';
    if (leadIdFromHash) {
      const leadFromHash = data.find((lead) => lead.id === leadIdFromHash);
      if (leadFromHash) {
        setViewing(leadFromHash);
        window.location.hash = '#leads';
      }
    }

    setLeads((prev) => {
      if (!showTrash && prev.length > 0) {
        const previousIds = new Set(prev.map((lead) => lead.id));
        const incomingNewLeads = data.filter((lead) => lead.id && !previousIds.has(lead.id));
        const newestLead = incomingNewLeads.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

        if (newestLead?.id) {
          setNewLeadToast({ id: newestLead.id, name: newestLead.name });
          setTimeout(() => {
            setNewLeadToast((current) => (current?.id === newestLead.id ? null : current));
          }, 6000);
        }
      }

      return data;
    });
  };

  const loadLists = async () => {
    setLists(await getLists());
  };

  useEffect(() => {
    void loadLeads();
    void loadLists();
  }, [refreshKey, showTrash, filterMode, user?.id]);

  const { sort, toggle: onSort, sorted } = useSort(filtered, {
    createdAt: (lead) => lead.crossExecPriorityAt || lead.createdAt,
    name: (lead) => lead.name.toLowerCase(),
    rut: extractRut,
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
      if (prev.size === sorted.length) return new Set();
      return new Set(sorted.map((lead) => lead.id!));
    });
  }, [sorted]);

  const rangeSelect = useCallback((from: number, to: number, select: boolean) => {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const idsInRange = sorted.slice(start, end + 1).map((lead) => lead.id!);
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
    const normalizedPhone = lead.phone?.replace(/[^+\d]/g, '');
    const dupPhone = normalizedPhone && existingPhones.has(normalizedPhone);
    const currentLead = lead.id ? leads.find((item) => item.id === lead.id) : undefined;
    const isSelfRut = !!lead.id && currentLead?.rut === lead.rut;
    const isSelfPhone = !!lead.id && currentLead?.phone === lead.phone;

    if ((dupRut && !isSelfRut) || (dupPhone && !isSelfPhone)) {
      const messages: string[] = [];
      if (dupRut && !isSelfRut) messages.push(`RUT ${lead.rut} ya existe`);
      if (dupPhone && !isSelfPhone) messages.push(`Telefono ${lead.phone} ya existe`);
      if (!confirm(`${messages.join(' y ')}. Guardar de todas formas?`)) return;
    }

    await save(lead);
    setEditing(null);
    setShowForm(false);
    await loadLeads();
  };

  const handleDelete = async (id: string) => {
    const lead = leads.find((item) => item.id === id);
    const appointmentId = lead ? await resolveActiveAppointmentId(lead) : '';
    const hasActiveAppointment = !!appointmentId;

    if (showTrash) {
      if (hasActiveAppointment) {
        if (!confirmDeleteLeadWithAgenda(lead?.name || 'este lead', true)) return;
        if (lead) await cancelLeadAppointmentBeforeDelete(lead, appointmentId);
      } else if (!confirm('Eliminar definitivamente?')) {
        return;
      }
      await permanentDelete(id);
    } else {
      if (hasActiveAppointment) {
        if (!confirmDeleteLeadWithAgenda(lead?.name || 'este lead', false)) return;
        if (lead) await cancelLeadAppointmentBeforeDelete(lead, appointmentId);
      }
      await remove(id);
      if (lead) {
        setToast({ id, name: lead.name });
        setTimeout(() => setToast((prev) => (prev?.id === id ? null : prev)), 6000);
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await loadLeads();
  };

  const handleUndoDelete = async (id: string) => {
    await restore(id);
    setToast(null);
    await loadLeads();
  };

  const handleRestore = async (id: string) => {
    await restore(id);
    setSelectedIds(new Set());
    await loadLeads();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const selectedLeads = leads.filter((lead) => lead.id && selectedIds.has(lead.id));
    const appointmentEntries = await Promise.all(
      selectedLeads.map(async (lead) => ({ lead, appointmentId: await resolveActiveAppointmentId(lead) })),
    );
    const leadsWithAppointments = appointmentEntries.filter((entry) => entry.appointmentId);

    if (showTrash) {
      if (leadsWithAppointments.length > 0) {
        if (
          !confirm(
            `${leadsWithAppointments.length} de los ${selectedIds.size} leads seleccionados tienen hora agendada. Si confirmas, el sistema va a eliminar definitivamente esos leads y se va a eliminar tambien la hora agendada asociada. Estas seguro?`,
          )
        ) return;
      } else if (!confirm(`Eliminar definitivamente ${selectedIds.size} leads?`)) {
        return;
      }
      for (const entry of leadsWithAppointments) await cancelLeadAppointmentBeforeDelete(entry.lead, entry.appointmentId);
      for (const id of selectedIds) await permanentDelete(id);
    } else {
      if (leadsWithAppointments.length > 0) {
        if (
          !confirm(
            `${leadsWithAppointments.length} de los ${selectedIds.size} leads seleccionados tienen hora agendada. Si confirmas, el sistema va a eliminar esos leads y se va a eliminar tambien la hora agendada asociada. Estas seguro?`,
          )
        ) return;
      } else if (!confirm(`Mover ${selectedIds.size} leads a la papelera?`)) {
        return;
      }
      for (const entry of leadsWithAppointments) await cancelLeadAppointmentBeforeDelete(entry.lead, entry.appointmentId);
      for (const id of selectedIds) await remove(id);
    }
    setSelectedIds(new Set());
    await loadLeads();
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) await restore(id);
    setSelectedIds(new Set());
    await loadLeads();
  };

  const handleBulkStatusChange = async (status: LeadStatus) => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) await save({ id, status } as Lead);
    await loadLeads();
  };

  const handleAddToList = async (listaId: number) => {
    for (const id of selectedIds) await addToList(id, listaId);
    await loadLeads();
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    let data: Lead[];
    if (selectedIds.size > 0) {
      data = leads.filter((lead) => selectedIds.has(lead.id!));
    } else if (filterListId !== null || filterStatus !== null || filterDate || search.trim()) {
      data = sorted;
    } else {
      data = leads;
    }

    if (exportFormat === 'excel') exportToExcel(data);
    else exportToJSON(data);
  };

  const handleImport = async (rows: ParsedRow[]) => {
    if (!hasFeature('pro:unlimited_leads') && leads.length + rows.length > 100) {
      alert('Has superado el limite de 100 prospectos del plan Free. Actualiza tu plan para poder importar mas leads.');
      return;
    }

    await importLeads(rows.map((row) => ({ ...row, score: 0 })));
    await loadLeads();
  };

  const handleNewLeadClick = () => {
    if (!hasFeature('pro:unlimited_leads') && leads.length >= 100) {
      alert('Has superado el limite de 100 prospectos del plan Free. Mejora tu plan para tener leads ilimitados.');
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
                <button onClick={() => { setFilterMode(null); window.location.hash = '#leads'; }} className="opacity-80 hover:opacity-100 transition-opacity font-bold ml-1" />
              </span>
            )}
            <button onClick={handleNewLeadClick} className="bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
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
          <LeadForm lead={editing} lists={lists} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
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
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {viewing && (
        <LeadDetail
          lead={viewing}
          lists={lists}
          onClose={() => { setViewing(null); void loadLeads(); }}
          onEdit={(lead) => { setEditing(lead); setShowForm(true); }}
          onNavigate={onNavigate}
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

      {newLeadToast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center animate-toast-in">
          <div className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-lg flex items-center gap-3">
            <span>Nuevo lead: {newLeadToast.name}</span>
            <button
              onClick={() => {
                const lead = leads.find((item) => item.id === newLeadToast.id);
                if (lead) setViewing(lead);
                setNewLeadToast(null);
              }}
              className="font-medium underline text-white/90 hover:text-white"
            >
              Ver
            </button>
            <button onClick={() => setNewLeadToast(null)} className="ml-1 text-white/80 hover:text-white">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}
