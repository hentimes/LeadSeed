import type { Lead } from '../../../types';
import { Icon } from '../../../utils/icons';

interface Props {
  lead: Lead;
  documentId?: string;
  onEdit: () => void;
  onClose: () => void;
}

export default function LeadDetailHeader({ lead, documentId, onEdit, onClose }: Props) {
  return (
    <div className="flex items-start justify-between p-4 pb-3 border-b border-slate-100 shrink-0 min-w-0">
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div className="w-10 h-10 rounded-[6px] bg-gradient-to-br from-[#F2EEFF] to-[#E0D4FF] text-[#6C4CF6] flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
          {lead.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-slate-800 leading-tight truncate w-full" title={lead.name}>
            {lead.name}
          </h2>
          {!!documentId && (
            <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">RUT: {documentId}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-[#6C4CF6] hover:bg-[#F2EEFF] rounded-[6px] transition-colors"
          title="Editar"
        >
          {Icon.Edit()}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[6px] transition-colors"
          title="Cerrar"
        >
          {Icon.Close()}
        </button>
      </div>
    </div>
  );
}
