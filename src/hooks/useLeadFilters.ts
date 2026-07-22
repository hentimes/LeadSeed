import { useState } from 'react';
import type { Lead, LeadStatus } from '../types';

export function applyLeadFilters(
  leads: Lead[],
  filterListId: number | null,
  filterStatus: LeadStatus | null,
  filterDate: string,
  search: string,
) {
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
        l.rut.toLowerCase().includes(q),
    );
  }

  return result;
}

export function useLeadFilters() {
  const [filterListId, setFilterListId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');

  return {
    filterListId,
    setFilterListId,
    filterStatus,
    setFilterStatus,
    filterDate,
    setFilterDate,
    search,
    setSearch,
  };
}
