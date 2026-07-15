import { supabase } from '../lib/supabaseClient';

export async function exportBackup(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return;

  const [
    { data: leads },
    { data: leadLists },
    { data: templates },
    { data: templateLists },
    { data: sendLogs },
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('user_id', userId),
    supabase.from('lead_lists').select('*').eq('user_id', userId),
    supabase.from('templates').select('*').eq('user_id', userId),
    supabase.from('template_lists').select('*').eq('user_id', userId),
    supabase.from('send_logs').select('*').eq('user_id', userId),
  ]);

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
