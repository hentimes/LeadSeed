import { toPlainText } from '../../utils/mentionParser';
import type { ChatMessageReport } from '../../services/chatModerationService';

interface ReportedMessagesPanelProps {
  reports: ChatMessageReport[];
  onDismiss: (reportId: string) => void;
  onDeleteMessage: (report: ChatMessageReport) => void;
}

export default function ReportedMessagesPanel({
  reports,
  onDismiss,
  onDeleteMessage,
}: ReportedMessagesPanelProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface-muted">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {reports.length === 0 && (
          <p className="text-center text-body text-ink-muted mt-8">No hay reportes pendientes.</p>
        )}

        {reports.map((report) => (
          <div
            key={report.id}
            className="rounded-xl bg-surface border border-line p-3"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-meta font-semibold text-ink truncate">
                {report.message?.user_profile?.full_name || 'Usuario'}
              </span>
              <span className="text-micro text-ink-muted flex-shrink-0">
                reportado por {report.reporter?.full_name || 'alguien'}
              </span>
            </div>

            <p className="text-body text-ink break-words whitespace-pre-wrap">
              {report.message ? toPlainText(report.message.content) : 'Mensaje eliminado'}
            </p>

            {report.reason && (
              <p className="mt-1.5 text-meta italic text-ink-muted border-l-2 border-line pl-2">
                "{report.reason}"
              </p>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => onDismiss(report.id)}
                className="text-meta font-semibold text-ink-muted hover:text-ink"
              >
                Descartar reporte
              </button>
              <button
                type="button"
                onClick={() => onDeleteMessage(report)}
                className="text-meta font-semibold text-state-danger hover:underline"
              >
                Eliminar mensaje
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
