import { useState } from 'react';
import type { Lead, LeadSourceChannel, LeadStatus } from '../types';
import type { LeadOrigin } from '../repositories/leadsRepository';

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
  const [filterOrigin, setFilterOrigin] = useState<LeadOrigin | null>(null);
  // Solo aplica cuando filterOrigin es 'web_form': que link de captura especifico.
  const [filterCaptureLinkId, setFilterCaptureLinkId] = useState<number | null>(null);
  // Independiente de filterOrigin: 'pb' | 'general' | 'retiro'.
  const [filterSourceChannel, setFilterSourceChannel] = useState<LeadSourceChannel | null>(null);
  /* Ocultar los leads sin nombre. Apagado por defecto: esconder filas sin que
     nadie lo pida es como se pierden contactos de vista. */
  const [ocultarSinNombre, setOcultarSinNombre] = useState(false);
  const [search, setSearch] = useState('');

  const setFilterOriginAndReset = (origin: LeadOrigin | null) => {
    setFilterOrigin(origin);
    if (origin !== 'web_form') {
      setFilterCaptureLinkId(null);
    }
  };

  return {
    filterListId,
    setFilterListId,
    filterStatus,
    setFilterStatus,
    filterDate,
    setFilterDate,
    filterOrigin,
    setFilterOrigin: setFilterOriginAndReset,
    filterCaptureLinkId,
    setFilterCaptureLinkId,
    filterSourceChannel,
    setFilterSourceChannel,
    ocultarSinNombre,
    setOcultarSinNombre,
    search,
    setSearch,
  };
}
