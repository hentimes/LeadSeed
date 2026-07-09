import { useEffect, useState, useRef } from 'react';
import { getSettings, saveSettings, db } from '../db/database';
import type { ColumnDef } from '../components/ColumnSelector';
import type { ExportFormat, Lead } from '../types';
import { exportBackup, importBackup } from '../utils/backup';

interface Props {
  compactMode: boolean;
  onCompactModeChange: (v: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  visibleCols: ColumnDef[];
  onColsChange: (cols: ColumnDef[]) => void;
}

export default function SettingsPage({ compactMode, onCompactModeChange, darkMode, onDarkModeChange, visibleCols, onColsChange }: Props) {
  const [emailJS, setEmailJS] = useState({ userId: '', serviceId: '', templateId: '' });
  const [exportFormat, setExportFormatState] = useState<ExportFormat>('json');
  const [saved, setSaved] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [duplicates, setDuplicates] = useState<{ lead1: Lead; lead2: Lead; reason: string }[]>([]);
  const [mergeMsg, setMergeMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setEmailJS({ userId: s.emailJSUserId, serviceId: s.emailJSServiceId, templateId: s.emailJSTemplateId });
      setExportFormatState(s.exportFormat);
    });
  }, []);

  const handleSaveEmail = async () => {
    const current = await getSettings();
    await saveSettings({ ...current, emailJSUserId: emailJS.userId, emailJSServiceId: emailJS.serviceId, emailJSTemplateId: emailJS.templateId, exportFormat });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('¿Restaurar respaldo? Se perderán todos los datos actuales.')) return;
    try {
      const msg = await importBackup(file);
      setRestoreMsg(msg);
      setTimeout(() => setRestoreMsg(''), 5000);
      window.location.reload();
    } catch (err) {
      setRestoreMsg(err instanceof Error ? err.message : 'Error');
      setTimeout(() => setRestoreMsg(''), 5000);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const findDuplicates = async () => {
    const leads = await db.leads.toArray();
    const active = leads.filter((l) => !l.deletedAt);
    const found: typeof duplicates = [];
    const seenRut = new Map<string, number>(); // rut → first index
    const seenPhone = new Map<string, number>();
    for (let i = 0; i < active.length; i++) {
      const l = active[i];
      if (l.rut && seenRut.has(l.rut)) {
        found.push({ lead1: active[seenRut.get(l.rut)!], lead2: l, reason: `RUT: ${l.rut}` });
      } else if (l.rut) {
        seenRut.set(l.rut, i);
      }
      const phone = l.phone?.replace(/[^+\d]/g, '');
      if (phone && seenPhone.has(phone)) {
        found.push({ lead1: active[seenPhone.get(phone)!], lead2: l, reason: `Teléfono: ${l.phone}` });
      } else if (phone) {
        seenPhone.set(phone, i);
      }
    }
    setDuplicates(found);
  };

  const mergeLeads = async (lead1: Lead, lead2: Lead) => {
    const mergedLists = [...new Set([...(lead1.listaIds || []), ...(lead2.listaIds || [])])];
    const mergedNotes = [lead1.notes, lead2.notes].filter(Boolean).join(' | ');
    const best: Partial<Lead> = {
      name: lead1.name || lead2.name,
      phone: lead1.phone || lead2.phone,
      email: lead1.email || lead2.email,
      company: lead1.company || lead2.company,
      rut: lead1.rut || lead2.rut,
      notes: mergedNotes,
      status: (lead1.status !== 'nuevo' ? lead1.status : lead2.status) || 'nuevo',
      listaIds: mergedLists,
      updatedAt: new Date().toISOString(),
    };
    await db.leads.update(lead1.id!, best);
    // Migrar notas y registros del lead2 al lead1
    const notes2 = await db.leadNotes.where('leadId').equals(lead2.id!).toArray();
    for (const n of notes2) await db.leadNotes.update(n.id!, { leadId: lead1.id! });
    const logs2 = await db.sendLog.where('leadId').equals(lead2.id!).toArray();
    for (const sl of logs2) await db.sendLog.update(sl.id!, { leadId: lead1.id! });
    // Eliminar lead2
    await db.leads.delete(lead2.id!);
    setMergeMsg(`Unidos: ${lead2.name} → ${lead1.name}`);
    setTimeout(() => setMergeMsg(''), 3000);
    findDuplicates();
  };

  const toggleCol = (key: string) => {
    onColsChange(visibleCols.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-bold mb-4">Ajustes</h2>

      {/* --- Visualización --- */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-2">Visualización de Leads</h3>

        <label className="flex items-center justify-between py-1.5">
          <span className="text-sm">Modo compacto</span>
          <input type="checkbox" checked={compactMode} onChange={(e) => onCompactModeChange(e.target.checked)} className="rounded" />
        </label>

        <label className="flex items-center justify-between py-1.5">
          <span className="text-sm">Modo oscuro</span>
          <input type="checkbox" checked={darkMode} onChange={(e) => onDarkModeChange(e.target.checked)} className="rounded" />
        </label>

        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-2">Columnas visibles en la tabla:</p>
          {visibleCols.filter((c) => c.key !== 'name').map((col) => (
            <label key={col.key} className="flex items-center justify-between py-1">
              <span className="text-sm">{col.label}</span>
              <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)} className="rounded" />
            </label>
          ))}
          <p className="text-xs text-gray-400 mt-1">El nombre siempre es visible.</p>
        </div>
      </section>

      {/* --- Exportación --- */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-2">Exportación</h3>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Formato por defecto</label>
          <select
            value={exportFormat}
            onChange={async (e) => {
              const fmt = e.target.value as ExportFormat;
              setExportFormatState(fmt);
              try { chrome.storage.sync.set({ exportFormat: fmt }); } catch { /* noop */ }
              const current = await getSettings();
              await saveSettings({ ...current, exportFormat: fmt });
            }}
            className="border rounded px-2 py-1.5 text-sm"
          >
            <option value="json">JSON</option>
            <option value="excel">Excel (.xlsx)</option>
          </select>
        </div>
      </section>

      {/* --- Respaldo --- */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-2">Respaldo y Restauración</h3>
        <p className="text-xs text-gray-500 mb-3">
          Exportá toda la base de datos (leads, listas, plantillas, historial, configuración) a un archivo JSON. Usalo para respaldar o migrar.
        </p>
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={exportBackup}
            className="bg-gray-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-700"
          >
            Exportar respaldo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleRestore}
            className="hidden"
            id="restore-file"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-amber-700"
          >
            Restaurar respaldo
          </button>
        </div>
        {restoreMsg && <p className="mt-2 text-xs text-green-600">{restoreMsg}</p>}
      </section>

      {/* --- Duplicados --- */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-2">Duplicados</h3>
        <p className="text-xs text-gray-500 mb-2">Buscar leads con mismo RUT o teléfono para unirlos.</p>
        <button onClick={findDuplicates} className="bg-gray-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-700 mb-2">
          Buscar duplicados
        </button>
        {mergeMsg && <p className="text-xs text-green-600 ml-2 inline">{mergeMsg}</p>}
        {duplicates.length > 0 && (
          <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
            {duplicates.map((d, i) => (
              <div key={i} className="border rounded p-2 text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{d.lead1.name}</span>
                  <span className="text-gray-400 mx-1">+</span>
                  <span className="font-medium">{d.lead2.name}</span>
                  <span className="text-gray-400 ml-2">({d.reason})</span>
                </div>
                <button onClick={() => { if (confirm('¿Unir estos leads?')) mergeLeads(d.lead1, d.lead2); }}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700 shrink-0">
                  Unir
                </button>
              </div>
            ))}
          </div>
        )}
        {duplicates.length === 0 && mergeMsg && <p className="text-xs text-gray-400">No se encontraron duplicados.</p>}
      </section>

      {/* --- Email --- */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 border-b pb-1 mb-2">Correo Electrónico (EmailJS)</h3>
        <p className="text-xs text-gray-500 mb-3">
          Regístrate en <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">emailjs.com</a> (200 emails/día gratis).
          Campos necesarios en la plantilla: <code className="bg-gray-100 px-1 rounded text-xs">to_email, to_name, subject, message, message_html</code>.
        </p>
        <div className="space-y-2">
          <div><label className="block text-xs text-gray-600 mb-0.5">Public Key</label>
            <input type="text" value={emailJS.userId} onChange={(e) => setEmailJS({ ...emailJS, userId: e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-xs" /></div>
          <div><label className="block text-xs text-gray-600 mb-0.5">Service ID</label>
            <input type="text" value={emailJS.serviceId} onChange={(e) => setEmailJS({ ...emailJS, serviceId: e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-xs" /></div>
          <div><label className="block text-xs text-gray-600 mb-0.5">Template ID</label>
            <input type="text" value={emailJS.templateId} onChange={(e) => setEmailJS({ ...emailJS, templateId: e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-xs" /></div>
          <button onClick={handleSaveEmail} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700">
            Guardar configuración</button>
          {saved && <span className="ml-2 text-green-600 text-xs">Guardado</span>}
        </div>
      </section>
    </div>
  );
}
