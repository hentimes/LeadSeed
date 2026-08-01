import type { LeadCrossExecEvent } from '../../../types';
import { Icon } from '../../../utils/icons';

interface Props {
  alerts: LeadCrossExecEvent[];
  getMessage: (event: LeadCrossExecEvent) => string;
}

export default function LeadDetailCrossExecAlert({ alerts, getMessage }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-[6px] p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-2">
        {Icon.Warning()}
        Seguimiento comercial
      </div>
      <div className="space-y-1.5">
        {alerts.map((event) => (
          <div key={event.id} className="text-[11px] text-amber-900 leading-relaxed">
            {getMessage(event)}
          </div>
        ))}
      </div>
    </div>
  );
}
