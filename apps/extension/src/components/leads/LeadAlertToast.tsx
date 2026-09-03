import type { LeadAlertEvent } from '../../types';
import { Icon } from '../../utils/icons';

interface Props {
  alerts: LeadAlertEvent[];
  onDismiss: (id: string) => void;
  onOpenLead: (leadId: string) => void;
}

export default function LeadAlertToast({ alerts, onDismiss, onOpenLead }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-[calc(var(--ls-rail-width)+1rem)] z-[110] flex flex-col gap-2 items-center pointer-events-none">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto w-full max-w-[420px] bg-surface border border-primary-soft-strong rounded-[8px] shadow-xl p-3 flex items-start gap-3 animate-toast-in"
        >
          <div className="w-8 h-8 rounded-[6px] bg-primary-soft text-primary flex items-center justify-center shrink-0">
            {Icon.Leads()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Nuevo lead</p>
            <p className="text-[13px] font-semibold text-ink truncate">{alert.leadName}</p>
            {!!alert.leadPhone && <p className="text-[11px] text-ink-secondary truncate">{alert.leadPhone}</p>}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                onOpenLead(alert.leadId);
                onDismiss(alert.id);
              }}
              className="px-2.5 py-1.5 bg-primary text-white rounded-[4px] text-[11px] font-bold hover:bg-primary-hover transition-colors"
            >
              Ver
            </button>
            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1.5 text-ink-muted hover:text-ink transition-colors"
              title="Descartar"
            >
              {Icon.Close()}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
