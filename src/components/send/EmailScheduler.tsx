import type { EmailTemplate, Lead } from '../../types';
import { Icon } from '../../utils/icons';

interface Props {
  schedule: boolean;
  setSchedule: (val: boolean) => void;
  scheduledDate: string;
  setScheduledDate: (val: string) => void;
  scheduledTime: string;
  setScheduledTime: (val: string) => void;
  preConfirmSend: () => void;
  sending: boolean;
  selectedTemplate: EmailTemplate | null;
  recipients: Lead[];
  result: { total: number; sent: number; errors: string[] } | null;
}

export default function EmailScheduler({
  schedule, setSchedule, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime,
  preConfirmSend, sending, selectedTemplate, recipients, result
}: Props) {
  return (
    <div className="pt-2">
      <div className="flex justify-between items-center mb-3">
        <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-600">
          <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="rounded" />
          Programar envío automático
        </label>
        
        {schedule && (
          <div className="flex gap-2">
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              className="border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
              className="border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
          </div>
        )}
      </div>

      <button onClick={preConfirmSend} disabled={!selectedTemplate || recipients.length === 0 || sending || (schedule && (!scheduledDate || !scheduledTime))}
        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-[0.98]">
        {sending ? 'Enviando mensajes...' : schedule ? `Programar envío a ${recipients.length} lead(s)` : `Enviar Ahora a ${recipients.length} lead(s)`}
      </button>

      {result && (
        <div className={`mt-3 p-2.5 rounded-lg text-sm flex items-start gap-2 ${result.errors.length ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          <span className="text-lg">{result.errors.length ? <Icon.Warning /> : <Icon.Check />}</span>
          <div>
            <div className={`font-semibold ${result.errors.length ? 'text-yellow-800' : 'text-green-800'}`}>
              {result.sent} de {result.total} enviados con éxito
            </div>
            {result.errors.length > 0 && (
              <div className="mt-1 space-y-1 text-xs text-red-600">
                {result.errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
