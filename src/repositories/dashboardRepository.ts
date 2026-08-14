import { supabase } from '../lib/supabaseClient';
import type { ComparePeriod } from '../types';

export interface DashboardSnapshotRow {
  leadSummary?: {
    total?: number;
    contacted?: number;
    converted?: number;
    forgotten?: number;
    statusCounts?: Record<string, number>;
    monthlyCounts?: Array<{ name: string; count: number }>;
    originCounts?: Record<string, number>;
    channelCounts?: Record<string, number>;
    lossReasons?: Array<{ name: string; value: number }>;
    originQuality?: Array<{ origin: string; leads: number; converted: number; avgCycleDays: number | null }>;
    monthlyByOrigin?: Array<{ name: string; counts: Record<string, number> }>;
    stageDurations?: { nuevoAContactado: number | null; contactadoACierre: number | null };
  };
  sendSummary?: {
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
    completedTotal?: number;
    total?: number;
  };
}

export async function fetchDashboardSnapshotRow(comparePeriod: ComparePeriod): Promise<DashboardSnapshotRow> {
  const { data, error } = await supabase.rpc('get_my_dashboard_snapshot', {
    p_compare_period: comparePeriod,
  });

  if (error || !data) {
    if (error) {
      console.error('fetchDashboardSnapshotRow failed', error);
    }
    return {};
  }

  return data as DashboardSnapshotRow;
}
