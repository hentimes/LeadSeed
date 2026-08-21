import type { Lead } from '../../types';
import { useMemo, useState } from 'react';
import { useSendCounts } from '../../hooks/useSendCounts';
import type { SortConfig, SortField } from '../../hooks/useSort';
import LeadIdentity from '../leads/LeadIdentity';
import SinNombreToggle, { contarSinNombre, pasaFiltroDeNombre } from '../leads/SinNombreToggle';
import { tonoDeFila } from '../../design';
import { nombreCorto, nombreVisible, telefonoVisible } from '../../utils/leadDisplay';

interface Props {
  leads: Lead[];
  selectedIds: Set<string>;
  onToggleLead: (id: string) => void;
  onSelectAll: () => void;
  onRemoveLead: (id: string) => void;
  sort: SortConfig;
  onSort: (field: SortField) => void;
}

/*
 * Aqui vivia un `shortName` propio que tomaba la primera palabra y la ultima.
 * Con un nombre de cuatro partes -dos de pila y dos apellidos- devolvia el
 * apellido materno: "Juan Carlos Perez Soto" salia como "Juan Soto", que no es
 * como se llama a nadie. La tabla de leads tenia otra funcion, con el mismo
 * nombre y la regla correcta, asi que el mismo lead se abreviaba distinto segun
 * la pantalla. Ahora las dos usan `nombreCorto`.
 */

export default function ListLeadsTable({ leads, selectedIds, onToggleLead, onSelectAll, onRemoveLead, sort, onSort }: Props) {
  const sendCounts = useSendCounts();
  const [ocultarSinNombre, setOcultarSinNombre] = useState(false);
  const sinNombre = useMemo(() => contarSinNombre(leads), [leads]);
  const visibles = useMemo(
    () => leads.filter((lead) => pasaFiltroDeNombre(lead, ocultarSinNombre)),
    [leads, ocultarSinNombre],
  );
  if (leads.length === 0) {
    return <p className="text-sm text-ink-muted text-center py-6 bg-surface border rounded-lg">Sin leads en esta lista.</p>;
  }

  const isAllSelected = selectedIds.size > 0 && selectedIds.size === leads.length;

  return (
    <div className="border rounded-lg overflow-hidden bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted border-b">
          <tr>
            <th className="w-8 px-3 py-2.5">
              <input
                type="checkbox"
                onChange={onSelectAll}
                checked={isAllSelected}
                className="rounded border-line-strong text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <th
              onClick={() => onSort('name')}
              className="text-left px-3 py-2.5 font-semibold text-ink-secondary cursor-pointer hover:bg-surface-hover transition-colors"
            >
              Nombre {sort.field === 'name' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="text-left px-3 py-2.5 font-semibold text-ink-secondary">Teléfono</th>
            <th
              onClick={() => onSort('rut')}
              className="text-left px-3 py-2.5 font-semibold text-ink-secondary cursor-pointer hover:bg-surface-hover transition-colors"
            >
              RUT {sort.field === 'rut' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
            </th>
            {/* El interruptor va en la cabecera de la columna de acciones: es
                una accion sobre la lista, no una columna de dato. */}
            <th className="w-12 px-3 py-1 text-center">
              <SinNombreToggle
                count={sinNombre}
                ocultos={ocultarSinNombre}
                onToggle={() => setOcultarSinNombre((v) => !v)}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((lead) => {
            const isSelected = selectedIds.has(lead.id!);
            const enviosDelLead = sendCounts[lead.id!];
            return (
              <tr
                key={lead.id}
                className={`border-b border-line last:border-0 transition-colors ${tonoDeFila({ isSelected })}`}
              >
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleLead(lead.id!)}
                    className="rounded border-line-strong text-primary focus:ring-focus cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2">
                  <LeadIdentity
                    name={nombreCorto(lead.name)}
                    badges={
                      <>
                        {(enviosDelLead?.whatsapp ?? 0) > 0 && (
                          <span
                            className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-ink-inverse bg-state-success rounded-full shadow-sm"
                            /* "Abiertos", no "enviados". La correccion se hizo en
                               la tabla de leads y no llego hasta aqui: WhatsApp
                               se abre en otra pestana y la aplicacion no sabe si
                               el mensaje llego a salir. */
                            title={`${enviosDelLead?.whatsapp} chat(s) de WhatsApp abierto(s)`}
                          >
                            {enviosDelLead?.whatsapp}
                          </span>
                        )}
                        {(enviosDelLead?.email ?? 0) > 0 && (
                          <span
                            className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-ink-inverse bg-state-info rounded-full shadow-sm"
                            /* Aqui "enviado" si es cierto: el correo sale por la API. */
                            title={`${enviosDelLead?.email} correo(s) enviado(s)`}
                          >
                            {enviosDelLead?.email}
                          </span>
                        )}
                      </>
                    }
                  />
                </td>
                {/* Enmascarado salvo que la fila este seleccionada, igual que en
                    la tabla de leads. Era el unico sitio que lo mostraba siempre
                    entero. */}
                <td className="px-3 py-2 text-ink-secondary">{telefonoVisible(lead.phone, isSelected)}</td>
                <td className="px-3 py-2 font-mono text-ink-muted text-meta">{lead.rut || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onRemoveLead(lead.id!)}
                    className="text-ink-muted hover:text-state-danger transition-colors p-1 rounded hover:bg-state-danger-soft"
                    aria-label={`Quitar ${nombreVisible(lead.name)} de la lista`}
                    title="Quitar de la lista"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
