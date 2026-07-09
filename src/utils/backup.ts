import { db } from '../db/database';

export async function exportBackup(): Promise<void> {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    leads: await db.leads.toArray(),
    leadLists: await db.leadLists.toArray(),
    whatsappTemplates: await db.whatsappTemplates.toArray(),
    whatsappTemplateLists: await db.whatsappTemplateLists.toArray(),
    emailTemplates: await db.emailTemplates.toArray(),
    emailTemplateLists: await db.emailTemplateLists.toArray(),
    settings: await db.settings.toArray(),
    tasks: await db.tasks.toArray(),
    leadNotes: await db.leadNotes.toArray(),
    sendLog: await db.sendLog.toArray(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.leads) throw new Error('Archivo de respaldo inválido: falta leads');

        // Limpiar DB actual
        await db.leads.clear();
        await db.leadLists.clear();
        await db.whatsappTemplates.clear();
        await db.whatsappTemplateLists.clear();
        await db.emailTemplates.clear();
        await db.emailTemplateLists.clear();
        await db.settings.clear();
        await db.tasks.clear();
        await db.leadNotes.clear();
        await db.sendLog.clear();

        // Restaurar
        if (data.leads.length) await db.leads.bulkAdd(data.leads);
        if (data.leadLists?.length) await db.leadLists.bulkAdd(data.leadLists);
        if (data.whatsappTemplates?.length) await db.whatsappTemplates.bulkAdd(data.whatsappTemplates);
        if (data.whatsappTemplateLists?.length) await db.whatsappTemplateLists.bulkAdd(data.whatsappTemplateLists);
        if (data.emailTemplates?.length) await db.emailTemplates.bulkAdd(data.emailTemplates);
        if (data.emailTemplateLists?.length) await db.emailTemplateLists.bulkAdd(data.emailTemplateLists);
        if (data.settings?.length) await db.settings.bulkAdd(data.settings);
        if (data.tasks?.length) await db.tasks.bulkAdd(data.tasks);
        if (data.leadNotes?.length) await db.leadNotes.bulkAdd(data.leadNotes);
        if (data.sendLog?.length) await db.sendLog.bulkAdd(data.sendLog);

        const total = (data.leads?.length || 0) + (data.leadLists?.length || 0);
        resolve(`Restauración completada: ${data.leads?.length || 0} leads, ${data.leadLists?.length || 0} listas`);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Error al restaurar'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}
