import { useEffect, useState } from 'react';
import { getLeadAlertsState, setLeadAlertPreferences } from '../../services/backgroundLeadAlertsService';

export default function LeadAlertsSettings() {
  const [desktopEnabled, setDesktopEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void getLeadAlertsState().then((state) => {
      if (!active) return;
      setDesktopEnabled(state.desktopEnabled);
      setSoundEnabled(state.soundEnabled);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const update = async (patch: { desktopEnabled?: boolean; soundEnabled?: boolean }) => {
    if (patch.desktopEnabled !== undefined) setDesktopEnabled(patch.desktopEnabled);
    if (patch.soundEnabled !== undefined) setSoundEnabled(patch.soundEnabled);
    await setLeadAlertPreferences(patch);
  };

  if (loading) {
    return <div className="pt-2 text-sm text-slate-500">Cargando ajustes de alertas...</div>;
  }

  return (
    <div className="animate-fade-in pt-2">
      <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold text-slate-700 dark:border-slate-700/50 dark:text-slate-200">
        Alertas de nuevos leads
      </h3>

      <p className="mb-4 text-[11px] text-slate-500 dark:text-slate-400">
        Cuando entra un lead a tu cuenta recibis un aviso al instante. El contador morado en el icono de
        la extension muestra cuantos leads llegaron desde la ultima vez que la abriste.
      </p>

      <div className="space-y-2">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Notificacion de escritorio</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Aviso del sistema aunque la extension este cerrada.
            </p>
          </div>
          <input
            type="checkbox"
            checked={desktopEnabled}
            onChange={(event) => void update({ desktopEnabled: event.target.checked })}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#6C4CF6] focus:ring-[#6C4CF6]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Sonido</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tono corto al recibir un lead. Chrome puede silenciarlo si el navegador esta bajo mucha carga.
            </p>
          </div>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(event) => void update({ soundEnabled: event.target.checked })}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#6C4CF6] focus:ring-[#6C4CF6]"
          />
        </label>
      </div>
    </div>
  );
}
