import { memo, useState } from 'react';
import type { Lead, LeadList } from '../../types';
import type { ColumnDef } from '../ColumnSelector';
import { Icon } from '../../utils/icons';
import LeadCell from './LeadCell';

interface Props {
  lead: Lead;
  idx: number;
  selectedIds: Set<string>;
  sendCounts: Record<string, { whatsapp: number; email: number }>;
  listsMap: Map<number, LeadList>;
  compactMode: boolean;
  filterMode?: string | null;
  isTrash?: boolean;

  /** Columnas efectivamente renderizadas, ya filtradas por ancho. */
  columns: ColumnDef[];

  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onTogglePin: (lead: Lead, isPinned: boolean) => void;
  getScore: (lead: Lead) => number;
  shortName: (full: string) => string;

  /** Reordenamiento de leads fijados por arrastre. */
  isPinDragging?: boolean;
  onPinDragStart?: (leadId: string) => void;
  onPinDragOver?: (leadId: string) => void;
  onPinDrop?: (sourceId: string, targetId: string) => void;
}

const getPurpleShade = (id: string) => {
  const shades = [
    'bg-[#F2EEFF] text-[#6C4CF6]',
    'bg-[#E0D4FF] text-[#5b3ce0]',
    'bg-[#D6C7FF] text-[#4a2bb5]',
    'bg-[#8b73f8] text-white',
    'bg-[#6C4CF6] text-white',
    'bg-[#4a2bb5] text-white',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return shades[Math.abs(hash) % shades.length];
};

const AvatarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LeadsTableRow = ({
  lead, idx, selectedIds, sendCounts, listsMap, compactMode, filterMode, isTrash, columns,
  onView, onEdit, onDelete, onRestore, onTogglePin, getScore, shortName,
  isPinDragging, onPinDragStart, onPinDragOver, onPinDrop,
}: Props) => {
  const isSelected = selectedIds.has(lead.id!);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const cellPad = compactMode ? 'px-2.5 py-1.5' : 'px-2.5 py-2';
  const trClass = `border-b border-[#E6EAF0] transition-colors cursor-pointer ${
    isSelected ? 'bg-[#E0D4FF] hover:bg-[#D6C7FF]' : 'bg-white hover:bg-gray-50'
  } ${isPinDragging ? 'opacity-40' : ''}`;

  // El RUT se muestra bajo el nombre solo si su columna no esta a la vista,
  // asi no se pierde el dato al angostar el panel ni se duplica al abrirlo.
  const rutColumnVisible = columns.some((column) => column.key === 'rut');
  const showRutUnderName = compactMode && !rutColumnVisible && !!lead.rut;

  const checkboxBox = (
    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#6C4CF6] border-[#6C4CF6]' : 'border-[var(--color-border)] bg-[var(--color-bg-surface)]'}`}>
      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={isSelected ? 1 : 0} />
      </svg>
    </div>
  );

  const nameCell = (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={`w-7 h-7 rounded-[4px] shrink-0 flex items-center justify-center shadow-sm relative ${getPurpleShade(lead.id!)}`}
        onMouseEnter={() => setIsHoveringAvatar(true)}
        onMouseLeave={() => setIsHoveringAvatar(false)}
      >
        <div className={`transition-opacity ${lead.isPinned || isHoveringAvatar ? 'opacity-0' : 'opacity-100'}`}>
          <AvatarIcon />
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin(lead, !lead.isPinned);
          }}
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${lead.isPinned || isHoveringAvatar ? 'opacity-100' : 'opacity-0'}`}
          title={lead.isPinned ? 'Quitar pin' : 'Fijar lead al inicio'}
        >
          <div className="w-3.5 h-3.5">{Icon.pin()}</div>
        </button>
      </div>

      <div className="flex flex-col min-w-0">
        <div className="font-medium text-xs flex items-center gap-1.5 min-w-0">
          <span className="truncate">{compactMode ? shortName(lead.name) : lead.name}</span>
          {lead.hasUnreadCrossExecAlert && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
              {Icon.Warning()} Cruce
            </span>
          )}
          {sendCounts[lead.id!]?.whatsapp > 0 && (
            <span
              onClick={(event) => {
                event.stopPropagation();
                onView(lead);
              }}
              className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-green-500 rounded-full cursor-pointer hover:bg-green-600 shadow-sm"
              title={`${sendCounts[lead.id!].whatsapp} WhatsApp(s) enviado(s)`}
            >
              {sendCounts[lead.id!].whatsapp}
            </span>
          )}
          {sendCounts[lead.id!]?.email > 0 && (
            <span
              onClick={(event) => {
                event.stopPropagation();
                onView(lead);
              }}
              className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 shadow-sm"
              title={`${sendCounts[lead.id!].email} Email(s) enviado(s)`}
            >
              {sendCounts[lead.id!].email}
            </span>
          )}
          {filterMode === 'olvidados' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 whitespace-nowrap">
              {Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24))} días olv.
            </span>
          )}
        </div>
        {showRutUnderName && (
          <div className="text-[11px] text-[#5B6475] font-mono mt-0.5 truncate">RUT: {lead.rut}</div>
        )}
      </div>
    </div>
  );

  const actions = (
    <div className="flex gap-1.5 justify-end items-center pr-1 min-w-[64px]">
      <button onClick={(event) => { event.stopPropagation(); onView(lead); }} title="Ver" className="text-[#5B6475] hover:text-[#161A24] text-xs p-1">{Icon.View()}</button>
      {isTrash ? (
        <>
          {onRestore && <button onClick={(event) => { event.stopPropagation(); onRestore(lead.id!); }} title="Restaurar" className="text-[#5B6475] hover:text-green-600 text-xs p-1">{Icon.Restore()}</button>}
          {isSelected && <button onClick={(event) => { event.stopPropagation(); onDelete(lead.id!); }} title="Eliminar definitivo" className="text-[#5B6475] hover:text-red-600 text-xs p-1">{Icon.Trash()}</button>}
        </>
      ) : (
        <>
          <button onClick={(event) => { event.stopPropagation(); onEdit(lead); }} title="Editar" className="text-[#5B6475] hover:text-[#161A24] text-xs p-1">{Icon.Edit()}</button>
          {isSelected && <button onClick={(event) => { event.stopPropagation(); onDelete(lead.id!); }} title="Eliminar" className="text-[#5B6475] hover:text-red-600 text-xs p-1">{Icon.Trash()}</button>}
        </>
      )}
    </div>
  );

  // Solo los leads fijados se pueden reordenar entre si.
  const pinDragProps = lead.isPinned && onPinDragStart
    ? {
        draggable: true,
        onDragStart: (event: React.DragEvent) => {
          // setData es obligatorio: sin el, Chrome no completa el drop.
          event.dataTransfer.setData('text/plain', lead.id!);
          event.dataTransfer.effectAllowed = 'move';
          onPinDragStart(lead.id!);
        },
        onDragOver: (event: React.DragEvent) => {
          event.preventDefault();
          onPinDragOver?.(lead.id!);
        },
        onDrop: (event: React.DragEvent) => {
          event.preventDefault();
          onPinDrop?.(event.dataTransfer.getData('text/plain'), lead.id!);
        },
      }
    : {};

  return (
    <tr data-row-index={idx} data-lead-id={lead.id!} className={trClass} {...pinDragProps}>
      <td className={cellPad}>{checkboxBox}</td>

      {columns.map((column) => (
        <td key={column.key} className={`${cellPad} align-middle text-[12px] overflow-hidden`}>
          {column.key === 'name' ? nameCell : (
            <LeadCell columnKey={column.key} ctx={{ lead, listsMap, compactMode, isSelected, getScore }} />
          )}
        </td>
      ))}

      <td className={`${cellPad} w-[92px] sticky right-0 bg-inherit shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10`}>
        {actions}
      </td>
    </tr>
  );
};

export default memo(LeadsTableRow, (prev, next) => {
  if (prev.lead !== next.lead) return false;
  if (prev.idx !== next.idx) return false;

  if (prev.selectedIds.has(prev.lead.id!) !== next.selectedIds.has(next.lead.id!)) return false;

  if (prev.compactMode !== next.compactMode) return false;
  if (prev.filterMode !== next.filterMode) return false;
  if (prev.isTrash !== next.isTrash) return false;
  if (prev.isPinDragging !== next.isPinDragging) return false;

  // Basta comparar la identidad del arreglo: LeadsTable lo memoiza.
  if (prev.columns !== next.columns) return false;

  if (prev.sendCounts !== next.sendCounts) return false;
  if (prev.listsMap !== next.listsMap) return false;

  return true;
});
