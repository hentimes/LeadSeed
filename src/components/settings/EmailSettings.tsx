import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../db/database';

interface EmailConfig {
  provider: 'emailjs' | 'resend';
  resendApiKey: string;
  resendFromName: string;
  resendFromEmail: string;
  userId: string;
  serviceId: string;
  templateId: string;
}

export default function EmailSettings() {
  const [emailSettings, setEmailSettings] = useState<EmailConfig>({
    provider: 'resend', resendApiKey: '', resendFromName: '', resendFromEmail: '', userId: '', serviceId: '', templateId: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setEmailSettings({
        provider: s.emailProvider || 'resend',
        resendApiKey: s.resendApiKey || '',
        resendFromName: s.resendFromName || '',
        resendFromEmail: s.resendFromEmail || '',
        userId: s.emailJSUserId || '',
        serviceId: s.emailJSServiceId || '',
        templateId: s.emailJSTemplateId || ''
      });
    });
  }, []);

  const handleSaveEmail = async () => {
    const current = await getSettings();
    await saveSettings({
      ...current,
      emailProvider: emailSettings.provider,
      resendApiKey: emailSettings.resendApiKey,
      resendFromName: emailSettings.resendFromName,
      resendFromEmail: emailSettings.resendFromEmail,
      emailJSUserId: emailSettings.userId,
      emailJSServiceId: emailSettings.serviceId,
      emailJSTemplateId: emailSettings.templateId,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="animate-fade-in pt-2">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-2">Proveedor de Correo</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Servicio Activo</label>
        <select 
          value={emailSettings.provider} 
          onChange={(e) => setEmailSettings({ ...emailSettings, provider: e.target.value as 'emailjs' | 'resend' })}
          className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none"
        >
          <option value="resend">Resend API (Recomendado - Ultrarrápido)</option>
          <option value="emailjs">EmailJS (Alternativa/Legacy)</option>
        </select>
      </div>

      {emailSettings.provider === 'resend' ? (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Envío de correos mediante la API nativa de <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Resend</a>. Ideal para envíos masivos directos desde tu dominio.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">API Key <span className="text-gray-400 font-normal text-xs">(Empieza con re_...)</span></label>
            <input type="password" value={emailSettings.resendApiKey} onChange={(e) => setEmailSettings({ ...emailSettings, resendApiKey: e.target.value })}
              className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" placeholder="re_123456789..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre del remitente</label>
              <input type="text" value={emailSettings.resendFromName} onChange={(e) => setEmailSettings({ ...emailSettings, resendFromName: e.target.value })}
                className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Correo remitente</label>
              <input type="email" value={emailSettings.resendFromEmail} onChange={(e) => setEmailSettings({ ...emailSettings, resendFromEmail: e.target.value })}
                className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" placeholder="correo@tudominio.com" />
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1">Asegúrate de que el dominio del correo remitente esté verificado en tu cuenta de Resend.</p>
        </div>
      ) : (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configuración de <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">EmailJS</a>. Campos requeridos en la plantilla: <code className="bg-white dark:bg-slate-800/80 dark:backdrop-blur-md border px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 text-xs mx-1">to_email, to_name, subject, message, message_html</code>.
          </p>
          <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Public Key (User ID)</label>
            <input type="text" value={emailSettings.userId} onChange={(e) => setEmailSettings({ ...emailSettings, userId: e.target.value })}
              className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Service ID</label>
              <input type="text" value={emailSettings.serviceId} onChange={(e) => setEmailSettings({ ...emailSettings, serviceId: e.target.value })}
                className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Template ID</label>
              <input type="text" value={emailSettings.templateId} onChange={(e) => setEmailSettings({ ...emailSettings, templateId: e.target.value })}
                className="w-full border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm outline-none" /></div>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button 
          onClick={handleSaveEmail} 
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Guardar Configuración
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            Guardado
          </span>
        )}
      </div>
    </div>
  );
}
