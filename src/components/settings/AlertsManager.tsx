import { useEffect, useState } from 'react';
import {
  getAlertPreferences,
  setAlertTypePreference,
  setAppointmentLeadMinutes,
} from '../../platform/alertNotifier';
import {
  ALERT_TYPES,
  ALERT_TYPE_LABELS,
  type AlertPreferences,
  type AlertType,
  type AlertTypePreference,
} from '../../types';

type ToggleKey = keyof Pick<AlertTypePreference, 'enabled' | 'sound' | 'desktop' | 'onlyWhenClosed'>;

const COLUMNS: { key: ToggleKey; label: string; hint: string }[] = [
  { key: 'enabled', label: 'Activa', hint: 'Recibir este tipo de alerta' },
  { key: 'desktop', label: 'Aviso', hint: 'Notificacion del sistema' },
  { key: 'sound', label: 'Sonido', hint: 'Tono al recibirla' },
  { key: 'onlyWhenClosed', label: 'Solo cerrada', hint: 'Avisar solo si la extension no esta abierta' },
];

function Checkbox({
  checked,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      title={title}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 rounded border-line-strong text-primary focus:ring-primary disabled:opacity-30"
    />
  );
}

export default function AlertsManager() {
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [minutesDraft, setMinutesDraft] = useState('15');

  useEffect(() => {
    let active = true;
    void getAlertPreferences().then((loaded) => {
      if (!active) return;
      setPrefs(loaded);
      setMinutesDraft(String(loaded.appointmentLeadMinutes));
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = async (type: AlertType, key: ToggleKey, value: boolean) => {
    const next = await setAlertTypePreference(type, { [key]: value });
    setPrefs(next);
  };

  const commitMinutes = async () => {
    const parsed = Number(minutesDraft);
    if (!Number.isFinite(parsed)) {
      setMinutesDraft(String(prefs?.appointmentLeadMinutes ?? 15));
      return;
    }
    const next = await setAppointmentLeadMinutes(parsed);
    setPrefs(next);
    setMinutesDraft(String(next.appointmentLeadMinutes));
  };

  if (!prefs) {
    return <div className="pt-2 text-sm text-ink-secondary">Cargando alertas...</div>;
  }

  return (
    <div className="animate-fade-in pt-2">
      <h3 className="mb-1 border-b border-line pb-2 text-sm font-bold text-ink">
        Administrador de alertas
      </h3>
      <p className="mb-3 text-[11px] text-ink-secondary">
        Elegi que te avisa y como. El contador morado del icono es exclusivo de leads nuevos.
      </p>

      <div className="hidden sm:grid grid-cols-[1fr_repeat(4,56px)] gap-1 px-2 pb-1.5 border-b border-line">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-secondary">Alerta</span>
        {COLUMNS.map((column) => (
          <span
            key={column.key}
            title={column.hint}
            className="text-[10px] font-bold uppercase tracking-wide text-ink-secondary text-center"
          >
            {column.label}
          </span>
        ))}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {ALERT_TYPES.map((type) => {
          const pref = prefs.byType[type];
          const meta = ALERT_TYPE_LABELS[type];

          return (
            <div key={type} className="px-2 py-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_repeat(4,56px)] gap-2 sm:gap-1 sm:items-center">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{meta.title}</p>
                  <p className="text-[11px] text-ink-secondary">{meta.description}</p>
                </div>

                <div className="flex sm:contents gap-4">
                  {COLUMNS.map((column) => (
                    <label key={column.key} className="flex sm:justify-center items-center gap-1.5">
                      <Checkbox
                        checked={pref[column.key]}
                        // Sin la alerta activa, el resto no aplica.
                        disabled={column.key !== 'enabled' && !pref.enabled}
                        title={column.hint}
                        onChange={(value) => void toggle(type, column.key, value)}
                      />
                      <span className="sm:hidden text-[11px] text-ink-secondary">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {type === 'upcoming_appointment' && pref.enabled && (
                <div className="mt-2 flex items-center gap-2 pl-0 sm:pl-1">
                  <span className="text-[11px] text-ink-secondary">Avisar</span>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={minutesDraft}
                    onChange={(event) => setMinutesDraft(event.target.value)}
                    onBlur={() => void commitMinutes()}
                    className="w-16 rounded-[4px] border border-line-strong bg-surface px-2 py-1 text-[11px] text-ink focus:border-primary focus:outline-none"
                  />
                  <span className="text-[11px] text-ink-secondary">minutos antes</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
