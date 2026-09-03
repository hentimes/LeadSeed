import { supabase } from '../lib/supabaseClient';

/**
 * Volcado crudo de las tablas del usuario para el respaldo.
 *
 * Se devuelve sin mapear a dominio a proposito: el archivo de respaldo es una
 * copia fiel de las filas, y mapearlas perderia columnas que hoy no usa la UI
 * pero que hacen falta para restaurar.
 */
export interface BackupSnapshotRows {
  leads: unknown[];
  leadLists: unknown[];
  templates: unknown[];
  templateLists: unknown[];
  sendLogs: unknown[];
}

async function dumpTable(table: string, userId: string): Promise<unknown[]> {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);

  if (error) {
    // Un respaldo incompleto y silencioso es peor que ninguno: el usuario se
    // llevaria un archivo al que le faltan tablas sin enterarse.
    throw new Error(`No se pudo exportar la tabla ${table}: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchBackupSnapshotRows(userId: string): Promise<BackupSnapshotRows> {
  const [leads, leadLists, templates, templateLists, sendLogs] = await Promise.all([
    dumpTable('leads', userId),
    dumpTable('lead_lists', userId),
    dumpTable('templates', userId),
    dumpTable('template_lists', userId),
    dumpTable('send_logs', userId),
  ]);

  return { leads, leadLists, templates, templateLists, sendLogs };
}
