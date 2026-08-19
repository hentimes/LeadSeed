import type { SendLog } from '../../types';
import { Icon } from '../../utils/icons';
import { formatearFecha } from '../../utils/date';

/**
 * Historial de envios de la plantilla seleccionada.
 *
 * Compartido por WhatsApp y Email, que tenian el mismo bloque repetido.
 * El triangulo `▸` escrito a mano se reemplaza por el chevron del set de
 * iconos, para que rote igual que el resto de los desplegables.
 */
export function SendHistoryDisclosure({ log, templateName }: { log: SendLog[]; templateName?: string }) {
  if (log.length === 0) return null;

  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-micro font-semibold text-ink-secondary outline-none transition-colors hover:text-ink">
        <span className="text-ink-muted transition-transform group-open:rotate-90">
          <Icon.ChevronRight />
        </span>
        Historial de esta plantilla ({log.length})
      </summary>

      <div className="max-h-40 overflow-y-auto border-t border-line">
        {log.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-0"
          >
            <span className="text-state-success">
              <Icon.Check />
            </span>
            <span className="min-w-0 flex-1 truncate text-micro text-ink">{entry.leadName}</span>
            {templateName && (
              <span className="hidden max-w-[100px] truncate text-micro text-ink-muted sm:block">
                {templateName}
              </span>
            )}
            <span className="shrink-0 text-micro tabular-nums text-ink-muted">
              {formatearFecha(entry.sentAt)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
