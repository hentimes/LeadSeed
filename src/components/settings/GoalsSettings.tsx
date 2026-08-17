import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../services/appSettingsService';
import type { ComparePeriod } from '../../types';

export default function GoalsSettings() {
  const [waGoal, setWaGoal] = useState(30);
  const [emailGoal, setEmailGoal] = useState(20);
  const [callGoal, setCallGoal] = useState(5);
  const [comparePeriod, setComparePeriod] = useState<ComparePeriod>('yesterday');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      if (s.dailyGoalWhatsApp !== undefined) setWaGoal(s.dailyGoalWhatsApp);
      if (s.dailyGoalEmail !== undefined) setEmailGoal(s.dailyGoalEmail);
      if (s.dailyGoalCalls !== undefined) setCallGoal(s.dailyGoalCalls);
      if (s.dashboardComparePeriod) setComparePeriod(s.dashboardComparePeriod);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const s = await getSettings();
    await saveSettings({
      ...s,
      dailyGoalWhatsApp: waGoal,
      dailyGoalEmail: emailGoal,
      dailyGoalCalls: callGoal,
      dashboardComparePeriod: comparePeriod,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-transparent pt-2 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-ink">Metas y Dashboard</h3>
        <p className="text-xs text-ink-muted mt-1">Configura tus objetivos diarios y la comparativa del panel.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metas */}
          <div>
            <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-3">Cuotas Diarias</h4>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between text-xs text-ink-secondary">
                WhatsApp / día
                <input type="number" min="0" value={waGoal} onChange={e => setWaGoal(Number(e.target.value))} className="w-20 border-b border-line-strong px-2 py-1 text-right focus:border-blue-500 outline-none bg-transparent" />
              </label>
              <label className="flex items-center justify-between text-xs text-ink-secondary">
                Emails / día
                <input type="number" min="0" value={emailGoal} onChange={e => setEmailGoal(Number(e.target.value))} className="w-20 border-b border-line-strong px-2 py-1 text-right focus:border-blue-500 outline-none bg-transparent" />
              </label>
              <label className="flex items-center justify-between text-xs text-ink-secondary">
                Llamadas / día
                <input type="number" min="0" value={callGoal} onChange={e => setCallGoal(Number(e.target.value))} className="w-20 border-b border-line-strong px-2 py-1 text-right focus:border-blue-500 outline-none bg-transparent" />
              </label>
            </div>
          </div>

          {/* Comparación */}
          <div>
            <h4 className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-3">Análisis de Progreso</h4>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col text-xs text-ink-secondary">
                <span className="mb-1">Comparar rendimiento contra:</span>
                <select 
                  value={comparePeriod} 
                  onChange={(e) => setComparePeriod(e.target.value as ComparePeriod)} 
                  className="border-b border-line-strong px-2 py-1.5 focus:border-blue-500 outline-none bg-transparent w-full font-medium"
                >
                  <option value="yesterday">Día anterior (Ayer)</option>
                  <option value="lastWeek">Semana pasada</option>
                  <option value="lastMonth">Mes pasado</option>
                  <option value="lastYear">Año pasado (12 meses)</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-line">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded text-xs font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          {saved && <span className="text-xs text-green-600 font-bold"> Guardado</span>}
        </div>
      </form>
    </div>
  );
}
