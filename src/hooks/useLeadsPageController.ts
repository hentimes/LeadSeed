import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDismissibleToast } from './useDismissibleToast';
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
import { isActiveAppointment } from '../utils/appointmentStatus';
import { getPlatform } from '../platform/registry';
import { useLeadsSelection } from './useLeadsSelection';

/** Cuanto dura en pantalla un aviso antes de apagarse solo. */
const TOAST_DURACION_MS = 6000;

/** El de anclado es mas corto: confirma una accion trivial y reversible. */
const PIN_TOAST_DURACION_MS = 3000;

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
  const selection = useLeadsSelection(leads);
  const [filteredCount, setFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [leadIdentities, setLeadIdentities] = useState<Array<{ id: string; rut: string; phone: string }>>([]);

  const [editing, setEditing] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewing, setViewing] = useState<Lead | null>(null);
  // Los tres avisos usan el mismo hook: apagarse solos, cancelar el anterior y
  // limpiarse al desmontar. Antes cada uno repetia ese patron a mano.
  const deleteToast = useDismissibleToast<{ id: string; name: string }>(TOAST_DURACION_MS);
  const newLeadToast = useDismissibleToast<{ id: string; name: string }>(TOAST_DURACION_MS);
  // Momento en que se abrio la seccion. Solo se avisa de leads creados despues
  // de este instante: comparar contra los ids de la pagina anterior daba falsos
  // positivos al cambiar de pagina y al reordenarse la lista.
  const openedAtRef = useRef(Date.now());

  // Abre el detalle y apaga el resaltado de "sin abrir" en el acto. El detalle
  // ya persiste is_read en la base; esto solo evita que la fila siga teñida
  // hasta el proximo refetch.
  const viewLead = useCallback((lead: Lead) => {
    setViewing(lead);
    if (!lead.isUnread) return;
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, isUnread: false } : item)),
    );
  }, []);
  const pinToast = useDismissibleToast<{ name: string; isPinned: boolean }>(PIN_TOAST_DURACION_MS);
  const [showTrash, setShowTrash] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [sort, setSort] = useState<{ field: LeadSortField; dir: 'asc' | 'desc' }>({ field: 'createdAt', dir: 'desc' });

  const {
    filterListId, setFilterListId,
    filterStatus, setFilterStatus,
    filterDate, setFilterDate,
    filterOrigin, setFilterOrigin,
    filterCaptureLinkId, setFilterCaptureLinkId,
    filterSourceChannel, setFilterSourceChannel,
    search, setSearch,
  } = useLeadFilters();

  useEffect(() => {
    const route = getPlatform().navigation.current();
    setFilterMode(route?.name === 'leads' && route.filter === 'olvidados' ? 'olvidados' : null);
    if (route?.name === 'leads' && route.action === 'new') {
      setEditing(null);
      setShowForm(true);
      getPlatform().navigation.replace({ name: 'leads' });
    }
  }, []);

  useEffect(() => {
    void getSettings().then((settings) => setExportFormat(settings.exportFormat));
  }, []);

  useEffect(() => {
    const { scrollLock } = getPlatform();

    if (showForm) {
      scrollLock.lock();
    } else {
      scrollLock.unlock();
    }

    return () => scrollLock.unlock();
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

    if (appointmentId && isActiveAppointment(appointmentStatus)) {
      return appointmentId;
    }

    if (!lead.id) return '';
    if (!lead.scheduledAt && !isActiveAppointment(appointmentStatus)) {
      return '';
    }

    const range = getDefaultAgendaRange(365);
    const appointments = await listMyAppointments(range.from, range.to);
    const appointment = appointments.find(
      (item) => item.leadId === lead.id && isActiveAppointment(item.status),
    );

    return appointment?.id || '';
  }, []);

  const confirmDeleteLeadWithAgenda = (_leadName: string, isPermanent: boolean): Promise<boolean> => {
    const actionLabel = isPermanent ? 'eliminar definitivamente' : 'eliminar';
    return getPlatform().dialogs.confirm(
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
      origin: filterOrigin,
      captureLinkId: filterCaptureLinkId,
      sourceChannel: filterSourceChannel,
      sortField: sort.field,
      sortDirection: sort.dir,
      deleted: showTrash,
    };

    let data: Lead[] = [];
    // Sin valor inicial a proposito: las tres ramas de abajo los asignan antes
    // de leerlos, y poner un 0 aqui haria pensar que existe un caso por defecto.
    let nextFilteredCount: number;
    let nextTotalCount: number;

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

    const currentRoute = getPlatform().navigation.current();
    const leadIdFromHash = currentRoute?.name === 'leads' ? (currentRoute.leadId ?? '') : '';
    if (leadIdFromHash) {
      const leadFromHash = data.find((lead) => lead.id === leadIdFromHash);
      if (leadFromHash) {
        setViewing(leadFromHash);
        getPlatform().navigation.replace({ name: 'leads' });
      } else {
        const fetchedLead = await getById(leadIdFromHash);
        if (fetchedLead) {
          setViewing(fetchedLead);
          getPlatform().navigation.replace({ name: 'leads' });
        }
      }
    }

    setFilteredCount(nextFilteredCount);
    setTotalCount(nextTotalCount);
    setLeads((prev) => {
      if (!showTrash && prev.length > 0) {
        const previousIds = new Set(prev.map((lead) => lead.id));
        // Un lead avisa solo si ademas de no estar antes fue creado despues de
        // abrir la seccion. Sin esa segunda condicion bastaba con pasar de
        // pagina (ningun id coincide) o con que la lista se reordenara para
        // que apareciera un aviso de lead nuevo que no lo era.
        const incomingNewLeads = data.filter(
          (lead) =>
            lead.id &&
            !previousIds.has(lead.id) &&
            Date.parse(lead.createdAt) > openedAtRef.current,
        );
        const newestLead = incomingNewLeads.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

        if (newestLead?.id) {
          newLeadToast.show({ id: newestLead.id, name: newestLead.name });
        }
      }

      return data;
    });
    setIsLoadingPage(false);
  }, [
    currentPage,
    filterCaptureLinkId,
    filterDate,
    filterListId,
    filterMode,
    filterOrigin,
    filterSourceChannel,
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
    selection.clear();
  }, [filterCaptureLinkId, filterDate, filterListId, filterMode, filterOrigin, filterSourceChannel, filterStatus, search, showTrash, sort.field, sort.dir]);

  const onSort = useCallback((field: LeadSortField) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }, []);




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
      if (!(await getPlatform().dialogs.confirm(`${messages.join(' y ')}. Guardar de todas formas?`))) return;
    }

    await save(lead);
    setShowForm(false);
    setEditing(null);
    void loadLeads();
  };

  const handleTogglePin = async (lead: Lead, isPinned: boolean) => {
    await save({ ...lead, isPinned });
    pinToast.show({ name: lead.name, isPinned });
    await loadLeads();
  };

  const handleExport = async () => {
    let data: Lead[];
    if (selection.selectedIds.size > 0) {
      data = leads.filter((lead) => selection.selectedIds.has(lead.id!));
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
        if (!(await confirmDeleteLeadWithAgenda(lead?.name || 'este lead', true))) return;
        if (lead) await cancelLeadAppointmentBeforeDelete(lead, appointmentId);
      } else if (!(await getPlatform().dialogs.confirm('Eliminar definitivamente?'))) {
        return;
      }
      await permanentDelete(id);
    } else {
      if (hasActiveAppointment) {
        if (!(await confirmDeleteLeadWithAgenda(lead?.name || 'este lead', false))) return;
        if (lead) await cancelLeadAppointmentBeforeDelete(lead, appointmentId);
      }
      await remove(id);
      if (lead) {
        deleteToast.show({ id, name: lead.name });
      }
    }
    selection.remove(id);
    await loadLeads();
  };

  const handleUndoDelete = async (id: string) => {
    await restore(id);
    deleteToast.dismiss();
    await loadLeads();
  };

  const handleRestore = async (id: string) => {
    await restore(id);
    selection.clear();
    await loadLeads();
  };

  const handleBulkDelete = async () => {
    if (selection.selectedIds.size === 0) return;
    const selectedLeads = leads.filter((lead) => lead.id && selection.selectedIds.has(lead.id));
    const appointmentEntries = await Promise.all(
      selectedLeads.map(async (lead) => ({ lead, appointmentId: await resolveActiveAppointmentId(lead) })),
    );
    const leadsWithAppointments = appointmentEntries.filter((entry) => entry.appointmentId);

    if (showTrash) {
      if (leadsWithAppointments.length > 0) {
        const aceptado = await getPlatform().dialogs.confirm(
          `${leadsWithAppointments.length} de los ${selection.selectedIds.size} leads seleccionados tienen hora agendada. Si confirmas, el sistema va a eliminar definitivamente esos leads y se va a eliminar tambien la hora agendada asociada. Estas seguro?`,
        );
        if (!aceptado) return;
      } else if (!(await getPlatform().dialogs.confirm(`Eliminar definitivamente ${selection.selectedIds.size} leads?`))) {
        return;
      }
      for (const entry of leadsWithAppointments) await cancelLeadAppointmentBeforeDelete(entry.lead, entry.appointmentId);
      for (const id of selection.selectedIds) await permanentDelete(id);
    } else {
      if (leadsWithAppointments.length > 0) {
        const aceptado = await getPlatform().dialogs.confirm(
          `${leadsWithAppointments.length} de los ${selection.selectedIds.size} leads seleccionados tienen hora agendada. Si confirmas, el sistema va a eliminar esos leads y se va a eliminar tambien la hora agendada asociada. Estas seguro?`,
        );
        if (!aceptado) return;
      } else if (!(await getPlatform().dialogs.confirm(`Mover ${selection.selectedIds.size} leads a la papelera?`))) {
        return;
      }
      for (const entry of leadsWithAppointments) await cancelLeadAppointmentBeforeDelete(entry.lead, entry.appointmentId);
      for (const id of selection.selectedIds) await remove(id);
    }
    selection.clear();
    await loadLeads();
  };

  const handleBulkRestore = async () => {
    if (selection.selectedIds.size === 0) return;
    for (const id of selection.selectedIds) await restore(id);
    selection.clear();
    await loadLeads();
  };

  const handleBulkStatusChange = async (status: LeadStatus) => {
    if (selection.selectedIds.size === 0) return;
    for (const id of selection.selectedIds) await save({ id, status } as Lead);
    await loadLeads();
  };

  const handleAddToList = async (listaId: number) => {
    for (const id of selection.selectedIds) await addToList(id, listaId);
    await loadLeads();
    selection.clear();
  };

  const handleImport = async (rows: ParsedRow[]) => {
    if (!hasFeature('pro:unlimited_leads') && totalCount + rows.length > 100) {
      await getPlatform().dialogs.alert('Has superado el limite de 100 prospectos del plan Free. Actualiza tu plan para poder importar mas leads.');
      return;
    }

    await importLeads(rows.map((row) => ({ ...row, score: 0 })));
    await loadLeads();
  };

  const handleReorderPinned = async (orderedIds: string[]) => {
    await reorderPinned(orderedIds, leads);
    await loadLeads();
  };

  const handleNewLeadClick = async () => {
    if (!hasFeature('pro:unlimited_leads') && totalCount >= 100) {
      await getPlatform().dialogs.alert('Has superado el limite de 100 prospectos del plan Free. Mejora tu plan para tener leads ilimitados.');
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
    selectedIds: selection.selectedIds,
    clearSelection: selection.clear,
    lastClickedIndex: selection.lastClickedIndex,
    setLastClickedIndex: selection.setLastClickedIndex,
    editing,
    setEditing,
    showForm,
    setShowForm,
    showImport,
    setShowImport,
    viewing,
    setViewing,
    viewLead,
    toast: deleteToast.toast,
    dismissToast: deleteToast.dismiss,
    newLeadToast: newLeadToast.toast,
    dismissNewLeadToast: newLeadToast.dismiss,
    pinToast: pinToast.toast,
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
    filterOrigin,
    setFilterOrigin,
    filterCaptureLinkId,
    setFilterCaptureLinkId,
    filterSourceChannel,
    setFilterSourceChannel,
    search,
    setSearch,

    existingRuts,
    existingPhones,
    loadLeads,

    onSort,
    toggleSelect: selection.toggle,
    selectAll: selection.toggleAll,
    rangeSelect: selection.selectRange,
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
