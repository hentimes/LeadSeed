import type { LeadNote, SendLog } from '../../../types';
import { Icon } from '../../../utils/icons';

interface Props {
  notes: LeadNote[];
  newNote: string;
  onNewNoteChange: (value: string) => void;
  onAddNote: () => void;
  showNotes: boolean;
  onToggleNotes: () => void;

  sendLogs: SendLog[];
  showLogs: boolean;
  onToggleLogs: () => void;
  expandedLogId: number | null;
  onToggleExpandedLog: (id: number) => void;
  getTemplateName: (templateId: string | number, type: string) => string;
  getTemplateContent: (log: SendLog) => string;
  isEmailTemplateHtml: (log: SendLog) => boolean;
}

export default function LeadDetailHistory({
  notes,
  newNote,
  onNewNoteChange,
  onAddNote,
  showNotes,
  onToggleNotes,
  sendLogs,
  showLogs,
  onToggleLogs,
  expandedLogId,
  onToggleExpandedLog,
  getTemplateName,
  getTemplateContent,
  isEmailTemplateHtml,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historial de Interacciones</h3>
          <button
            onClick={onToggleNotes}
            className="text-[10px] font-bold text-primary hover:underline bg-primary-soft px-2 py-0.5 rounded-[4px]"
          >
            {showNotes ? 'Ocultar' : `Ver historial (${notes.length})`}
          </button>
        </div>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => onNewNoteChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddNote()}
            placeholder="Registrar interacción (ej. Se llamó y no contestó)..."
            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-[6px] text-[11px] text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-colors"
          />
          <button
            onClick={onAddNote}
            className="px-3 py-1.5 bg-primary-soft text-primary text-[12px] font-bold rounded-[6px] hover:bg-primary-soft-strong transition-colors"
            title="Guardar"
          >
            {Icon.Send()}
          </button>
        </div>

        {showNotes && (
          <div className="space-y-2 mt-2">
            {notes.map((note) => (
              <div key={note.id} className="bg-slate-50 rounded-[6px] p-2.5 border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Nota interna</span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    {new Date(note.createdAt).toLocaleString('es-CL')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="text-center py-2 text-[11px] text-slate-400 italic">No hay interacciones registradas.</div>
            )}
          </div>
        )}
      </div>

      {sendLogs.length > 0 && (
        <div>
          <button
            onClick={onToggleLogs}
            className="w-full flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 border-b border-slate-100 pb-1.5 hover:text-primary transition-colors"
          >
            <span>Historial de envios ({sendLogs.length})</span>
            <span>{showLogs ? Icon.ChevronDown() : Icon.ChevronRight()}</span>
          </button>
          {showLogs && (
            <div className="space-y-1">
              {sendLogs.map((log) => {
                const templateName = getTemplateName(log.templateId, log.templateType);
                const hasContent = templateName !== '?';
                const isExpanded = expandedLogId === log.id;
                const templateContent = getTemplateContent(log);

                return (
                  <div key={log.id}>
                    <div className="text-[11px] flex items-center gap-2">
                      <span className={log.templateType === 'whatsapp' ? 'text-green-500' : 'text-blue-500'}>
                        {log.templateType === 'whatsapp' ? Icon.Send() : Icon.Email()}
                      </span>
                      <button
                        onClick={() => log.id != null && onToggleExpandedLog(log.id)}
                        className={
                          hasContent
                            ? 'text-left text-primary hover:underline decoration-dotted underline-offset-2'
                            : 'text-left text-slate-400 cursor-default'
                        }
                        disabled={!hasContent}
                      >
                        {templateName}
                      </button>
                      <span className="text-slate-400 ml-auto">{new Date(log.sentAt).toLocaleString('es-CL')}</span>
                    </div>
                    {isExpanded && templateContent && (
                      <div className="mt-1 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-[6px] text-[11px] max-h-32 overflow-y-auto text-slate-700">
                        {isEmailTemplateHtml(log) ? (
                          <div dangerouslySetInnerHTML={{ __html: templateContent }} />
                        ) : (
                          <div className="whitespace-pre-wrap">{templateContent}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
