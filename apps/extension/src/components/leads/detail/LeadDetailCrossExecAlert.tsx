import type { LeadCrossExecEvent } from '../../../types';
import { Icon } from '../../../utils/icons';

interface Props {
  alerts: LeadCrossExecEvent[];
  getMessage: (event: LeadCrossExecEvent) => string;
}

export default function LeadDetailCrossExecAlert({ alerts, getMessage }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-[6px] border border-state-warning-soft bg-state-warning-soft p-3">
      <div className="mb-2 flex items-center gap-2 text-meta font-bold uppercase tracking-wide text-state-warning-ink">
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
