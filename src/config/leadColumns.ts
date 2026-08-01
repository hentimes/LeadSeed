import type { Lead, LeadList, PlanesproLeadMetadata, PlanesproLeadRawPayload } from '../types';
import type { ColumnDef } from '../components/ColumnSelector';
import type { LeadSortField } from '../repositories/leadsRepository';

export interface LeadColumnDef {
  key: string;
  label: string;
  /** Visible por defecto la primera vez que el usuario abre la app. */
  defaultVisible: boolean;
  /** Ancho estimado en px; se usa para decidir que cabe al contraer. */
  width: number;
  sortField?: LeadSortField;
  /** No se puede ocultar ni mover: es la identidad de la fila. */
  fixed?: boolean;
}

function raw(lead: Lead): PlanesproLeadRawPayload {
  const metadata = (lead.metadata || {}) as PlanesproLeadMetadata;
  return (metadata.raw_payload || {}) as PlanesproLeadRawPayload;
}

function text(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value).trim();
}

/**
 * Catalogo unico de columnas de la tabla de leads.
 *
 * Antes existian dos listas distintas (App.tsx y appSettingsService) que se
 * desincronizaban, y por eso las columnas nuevas nunca aparecian.
 *
 * El ORDEN de este arreglo es el orden inicial; el usuario puede
 * reordenarlo, y ese orden define la prioridad: al angostarse el panel se
 * ocultan primero las de la derecha.
 */
export const LEAD_COLUMN_CATALOG: LeadColumnDef[] = [
  { key: 'name', label: 'Nombre', defaultVisible: true, width: 150, sortField: 'name', fixed: true },
  { key: 'phone', label: 'Teléfono', defaultVisible: true, width: 120 },
  { key: 'status', label: 'Estado', defaultVisible: true, width: 100 },
  { key: 'email', label: 'Email', defaultVisible: true, width: 160 },
  { key: 'rut', label: 'RUT', defaultVisible: true, width: 110, sortField: 'rut' },
  { key: 'createdAt', label: 'Ingreso', defaultVisible: true, width: 95, sortField: 'createdAt' },
  { key: 'lists', label: 'Listas', defaultVisible: true, width: 120 },
  { key: 'company', label: 'Empresa', defaultVisible: false, width: 130 },
  { key: 'healthSystem', label: 'Sistema', defaultVisible: false, width: 90 },
  { key: 'isapre', label: 'Isapre', defaultVisible: false, width: 110 },
  { key: 'income', label: 'Renta', defaultVisible: false, width: 110 },
  { key: 'comuna', label: 'Comuna', defaultVisible: false, width: 110 },
  // Sin sortField: el backend solo ordena por createdAt, name y rut.
  { key: 'score', label: 'Score', defaultVisible: false, width: 70 },
];

export const LEAD_COLUMN_BY_KEY = new Map(LEAD_COLUMN_CATALOG.map((column) => [column.key, column]));

export const DEFAULT_LEAD_COLUMNS: ColumnDef[] = LEAD_COLUMN_CATALOG.map((column) => ({
  key: column.key,
  label: column.label,
  visible: column.defaultVisible,
}));

/** Valor mostrado en la celda. Las columnas con render propio devuelven ''. */
export function getLeadColumnValue(lead: Lead, key: string, lists: LeadList[]): string {
  switch (key) {
    case 'name':
      return lead.name;
    case 'phone':
      return lead.phone;
    case 'email':
      return lead.email;
    case 'company':
      return lead.company;
    case 'rut':
      return lead.rut;
    case 'score':
      return String(lead.score ?? 0);
    case 'createdAt':
      return lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('es-CL') : '';
    case 'lists':
      return lists
        .filter((list) => lead.listaIds?.includes(list.id!))
        .map((list) => list.name)
        .join(', ');
    case 'healthSystem':
      return text(raw(lead).sistema_actual);
    case 'isapre':
      return text(raw(lead).isapre_especifica);
    case 'income':
      return text(raw(lead).rango_renta || raw(lead).renta);
    case 'comuna':
      return text(raw(lead).comuna);
    default:
      return '';
  }
}
