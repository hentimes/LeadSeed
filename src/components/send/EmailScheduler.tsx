import type { EmailTemplate, Lead } from '../../types';
import { Icon } from '../../utils/icons';
import { Checkbox, Field, Input, Panel } from '../../design';
import { SendAction } from './RecipientPicker';

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

/**
 * Envio inmediato o programado del correo.
 *
 * La fecha y la hora estaban en la misma fila que la casilla, empujadas a
 * la derecha: en un panel de 320px los dos campos no entraban. Ahora la
 * casilla manda sola y los campos aparecen debajo en dos columnas.
 */
export default function EmailScheduler({
  schedule,
  setSchedule,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  preConfirmSend,
  sending,
  selectedTemplate,
  recipients,
  result,
}: Props) {
  const missingSchedule = schedule && (!scheduledDate || !scheduledTime);
  const count = recipients.length;
  const plural = count === 1 ? '' : 's';

  let label = `Enviar ahora a ${count} lead${plural}`;
  if (sending) label = 'Enviando mensajes...';
  else if (schedule) label = `Programar envío a ${count} lead${plural}`;

  return (
    <div className="flex flex-col gap-2.5">
      <Checkbox
        checked={schedule}
        onChange={(e) => setSchedule(e.target.checked)}
        label="Programar envío automático"
      />

      {schedule && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Fecha">
            <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
          </Field>
        </div>
      )}

      <SendAction
        label={label}
        disabled={!selectedTemplate || count === 0 || sending || missingSchedule}
        onClick={preConfirmSend}
      />

      {result && (
        <Panel tone={result.errors.length ? 'warning' : 'success'}>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">
              {result.errors.length ? <Icon.Warning /> : <Icon.Check />}
            </span>
            <div className="min-w-0">
              <p className="text-body font-semibold">
                {result.sent} de {result.total} enviados con éxito
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1 flex flex-col gap-0.5 text-micro">
                  {result.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
