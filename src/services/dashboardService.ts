import { fetchDashboardSnapshotRow, type DashboardSnapshotRow } from '../repositories/dashboardRepository';
import type { ComparePeriod } from '../types';

export interface DashboardSnapshot {
  leadSummary: {
    total: number;
    contacted: number;
    converted: number;
    forgotten: number;
    /** Leads entrados hoy y en el periodo de comparacion. */
    createdToday: number;
    createdCompare: number;
    statusCounts: Record<string, number>;
    monthlyCounts: Array<{ name: string; count: number }>;
    /** Como entro el lead: manual, imported, web_form. */
    originCounts: Record<string, number>;
    /** De que formulario publico vino, si vino de uno: pb, general, retiro, form. */
    channelCounts: Record<string, number>;
    /** Motivos de descarte contados. Los que nadie declaro salen como 'Sin motivo'. */
    lossReasons: Array<{ name: string; value: number }>;
    /** Por origen: volumen, convertidos y ciclo medio en dias. Ciclo nulo si no hay convertidos. */
    originQuality: Array<{ origin: string; leads: number; converted: number; avgCycleDays: number | null }>;
    /** Adquisicion mensual desglosada por origen, para las barras apiladas. */
    monthlyByOrigin: Array<{ name: string; counts: Record<string, number> }>;
    /**
     * Dias promedio entre etapas. Solo hay dos tramos porque `leads` no guarda
     * cuando el lead paso a "interesado". Nulo si aun no hay ningun caso.
     */
    stageDurations: { nuevoAContactado: number | null; contactadoACierre: number | null };
  };
  sendSummary: {
    today: {
      whatsapp: number;
      email: number;
      call: number;
      total: number;
    };
    compare: {
      whatsapp: number;
      email: number;
      call: number;
      total: number;
    };
  };
  taskSummary: {
    pending: number;
    overdue: number;
    today: number;
    /**
     * Tareas completadas hoy, por `completed_at`. Las completadas antes de la
     * migracion 103 no tienen sello y no se cuentan aqui.
     */
    completedToday: number;
    /** Las mismas, en el periodo de comparacion. */
    completedCompare: number;
    completedTotal: number;
    total: number;
  };
}

function withDefaults(row: DashboardSnapshotRow): DashboardSnapshot {
  return {
    leadSummary: {
      total: row.leadSummary?.total ?? 0,
      contacted: row.leadSummary?.contacted ?? 0,
      converted: row.leadSummary?.converted ?? 0,
      forgotten: row.leadSummary?.forgotten ?? 0,
      createdToday: row.leadSummary?.createdToday ?? 0,
      createdCompare: row.leadSummary?.createdCompare ?? 0,
      statusCounts: row.leadSummary?.statusCounts ?? {},
      monthlyCounts: row.leadSummary?.monthlyCounts ?? [],
      originCounts: row.leadSummary?.originCounts ?? {},
      channelCounts: row.leadSummary?.channelCounts ?? {},
      lossReasons: row.leadSummary?.lossReasons ?? [],
      originQuality: row.leadSummary?.originQuality ?? [],
      monthlyByOrigin: row.leadSummary?.monthlyByOrigin ?? [],
      stageDurations: row.leadSummary?.stageDurations ?? { nuevoAContactado: null, contactadoACierre: null },
    },
    sendSummary: {
      today: {
        whatsapp: row.sendSummary?.today?.whatsapp ?? 0,
        email: row.sendSummary?.today?.email ?? 0,
        call: row.sendSummary?.today?.call ?? 0,
        total: row.sendSummary?.today?.total ?? 0,
      },
      compare: {
        whatsapp: row.sendSummary?.compare?.whatsapp ?? 0,
        email: row.sendSummary?.compare?.email ?? 0,
        call: row.sendSummary?.compare?.call ?? 0,
        total: row.sendSummary?.compare?.total ?? 0,
      },
    },
    taskSummary: {
      pending: row.taskSummary?.pending ?? 0,
      overdue: row.taskSummary?.overdue ?? 0,
      today: row.taskSummary?.today ?? 0,
      completedToday: row.taskSummary?.completedToday ?? 0,
      completedCompare: row.taskSummary?.completedCompare ?? 0,
      completedTotal: row.taskSummary?.completedTotal ?? 0,
      total: row.taskSummary?.total ?? 0,
    },
  };
}

export async function fetchDashboardSnapshot(comparePeriod: ComparePeriod): Promise<DashboardSnapshot> {
  const row = await fetchDashboardSnapshotRow(comparePeriod);
  return withDefaults(row);
}
