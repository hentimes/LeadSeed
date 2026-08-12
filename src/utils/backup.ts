import { fetchBackupSnapshotRows } from '../repositories/backupRepository';
import { getCurrentSession } from '../services/authService';

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
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    reject(new Error('La importación de respaldos ya no es soportada en la versión Cloud. Usa la funcionalidad de "Importar Leads".'));
  });
}
