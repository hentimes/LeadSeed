import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLeads } from './useLeads';
import { useLists } from './useLists';
import { useLeadFilters } from './useLeadFilters';
import type { ExportFormat, Lead, LeadList, LeadStatus } from '../types';
import type { ParsedRow } from '../utils/importParser';
import { exportToJSON, exportToExcel } from '../utils/exportData';
import { getSettings } from '../services/appSettingsService';
import { useAuth } from '../contexts/AuthContext';
import { cancelMyAppointment, getDefaultAgendaRange, listMyAppointments } from '../services/agendaService';
import type { LeadPageQuery, LeadSortField } from '../repositories/leadsRepository';

const ACTIVE_APPOINTMENT_STATUSES = new Set(['pendiente', 'agendada', 'confirmada', 'tentativa']);
const PAGE_SIZE = 50;

function getLeadAppointmentMetadata(lead: Lead): { appointmentId: string; appointmentStatus: string } {
  const metadata = (lead.metadata || {}) as Record<string, unknown>;
  const appointmentId = typeof metadata.appointment_id === 'string' ? metadata.appointment_id.trim() : '';
  const appointmentStatus = typeof metadata.appointment_status === 'string' ? metadata.appointment_status.trim().toLowerCase() : '';
  return { appointmentId, appointmentStatus };
}

export function useLeadsPageController() {
  const { getAll, getDeleted, getPage, getForgottenPage, getIdentities, getById, save, remove, restore, permanentDelete, addToList, importLeads, refreshKey, getPinned, reorderPinned } = useLeads();
  const { getAll: getLists } = useLists();
  const { hasFeature, user } = useAuth();

  const pageSize = PAGE_SIZE;

  const [filterMode, setFilterMode] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [leadIdentities, setLeadIdentities] = useState<Array<{ id: string; rut: string; phone: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ id: string; name: string } | null>(null);
  const [newLeadToast, setNewLeadToast] = useState<{ id: string; name: string } | null>(null);
  const [pinToast, setPinToast] = useState<{ name: string; isPinned: boolean } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [sort, setSort] = useState<{ field: LeadSortField; dir: 'asc' | 'desc' }>({ field: 'createdAt', dir: 'desc' });

  const { filterListId, setFilterListId, filterStatus, setFilterStatus, filterDate, setFilterDate, search, setSearch } = useLeadFilters();

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

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showForm]);

  const existingRuts = useMemo(() => {
    const ruts = new Set<string>();
    for (const lead of leadIdentities) {
      if (lead.rut) ruts.add(lead.rut);
    }
    return ruts;
  }, [leadIdentities]);

  const existingPhones = useMemo(() => {
    const phones = new Set<string>();
    for (const lead of leadIdentities) {
      if (lead.phone) phones.add(lead.phone.replace(/[^+\d]/g, ''));
    }
    return phones;
  }, [leadIdentities]);

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

  const loadLeadIdentities = useCallback(async () => {
    if (!user || showTrash || (!showForm && !showImport)) {
      setLeadIdentities([]);
      return;
    }
    setLeadIdentities(await getIdentities());
  }, [getIdentities, showForm, showImport, showTrash, user]);

  const loadLeads = useCallback(async () => {
    const pageQuery: LeadPageQuery = {
      page: currentPage,
      pageSize,
      search,
      listId: filterListId,
      status: filterStatus,
      dateFilter: filterDate,
      sortField: sort.field,
      sortDirection: sort.dir,
      deleted: showTrash,
    };

    let data: Lead[] = [];
    let nextFilteredCount = 0;
    let nextTotalCount = 0;

    setIsLoadingPage(true);

    if (showTrash) {
      const pageData = await getPage(pageQuery);
      data = pageData.items;
      nextFilteredCount = pageData.filteredCount;
      nextTotalCount = pageData.totalCount;
    } else {
      let pageData;
      if (filterMode === 'olvidados' && user?.id) {
        pageData = await getForgottenPage(pageQuery);
      } else {
        pageData = await getPage(pageQuery);
      }

      const allPinned = await getPinned();
      const pinnedIds = new Set(allPinned.map((p) => p.id));
      const nonPinnedItems = pageData.items.filter((item) => !pinnedIds.has(item.id));

      data = [...allPinned, ...nonPinnedItems];
      nextFilteredCount = pageData.filteredCount;
      nextTotalCount = pageData.totalCount;
    }

    if (currentPage > 1 && data.length === 0 && nextFilteredCount > 0) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
      setIsLoadingPage(false);
      return;
    }

    const leadHashMatch = window.location.hash.match(/[?&]lead=([^&]+)/);
    const leadIdFromHash = leadHashMatch ? decodeURIComponent(leadHashMatch[1]) : '';
    if (leadIdFromHash) {
      const leadFromHash = data.find((lead) => lead.id === leadIdFromHash);
      if (leadFromHash) {
        setViewing(leadFromHash);
        window.location.hash = '#leads';
      } else {
        const fetchedLead = await getById(leadIdFromHash);
        if (fetchedLead) {
          setViewing(fetchedLead);
          window.location.hash = '#leads';
        }
      }
    }

    setFilteredCount(nextFilteredCount);
    setTotalCount(nextTotalCount);
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
    setIsLoadingPage(false);
  }, [
    currentPage,
    filterDate,
    filterListId,
    filterMode,
    filterStatus,
    getAll,
    getById,
    getForgottenPage,
    getPage,
    search,
    showTrash,
    sort.dir,
    sort.field,
    user?.id,
  ]);

  const loadLists = useCallback(async () => {
    setLists(await getLists());
  }, [getLists]);

  useEffect(() => {
    void loadLeads();
    void loadLists();
  }, [loadLeads, loadLists, refreshKey]);

  useEffect(() => {
    void loadLeadIdentities();
  }, [loadLeadIdentities]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [filterDate, filterListId, filterMode, filterStatus, search, showTrash, sort.field, sort.dir]);

  const onSort = useCallback((field: LeadSortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

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
      if (prev.size === leads.length) return new Set();
      return new Set(leads.map((lead) => lead.id!));
    });
  }, [leads]);

  const rangeSelect = useCallback(
    (from: number, to: number, select: boolean) => {
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const idsInRange = leads.slice(start, end + 1).map((lead) => lead.id!);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of idsInRange) {
          if (select) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [leads],
  );

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
    setShowForm(false);
    setEditing(null);
    void loadLeads();
  };

  const handleTogglePin = async (lead: Lead, isPinned: boolean) => {
    await save({ ...lead, isPinned });
    setPinToast({ name: lead.name, isPinned });
    setTimeout(() => {
      setPinToast(null);
    }, 3000);
    await loadLeads();
  };

  const handleExport = async () => {
    let data: Lead[];
    if (selectedIds.size > 0) {
      data = leads.filter((lead) => selectedIds.has(lead.id!));
    } else {
      data = showTrash ? await getDeleted() : await getAll();
    }

    if (exportFormat === 'excel') exportToExcel(data);
    else exportToJSON(data);
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
        )
          return;
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
        )
          return;
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

  const handleImport = async (rows: ParsedRow[]) => {
    if (!hasFeature('pro:unlimited_leads') && totalCount + rows.length > 100) {
      alert('Has superado el limite de 100 prospectos del plan Free. Actualiza tu plan para poder importar mas leads.');
      return;
    }

    await importLeads(rows.map((row) => ({ ...row, score: 0 })));
    await loadLeads();
  };

  const handleReorderPinned = async (orderedIds: string[]) => {
    await reorderPinned(orderedIds, leads);
    await loadLeads();
  };

  const handleNewLeadClick = () => {
    if (!hasFeature('pro:unlimited_leads') && totalCount >= 100) {
      alert('Has superado el limite de 100 prospectos del plan Free. Mejora tu plan para tener leads ilimitados.');
      return;
    }
    setEditing(null);
    setShowForm(true);
  };

  return {
    pageSize,
    filterMode,
    setFilterMode,
    leads,
    lists,
    totalCount,
    filteredCount,
    currentPage,
    setCurrentPage,
    isLoadingPage,
    selectedIds,
    setSelectedIds,
    lastClickedIndex,
    setLastClickedIndex,
    editing,
    setEditing,
    showForm,
    setShowForm,
    showImport,
    setShowImport,
    viewing,
    setViewing,
    toast,
    setToast,
    newLeadToast,
    setNewLeadToast,
    pinToast,
    showTrash,
    setShowTrash,
    exportFormat,
    sort,

    filterListId,
    setFilterListId,
    filterStatus,
    setFilterStatus,
    filterDate,
    setFilterDate,
    search,
    setSearch,

    existingRuts,
    existingPhones,
    loadLeads,

    onSort,
    toggleSelect,
    selectAll,
    rangeSelect,
    handleSave,
    handleTogglePin,
    handleExport,
    handleDelete,
    handleUndoDelete,
    handleRestore,
    handleBulkDelete,
    handleBulkRestore,
    handleBulkStatusChange,
    handleAddToList,
    handleImport,
    handleNewLeadClick,
    handleReorderPinned,
  };
}

export type UseLeadsPageControllerResult = ReturnType<typeof useLeadsPageController>;
