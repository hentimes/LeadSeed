import * as XLSX from 'xlsx';
import type { Lead } from '../types';
import { getPlatform } from '../platform/registry';

function downloadFile(data: Blob | string, filename: string) {
  void getPlatform().fileSaver.save({
    content: data,
    filename,
    mimeType: 'application/json',
  });
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
