import { useState } from 'react';
import type { LeadStatus, LeadList } from '../../types';
import { STATUS_LABELS } from '../../types';

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
}

export default function LeadsTableControls({
  leftActions, bulkActions, search, onSearchChange, totalCount, visibleCount, selectedCount,
  currentPage, pageCount, pageSize, isLoadingPage, onPageChange,
  lists, filterListId, onFilterChange, filterStatus, onFilterStatusChange,
  filterDate, onFilterDateChange
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'listas' | 'estados' | 'fechas'>('listas');
  const activeFiltersCount = (filterListId ? 1 : 0) + (filterStatus ? 1 : 0) + (filterDate ? 1 : 0);

  return (
    <>
      {/* Top Bar: Actions, Search, Filters */}
      <div className="flex items-center gap-2 mb-3">
        {leftActions && <div className="shrink-0">{leftActions}</div>}
        
        <div className="flex-1 min-w-0 relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..." 
            className="w-full pl-8 pr-2 h-[34px] bg-white border border-[#E6EAF0] rounded-[6px] text-[13px] focus:ring-2 focus:ring-[#6C4CF6] focus:border-[#6C4CF6] outline-none transition-all shadow-sm" />
        </div>
        
        <div className="shrink-0">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-2.5 h-[34px] rounded-[6px] text-[13px] font-medium transition-colors border shadow-sm ${showFilters || activeFiltersCount > 0 ? 'bg-[#F2EEFF] border-[#6C4CF6] text-[#6C4CF6]' : 'bg-white border-[#E6EAF0] text-[#161A24] hover:bg-gray-50'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            <span className="hidden sm:inline">Filtros</span> {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-2 mb-4 items-center flex-wrap bg-white border border-[#E6EAF0] shadow-sm rounded-[8px] p-3 animate-toast-in">
          <span className="text-[13px] font-semibold text-[#5B6475] mr-1">Filtrar por:</span>
          
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-[#E6EAF0] bg-white rounded-[6px] px-2 py-1.5 text-[13px] focus:ring-2 focus:ring-[#6C4CF6] outline-none">
            <option value="listas">Listas</option>
            <option value="estados">Estados</option>
            <option value="fechas">Fechas</option>
          </select>

          {filterType === 'listas' && (
            <select value={filterListId ?? ''} onChange={(e) => onFilterChange(e.target.value ? Number(e.target.value) : null)}
              className="border border-[#E6EAF0] bg-white rounded-[6px] px-2 py-1.5 text-[13px] focus:ring-2 focus:ring-[#6C4CF6] outline-none">
              <option value="">Todas las listas</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          {filterType === 'estados' && (
            <select value={filterStatus ?? ''} onChange={(e) => onFilterStatusChange(e.target.value ? e.target.value as LeadStatus : null)}
              className="border border-[#E6EAF0] bg-white rounded-[6px] px-2 py-1.5 text-[13px] focus:ring-2 focus:ring-[#6C4CF6] outline-none">
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
          {filterType === 'fechas' && (
            <select value={filterDate} onChange={(e) => onFilterDateChange(e.target.value)}
              className="border border-[#E6EAF0] bg-white rounded-[6px] px-2 py-1.5 text-[13px] focus:ring-2 focus:ring-[#6C4CF6] outline-none">
              <option value="">Todas las fechas</option>
              <option value="7d">Última semana</option>
              <option value="30d">Último mes</option>
              <option value="thisMonth">Este mes</option>
            </select>
          )}

          {activeFiltersCount > 0 && (
            <button onClick={() => { onFilterChange(null); onFilterStatusChange(null); onFilterDateChange(''); }} 
                    className="ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors shrink-0"
                    title="Limpiar filtros">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      )}
      
      {/* Pagination Info and Bulk Actions */}
      <div className="flex items-center justify-between mb-2 min-h-[28px]">
        <div className="flex items-center gap-2 overflow-x-auto">
          {bulkActions}
        </div>
        <div className="text-[13px] text-[#5B6475] font-medium whitespace-nowrap ml-auto">
          Pag. {currentPage}/{pageCount}
        </div>
      </div>
    </>
  );
}
