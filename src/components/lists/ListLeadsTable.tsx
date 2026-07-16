import React from 'react';
import type { Lead } from '../../types';
import { useSendCounts } from '../../hooks/useSendCounts';

interface Props {
  leads: Lead[];
  selectedIds: Set<string>;
  onToggleLead: (id: string) => void;
  onSelectAll: () => void;
  onRemoveLead: (id: string) => void;
  sort: { field: string; dir: 'asc' | 'desc' };
  onSort: (field: any) => void;
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function ListLeadsTable({ leads, selectedIds, onToggleLead, onSelectAll, onRemoveLead, sort, onSort }: Props) {
  const sendCounts = useSendCounts();
  if (leads.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border rounded-lg">Sin leads en esta lista.</p>;
  }

  const isAllSelected = selectedIds.size > 0 && selectedIds.size === leads.length;

  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800/80 dark:backdrop-blur-md shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b">
          <tr>
            <th className="w-8 px-3 py-2.5">
              <input
                type="checkbox"
                onChange={onSelectAll}
                checked={isAllSelected}
                className="rounded border-slate-300 dark:border-slate-600/50 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </th>
            <th
              onClick={() => onSort('name')}
              className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              Nombre {sort.field === 'name' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Teléfono</th>
            <th
              onClick={() => onSort('rut')}
              className="text-left px-3 py-2.5 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              RUT {sort.field === 'rut' ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="w-12 px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => {
            const isSelected = selectedIds.has(lead.id!);
            return (
              <tr
                key={lead.id}
                className={`transition-colors hover:bg-slate-50 dark:bg-slate-900 ${isSelected ? 'bg-blue-50/50' : ''}`}
              >
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleLead(lead.id!)}
                    className="rounded border-slate-300 dark:border-slate-600/50 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    {shortName(lead.name)}
                    {sendCounts[lead.id!]?.whatsapp > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-green-500 rounded-full shadow-sm" title={`${sendCounts[lead.id!].whatsapp} WhatsApp(s) enviado(s)`}>
                        {sendCounts[lead.id!].whatsapp}
                      </span>
                    )}
                    {sendCounts[lead.id!]?.email > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-blue-500 rounded-full shadow-sm" title={`${sendCounts[lead.id!].email} Email(s) enviado(s)`}>
                        {sendCounts[lead.id!].email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{lead.phone}</td>
                <td className="px-3 py-2 font-mono text-slate-400 dark:text-slate-500 text-xs">{lead.rut || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onRemoveLead(lead.id!)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
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
