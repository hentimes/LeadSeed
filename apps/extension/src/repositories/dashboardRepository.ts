import { supabase } from '../lib/supabaseClient';
import type { ComparePeriod } from '../types';

export interface DashboardSnapshotRow {
  leadSummary?: {
    total?: number;
    contacted?: number;
    converted?: number;
    forgotten?: number;
    createdToday?: number;
    createdCompare?: number;
    statusCounts?: Record<string, number>;
    monthlyCounts?: Array<{ name: string; count: number }>;
    originCounts?: Record<string, number>;
    /** Que enlace y campaña trajo cuantos leads. Solo los de canal 'pb'. */
    campaignCounts?: Array<{ enlace: string; campana: string; leads: number }>;
    channelCounts?: Record<string, number>;
    lossReasons?: Array<{ name: string; value: number }>;
    originQuality?: Array<{ origin: string; leads: number; converted: number; avgCycleDays: number | null }>;
    monthlyByOrigin?: Array<{ name: string; counts: Record<string, number> }>;
    stageDurations?: { nuevoAContactado: number | null; contactadoACierre: number | null };
  };
  sendSummary?: {
    /** Envios de HOY, siempre, sin importar la ventana. Alimenta las metas diarias. */
    hoy?: {
      whatsapp?: number;
      email?: number;
      call?: number;
      total?: number;
    };
    /** Envios de la ventana elegida. Conserva el nombre `today` por compatibilidad. */
    today?: {
      whatsapp?: number;
      email?: number;
      call?: number;
      total?: number;
    };
    compare?: {
      whatsapp?: number;
      email?: number;
      call?: number;
      total?: number;
    };
  };
  taskSummary?: {
    pending?: number;
    overdue?: number;
    today?: number;
    completedToday?: number;
    completedCompare?: number;
    completedTotal?: number;
    total?: number;
  };
}

export async function fetchDashboardSnapshotRow(periodo: ComparePeriod): Promise<DashboardSnapshotRow> {
  const { data, error } = await supabase.rpc('get_my_dashboard_snapshot', {
    // `p_period` desde la 177: antes era `p_compare_period` y significaba
    // "contra que dia comparar"; ahora es la ventana que se muestra.
    p_period: periodo,
    /*
     * El dia lo corta el servidor, y lo cortaba en UTC: a las 20:00 de Chile
     * alli ya era el dia siguiente, asi que el contador de "hoy" se vaciaba
     * con la jornada por la mitad. La zona la sabe el navegador y no hay que
     * preguntarla ni guardarla en ningun lado.
     */
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  if (error || !data) {
    if (error) {
      console.error('fetchDashboardSnapshotRow failed', error);
    }
    return {};
  }

  return data as DashboardSnapshotRow;
}
