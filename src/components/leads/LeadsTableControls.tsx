import { useEffect, useState } from 'react';
import type { LeadSourceChannel, LeadStatus, LeadList } from '../../types';
import { SOURCE_CHANNEL_LABELS, STATUS_LABELS } from '../../types';
import type { LeadOrigin } from '../../repositories/leadsRepository';
import { listMyCaptureLinks } from '../../services/captureLinksService';
import type { CaptureLink } from '../../types/captureLinks';
import { Button } from '../../design';
import SinNombreToggle from './SinNombreToggle';

const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  manual: 'Manual',
  imported: 'Importado',
  web_form: 'Formulario web',
};

interface Props {
  leftActions?: React.ReactNode;
  bulkActions?: React.ReactNode;
  search: string;
  onSearchChange: (search: string) => void;
  totalCount: number;
  visibleCount: number;
  selectedCount: number;
  currentPage: number;
  pageCount: number;
  pageSize: number;
  isLoadingPage?: boolean;
  onPageChange: (page: number) => void;
  lists: LeadList[];
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
}

export default function LeadsTableControls({
  leftActions, bulkActions, search, onSearchChange, lists, filterListId, onFilterChange, filterStatus, onFilterStatusChange,
  filterDate, onFilterDateChange, filterOrigin, onFilterOriginChange,
  filterCaptureLinkId, onFilterCaptureLinkIdChange,
  filterSourceChannel, onFilterSourceChannelChange,
  ocultarSinNombre, onOcultarSinNombreChange,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'listas' | 'estados' | 'fechas' | 'origen' | 'canal'>('listas');
  const [captureLinks, setCaptureLinks] = useState<CaptureLink[]>([]);
  const activeFiltersCount = (filterListId ? 1 : 0) + (filterStatus ? 1 : 0) + (filterDate ? 1 : 0) + (filterOrigin ? 1 : 0) + (filterSourceChannel ? 1 : 0);

  // Los links de captura solo hacen falta para el sub-filtro de origen; se
  // cargan una vez que el usuario abre esa pestaña, no en cada render.
  useEffect(() => {
    if (filterType !== 'origen' || captureLinks.length > 0) return;
    let active = true;
    listMyCaptureLinks()
      .then((links) => {
        if (active) setCaptureLinks(links);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [filterType, captureLinks.length]);

  const clearAllFilters = () => {
    onFilterChange(null);
    onFilterStatusChange(null);
    onFilterDateChange('');
    onFilterOriginChange(null);
    onFilterSourceChannelChange(null);
  };

  return (
    <>
      {/* Top Bar: Actions, Search, Filters */}
      <div className="flex items-center gap-2 mb-3">
        {leftActions && <div className="shrink-0">{leftActions}</div>}

        <div className="flex-1 min-w-0 relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-2 h-[34px] bg-surface border border-line rounded-[6px] text-[13px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm" />
        </div>

        <div className="shrink-0">
          <Button
            variant={showFilters || activeFiltersCount > 0 ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters)}
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
          >
            <span className="hidden sm:inline">Filtros</span> {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button>
        </div>
      </div>

      {/* Bulk Actions and inline Filters */}
      <div className="flex items-center gap-3 mb-2 min-h-[28px] overflow-x-auto text-[12px] font-semibold text-ink-secondary">
        {bulkActions && (
          <div className="flex items-center gap-3 shrink-0">
            {bulkActions}
          </div>
        )}

        {showFilters && (
          <div className="flex items-center gap-2 animate-toast-in shrink-0">
            {bulkActions && (
              <svg className="w-3.5 h-3.5 text-ink-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            )}

            {/*
              Va dentro del panel de filtros y no suelto en la barra: es un
              filtro mas, y ahi es donde se buscan. Sin cifra a proposito: esta
              tabla pagina en servidor y solo recibe la pagina visible, asi que
              cualquier numero que pusiera aqui seria el de la pagina y no el
              del total.
            */}
            <SinNombreToggle
              ocultos={ocultarSinNombre}
              onToggle={() => onOcultarSinNombreChange(!ocultarSinNombre)}
              mostrarCantidad={false}
              className="shrink-0"
            />

            <span className="shrink-0">Filtrar por:</span>

            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-transparent outline-none cursor-pointer hover:text-gray-900 transition-colors shrink-0">
              <option value="listas">Listas</option>
              <option value="estados">Estados</option>
              <option value="fechas">Fechas</option>
              <option value="origen">Origen</option>
              <option value="canal">Canal</option>
            </select>

            {filterType === 'listas' && (
              <select value={filterListId ?? ''} onChange={(e) => onFilterChange(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent outline-none cursor-pointer hover:text-gray-900 transition-colors shrink-0 max-w-[150px] truncate">
                <option value="">Todas</option>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            {filterType === 'estados' && (
              <select value={filterStatus ?? ''} onChange={(e) => onFilterStatusChange(e.target.value ? e.target.value as LeadStatus : null)}
                className="bg-transparent outline-none cursor-pointer hover:text-gray-900 transition-colors shrink-0 max-w-[150px] truncate">
                <option value="">Todos</option>
                {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            )}
            {filterType === 'fechas' && (
              <select value={filterDate} onChange={(e) => onFilterDateChange(e.target.value)}
                className="bg-transparent outline-none cursor-pointer hover:text-gray-900 transition-colors shrink-0 max-w-[150px] truncate">
                <option value="">Todas</option>
                <option value="7d">Última semana</option>
                <option value="30d">Último mes</option>
                <option value="thisMonth">Este mes</option>
              </select>
            )}
            {filterType === 'origen' && (
              <>
                <select value={filterOrigin ?? ''} onChange={(e) => onFilterOriginChange(e.target.value ? e.target.value as LeadOrigin : null)}
                  className="bg-transparent outline-none cursor-pointer hover:text-gray-900 transition-colors shrink-0 max-w-[150px] truncate">
                  <option value="">Todos</option>
                  {(Object.keys(ORIGIN_LABELS) as LeadOrigin[]).map((o) => (
                    <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>
                  ))}
                </select>
                {filterOrigin === 'web_form' && (
                  <select value={filterCaptureLinkId ?? ''} onChange={(e) => onFilterCaptureLinkIdChange(e.target.value ? Number(e.target.value) : null)}
                    className="bg-transparent outline-none cursor-pointer hover:text-gray-900 transition-colors shrink-0 max-w-[170px] truncate">
                    <option value="">Cualquier link</option>
                    {captureLinks.map((link) => (
                      <option key={link.id} value={link.id}>
                        {link.label}{link.campaignName ? ` · ${link.campaignName}` : ''}
                        {' '}({link.linkType === 'pb' ? 'PB' : link.linkType.charAt(0).toUpperCase() + link.linkType.slice(1)})
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            {filterType === 'canal' && (
              <select value={filterSourceChannel ?? ''} onChange={(e) => onFilterSourceChannelChange(e.target.value ? e.target.value as LeadSourceChannel : null)}
                className="bg-transparent outline-none cursor-pointer hover:text-gray-900 transition-colors shrink-0 max-w-[150px] truncate">
                <option value="">Todos</option>
                {(Object.keys(SOURCE_CHANNEL_LABELS) as LeadSourceChannel[]).map((c) => (
                  <option key={c} value={c}>{SOURCE_CHANNEL_LABELS[c]}</option>
                ))}
              </select>
            )}

            {activeFiltersCount > 0 && (
              <button onClick={clearAllFilters}
                      className="w-5 h-5 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors shrink-0 ml-1"
                      title="Limpiar filtros">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
