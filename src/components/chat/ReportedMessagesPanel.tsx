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
    <div className="flex-1 min-h-0 flex flex-col bg-surface-muted dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {reports.length === 0 && (
          <p className="text-center text-sm text-ink-muted mt-8">No hay reportes pendientes.</p>
        )}

        {reports.map((report) => (
          <div
            key={report.id}
            className="rounded-xl bg-white dark:bg-gray-800 border border-line dark:border-gray-700 p-3"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-ink dark:text-gray-200 truncate">
                {report.message?.user_profile?.full_name || 'Usuario'}
              </span>
              <span className="text-[10px] text-ink-muted flex-shrink-0">
                reportado por {report.reporter?.full_name || 'alguien'}
              </span>
            </div>

            <p className="text-sm text-ink dark:text-gray-100 break-words whitespace-pre-wrap">
              {report.message ? toPlainText(report.message.content) : 'Mensaje eliminado'}
            </p>

            {report.reason && (
              <p className="mt-1.5 text-xs italic text-ink-muted border-l-2 border-line dark:border-gray-700 pl-2">
                "{report.reason}"
              </p>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => onDismiss(report.id)}
                className="text-[11px] font-semibold text-ink-muted hover:text-ink"
              >
                Descartar reporte
              </button>
              <button
                type="button"
                onClick={() => onDeleteMessage(report)}
                className="text-[11px] font-semibold text-state-danger hover:underline"
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
