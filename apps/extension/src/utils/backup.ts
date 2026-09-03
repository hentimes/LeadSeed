import { fetchBackupSnapshotRows } from '../repositories/backupRepository';
import { getCurrentSession } from '../services/authService';
import { getPlatform } from '../platform/registry';

export async function exportBackup(): Promise<void> {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const { leads, leadLists, templates, templateLists, sendLogs } =
    await fetchBackupSnapshotRows(userId);

  const data = {
    version: 3,
    exportedAt: new Date().toISOString(),
    leads,
    leadLists,
    templates,
    templateLists,
    sendLogs,
  };

  const json = JSON.stringify(data, null, 2);
  void getPlatform().fileSaver.save({
    content: json,
    filename: `leadseed-backup-${new Date().toISOString().slice(0, 10)}.json`,
    mimeType: 'application/json',
  });
}

export async function importBackup(_file: File): Promise<string> {
  return new Promise((_resolve, reject) => {
    reject(new Error('La importación de respaldos ya no es soportada en la versión Cloud. Usa la funcionalidad de "Importar Leads".'));
  });
}
