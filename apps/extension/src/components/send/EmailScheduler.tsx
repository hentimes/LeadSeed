import { Icon } from '../../utils/icons';
import { Checkbox, Field, Input, Panel } from '../../design';

interface Props {
  schedule: boolean;
  setSchedule: (val: boolean) => void;
  scheduledDate: string;
  setScheduledDate: (val: string) => void;
  scheduledTime: string;
  setScheduledTime: (val: string) => void;
  result: { total: number; sent: number; errors: string[] } | null;
}

/**
 * Programacion del envio, y el parte de como salio.
 *
 * El boton ya no vive aca: se mudo al pie fijo de la pagina. Lo que queda es
 * cuando sale el correo y, despues, cuantos llegaron.
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
  result,
}: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <Checkbox
        checked={schedule}
        onChange={(e) => setSchedule(e.target.checked)}
        label="Programar envío automático"
      />

      {/* Apilados por defecto: un `input[type=date]` de Chrome necesita unos
          130px para "dd/mm/aaaa" mas el icono de calendario, y dos columnas a
          320px le dan 112. Se cortaba por la derecha. */}
      {schedule && (
        <div className="grid grid-cols-1 gap-2 panel-md:grid-cols-2">
          <Field label="Fecha">
            <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
          </Field>
        </div>
      )}

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
