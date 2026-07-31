import { memo, useState } from 'react';
import type { Lead, LeadList } from '../../types';
import { STATUS_LABELS, STATUS_COLORS } from '../../types';
import { Icon } from '../../utils/icons';

interface Props {
  lead: Lead;
  idx: number;
  selectedIds: Set<string>;
  sendCounts: Record<string, { whatsapp: number; email: number }>;
  listsMap: Map<number, LeadList>;
  compactMode: boolean;
  filterMode?: string | null;
  isTrash?: boolean;
  
  // Visibility flags
  nameVis: boolean;
  rutVis: boolean;
  phoneVis: boolean;
  emailVis: boolean;
  companyVis: boolean;
  dateVis: boolean;
  listsVis: boolean;
  statusVis: boolean;
  scoreVis: boolean;

  // Actions
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onTogglePin: (lead: Lead, isPinned: boolean) => void;
  getScore: (lead: Lead) => number;
  shortName: (full: string) => string;
}


const getPurpleShade = (id: string) => {
  const shades = [
    'bg-[#F2EEFF] text-[#6C4CF6]', 
    'bg-[#E0D4FF] text-[#5b3ce0]',
    'bg-[#D6C7FF] text-[#4a2bb5]',
    'bg-[#8b73f8] text-white',
    'bg-[#6C4CF6] text-white',
    'bg-[#4a2bb5] text-white'
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
  lead, idx, selectedIds, sendCounts, listsMap, compactMode, filterMode, isTrash,
  nameVis, rutVis, phoneVis, emailVis, companyVis, dateVis, listsVis, statusVis, scoreVis,
  onView, onEdit, onDelete, onRestore, onTogglePin, getScore, shortName
}: Props) => {
  const isSelected = selectedIds.has(lead.id!);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const trClass = `border-b border-[#E6EAF0] transition-colors cursor-pointer ${isSelected ? 'bg-[#E0D4FF] hover:bg-[#D6C7FF]' : 'bg-white hover:bg-gray-50'}`;
  
  const checkboxBox = (
    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-[var(--color-border)] bg-[var(--color-bg-surface)]'}`}>
      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M2 6L5 8.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={isSelected ? 1 : 0}/>
      </svg>
    </div>
  );

  const renderNameWithBadges = (isCompact: boolean) => (
    <div className={`font-medium text-xs flex items-center gap-1.5 min-w-0`}>
      <span className="truncate">{isCompact ? shortName(lead.name) : lead.name}</span>
      {lead.hasUnreadCrossExecAlert && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
          {Icon.Warning()} Cruce
        </span>
      )}
      {sendCounts[lead.id!]?.whatsapp > 0 && (
        <span onClick={(e) => { e.stopPropagation(); onView(lead); }} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-green-500 rounded-full cursor-pointer hover:bg-green-600 shadow-sm" title={`${sendCounts[lead.id!].whatsapp} WhatsApp(s) enviado(s)`}>
          {sendCounts[lead.id!].whatsapp}
        </span>
      )}
      {sendCounts[lead.id!]?.email > 0 && (
        <span onClick={(e) => { e.stopPropagation(); onView(lead); }} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 shadow-sm" title={`${sendCounts[lead.id!].email} Email(s) enviado(s)`}>
          {sendCounts[lead.id!].email}
        </span>
      )}
      {filterMode === 'olvidados' && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 whitespace-nowrap">
          {Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24))} días olv.
        </span>
      )}
    </div>
  );

  const actions = (
    <div className="flex gap-1.5 justify-end items-center pr-1 min-w-[64px]">
      <button onClick={(e) => { e.stopPropagation(); onView(lead); }} title="Ver" className="text-[#5B6475] hover:text-[#161A24] text-xs p-1">{Icon.View()}</button>
      {isTrash ? (
        <>
          {onRestore && <button onClick={(e) => { e.stopPropagation(); onRestore(lead.id!); }} title="Restaurar" className="text-[#5B6475] hover:text-green-600 text-xs p-1">{Icon.Restore()}</button>}
          {isSelected && <button onClick={(e) => { e.stopPropagation(); onDelete(lead.id!); }} title="Eliminar definitivo" className="text-[#5B6475] hover:text-red-600 text-xs p-1">{Icon.Trash()}</button>}
        </>
      ) : (
        <>
          <button onClick={(e) => { e.stopPropagation(); onEdit(lead); }} title="Editar" className="text-[#5B6475] hover:text-[#161A24] text-xs p-1">{Icon.Edit()}</button>
          {isSelected && <button onClick={(e) => { e.stopPropagation(); onDelete(lead.id!); }} title="Eliminar" className="text-[#5B6475] hover:text-red-600 text-xs p-1">{Icon.Trash()}</button>}
        </>
      )}
    </div>
  );

  if (compactMode) {
    return (
      <tr data-row-index={idx} data-lead-id={lead.id!} className={trClass}>
        <td className="px-2 py-1.5">{checkboxBox}</td>
        <td className="px-2 py-1.5">
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
                onClick={(e) => { e.stopPropagation(); onTogglePin(lead, !lead.isPinned); }}
                className={`absolute inset-0 flex items-center justify-center transition-opacity ${lead.isPinned || isHoveringAvatar ? 'opacity-100' : 'opacity-0'}`}
                title={lead.isPinned ? "Quitar pin" : "Fijar lead al inicio"}
              >
                <div className="w-3.5 h-3.5">
                {Icon.pin()}
              </div>
              </button>
            </div>
            <div className="flex flex-col min-w-0">
              {renderNameWithBadges(true)}
              {rutVis && lead.rut && <div className="text-[11px] text-[#5B6475] font-mono mt-0.5 truncate">RUT: {lead.rut}</div>}
              {nameVis && !rutVis && !lead.rut && <div className="text-[11px] text-[#5B6475] mt-0.5">-</div>}
            </div>
          </div>
        </td>
        {companyVis && <td className="px-2 py-1.5 text-[12px]">{lead.company || '-'}</td>}
        <td className="px-2 py-1.5">
          {phoneVis && <div className="text-[12px] truncate">{lead.phone ? <a href={`https://wa.me/${lead.phone.replace(/[^+\d]/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#6C4CF6] hover:text-[#5b3ce0] font-medium" title="Abrir WhatsApp">{isSelected ? lead.phone : `...${lead.phone.slice(-4)}`}</a> : '-'}</div>}
          {emailVis && <div className="text-[12px] text-[#6C4CF6] truncate mt-0.5">{lead.email ? <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-[#5B6475] hover:text-[#161A24]" title={`Enviar email a ${lead.email}`}>{lead.email}</a> : '-'}</div>}
        </td>
        {dateVis && <td className="px-2 py-1.5 text-[12px] text-[#5B6475]">{new Date(lead.createdAt).toLocaleDateString('es-CL')}</td>}
        {listsVis && <td className="px-2 py-1.5">
          <div className="flex gap-1 flex-wrap">
            {lead.listaIds.map((lid) => {
              const list = listsMap.get(lid);
              return list ? <span key={lid} className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium" style={{ backgroundColor: `${list.color}15`, color: list.color }}>{list.name}</span> : null;
            })}
          </div></td>}
        {statusVis && <td className="px-2 py-1.5"><span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium" style={{ backgroundColor: `${STATUS_COLORS[lead.status || 'nuevo']}15`, color: STATUS_COLORS[lead.status || 'nuevo'] }}>{STATUS_LABELS[lead.status || 'nuevo']}</span></td>}
        {scoreVis && <td className="px-2 py-1.5 text-[12px] text-amber-500">{''.repeat(getScore(lead))}{''.repeat(5 - getScore(lead))}</td>}
        <td className="px-2 py-1.5 w-[72px] sticky right-0 bg-inherit shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">{actions}</td>
      </tr>
    );
  }

  // Non-compact Mode
  return (
    <tr data-row-index={idx} data-lead-id={lead.id!} className={trClass}>
      <td className="px-2 py-1.5">{checkboxBox}</td>
      {nameVis && <td className="px-2 py-1.5 font-medium text-xs">
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
              onClick={(e) => { e.stopPropagation(); onTogglePin(lead, !lead.isPinned); }}
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${lead.isPinned || isHoveringAvatar ? 'opacity-100' : 'opacity-0'}`}
              title={lead.isPinned ? "Quitar pin" : "Fijar lead al inicio"}
            >
              <div className="w-3.5 h-3.5">
                {Icon.pin()}
              </div>
            </button>
          </div>
          <div className="flex flex-col min-w-0">
            {renderNameWithBadges(false)}
          </div>
        </div>
      </td>}
      {phoneVis && <td className="px-2 py-1.5 text-xs">{lead.phone ? (isSelected ? lead.phone : `...${lead.phone.slice(-4)}`) : '-'}</td>}
      {emailVis && <td className="px-2 py-1.5 text-xs text-blue-600">{lead.email ? <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2" title={`Enviar email a ${lead.email}`}>{lead.email.length > 13 ? <span title={lead.email}>{lead.email.slice(0, 10)}...</span> : lead.email}</a> : '-'}</td>}
      {companyVis && <td className="px-2 py-1.5 text-xs">{lead.company || '-'}</td>}
      {rutVis && <td className="px-2 py-1.5 text-xs font-mono">{lead.rut || '-'}</td>}
      {dateVis && <td className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">{new Date(lead.createdAt).toLocaleDateString('es-CL')}</td>}
      {listsVis && <td className="px-2 py-1.5">
        <div className="flex gap-0.5 flex-wrap">
          {lead.listaIds.map((lid) => {
            const list = listsMap.get(lid);
            return list ? <span key={lid} className="px-1 py-0.5 rounded text-xs text-white" style={{ backgroundColor: list.color }}>{list.name}</span> : null;
          })}
        </div></td>}
      {statusVis && <td className="px-2 py-1.5"><span className="px-1.5 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: STATUS_COLORS[lead.status || 'nuevo'] }}>{STATUS_LABELS[lead.status || 'nuevo']}</span></td>}
      <td className="px-1 py-1.5 sticky right-0 bg-inherit shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] z-10">{actions}</td>
    </tr>
  );
};

export default memo(LeadsTableRow, (prev, next) => {
  if (prev.lead !== next.lead) return false;
  if (prev.idx !== next.idx) return false;
  
  const wasSelected = prev.selectedIds.has(prev.lead.id!);
  const isSelected = next.selectedIds.has(next.lead.id!);
  if (wasSelected !== isSelected) return false;

  if (prev.compactMode !== next.compactMode) return false;
  if (prev.filterMode !== next.filterMode) return false;
  if (prev.isTrash !== next.isTrash) return false;
  
  if (prev.nameVis !== next.nameVis) return false;
  if (prev.rutVis !== next.rutVis) return false;
  if (prev.phoneVis !== next.phoneVis) return false;
  if (prev.emailVis !== next.emailVis) return false;
  if (prev.companyVis !== next.companyVis) return false;
  if (prev.dateVis !== next.dateVis) return false;
  if (prev.listsVis !== next.listsVis) return false;
  if (prev.statusVis !== next.statusVis) return false;
  if (prev.scoreVis !== next.scoreVis) return false;

  if (prev.sendCounts !== next.sendCounts) return false;
  if (prev.listsMap !== next.listsMap) return false;

  return true;
});
