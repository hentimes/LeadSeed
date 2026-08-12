import * as XLSX from 'xlsx';
import type { Lead } from '../types';

function downloadFile(data: Blob | string, filename: string) {
  const url = typeof data === 'string'
    ? URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    : URL.createObjectURL(data);
  // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(leads: Lead[]) {
  const clean = leads.map(({ id, listaIds, updatedAt, ...rest }) => rest);
  const json = JSON.stringify(clean, null, 2);
  const ts = new Date().toISOString().slice(0, 10);
  downloadFile(json, `leads-${ts}.json`);
}

export function exportToExcel(leads: Lead[]) {
  const rows = leads.map(({ id, listaIds, updatedAt, ...rest }) => ({
    Nombre: rest.name,
    Teléfono: rest.phone,
    Email: rest.email,
    Empresa: rest.company,
    RUT: rest.rut,
    Notas: rest.notes,
    Ingreso: rest.createdAt ? new Date(rest.createdAt).toLocaleDateString('es-CL') : '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const ts = new Date().toISOString().slice(0, 10);
  downloadFile(blob, `leads-${ts}.xlsx`);
}
