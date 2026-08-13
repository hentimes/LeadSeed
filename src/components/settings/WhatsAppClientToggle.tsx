import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../../services/appSettingsService';
import { Icon } from '../../utils/icons';
import { Card } from '../../design';

export default function WhatsAppClientToggle() {
  const [preference, setPreference] = useState<'web' | 'app'>('web');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      setPreference(settings.whatsappClientPreference || 'web');
      setLoading(false);
    })();
  }, []);

  const togglePreference = async () => {
    const newPref = preference === 'web' ? 'app' : 'web';
    setPreference(newPref);
    const settings = await getSettings();
    await saveSettings({ ...settings, whatsappClientPreference: newPref });
  };

  if (loading) return null;

  return (
    <Card padding="lg" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-[8px] bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0">
          {Icon.Phone()} 
        </div>
        <div>
          <h3 className="text-section-title font-semibold text-ink tracking-tight">Cliente de WhatsApp</h3>
          <p className="text-body text-ink-secondary text-slate-500 mt-1">
            Elige cómo quieres que se abran los chats al enviar mensajes.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
        <button
          onClick={() => preference !== 'web' && togglePreference()}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            preference === 'web' 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          WhatsApp Web (Pestaña)
        </button>
        <button
          onClick={() => preference !== 'app' && togglePreference()}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            preference === 'app' 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          App de Escritorio
        </button>
      </div>
    </Card>
  );
}
