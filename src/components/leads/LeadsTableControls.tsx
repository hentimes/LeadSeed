import { useState } from 'react';
import type { LeadStatus, LeadList } from '../../types';
import { STATUS_LABELS } from '../../types';

interface Props {
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
  search, onSearchChange, totalCount, visibleCount, selectedCount,
  currentPage, pageCount, pageSize, isLoadingPage, onPageChange,
  lists, filterListId, onFilterChange, filterStatus, onFilterStatusChange,
  filterDate, onFilterDateChange
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'listas' | 'estados' | 'fechas'>('listas');
  const activeFiltersCount = (filterListId ? 1 : 0) + (filterStatus ? 1 : 0) + (filterDate ? 1 : 0);

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <div className="flex-1 max-w-sm">
          <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar nombre, teléfono, email, RUT..." className="w-full border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-900 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline-block">
            {visibleCount !== totalCount ? `${visibleCount}/${totalCount} leads` : `${totalCount} leads`}
            {selectedCount > 0 && <span className="ml-1 text-blue-600 font-medium">{selectedCount} sel.</span>}
          </span>
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || !!isLoadingPage}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Pag. {currentPage}/{pageCount}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= pageCount || !!isLoadingPage}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border-slate-300 dark:border-slate-600/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-2 mb-3 items-center flex-wrap bg-slate-50 dark:bg-slate-900 dark:bg-gray-800/50 border border-slate-200 dark:border-slate-700/50 dark:border-gray-700 rounded p-2 animate-toast-in">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1">Filtrar por:</span>
          
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-800 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="listas">Listas</option>
            <option value="estados">Estados</option>
            <option value="fechas">Fechas</option>
          </select>

          {filterType === 'listas' && (
            <select value={filterListId ?? ''} onChange={(e) => onFilterChange(e.target.value ? Number(e.target.value) : null)}
              className="border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-800 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Todas las listas</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          {filterType === 'estados' && (
            <select value={filterStatus ?? ''} onChange={(e) => onFilterStatusChange(e.target.value ? e.target.value as LeadStatus : null)}
              className="border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-800 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
          {filterType === 'fechas' && (
            <select value={filterDate} onChange={(e) => onFilterDateChange(e.target.value)}
              className="border border-slate-300 dark:border-slate-600/50 dark:border-gray-600 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md dark:bg-gray-800 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Todas las fechas</option>
              <option value="7d">Última semana</option>
              <option value="30d">Último mes</option>
              <option value="thisMonth">Este mes</option>
            </select>
          )}

          {activeFiltersCount > 0 && (
            <button onClick={() => { onFilterChange(null); onFilterStatusChange(null); onFilterDateChange(''); }} 
                    className="ml-auto w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors shrink-0"
                    title="Limpiar filtros">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      )}
      <div className="sm:hidden mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          Pag. {currentPage}/{pageCount}
        </span>
        <span>{pageSize} por pagina</span>
      </div>
    </>
  );
}
