import { useState } from 'react';
import type { DashboardSnapshot } from '../../services/dashboardService';
import { Icon } from '../../utils/icons';

// Import our new charts (we will create them next)
import AdvancedFunnelChart from './charts/AdvancedFunnelChart';
import TimeInStageChart from './charts/TimeInStageChart';
import LossReasonsChart from './charts/LossReasonsChart';
import QualityMatrix from './charts/QualityMatrix';
import { Card } from '../../design';

interface FunnelReportProps {
  snapshot: DashboardSnapshot;
  onClose: () => void;
}

export default function FunnelReport({ snapshot, onClose }: FunnelReportProps) {
  const { leadSummary } = snapshot;
  const [period, setPeriod] = useState('Hoy');

  // Helper to extract data from snapshot if needed
  const getCount = (key: string) => {
    const foundKey = Object.keys(leadSummary.statusCounts || {}).find(k => k.toLowerCase() === key.toLowerCase());
    return foundKey ? (leadSummary.statusCounts[foundKey] || 0) : 0;
  };
  
  const total = leadSummary.total || 1;
  const convertidos = getCount('convertido');
  const descartados = getCount('descartado');

  const conversionRate = Math.round((convertidos / total) * 100);
  const churnRate = Math.round((descartados / total) * 100);

  /*
   * EL CICLO DE VENTAS SALE DEL SNAPSHOT. ANTES DECIA "14.2 DIAS" SIEMPRE.
   *
   * Estos cuatro indicadores mostraban numeros escritos a mano que nunca
   * cambiaban: "14.2 dias", "+ 1.5 dias vs ant.", "+ 3 pp", "↑ 2 pp" y
   * "$12.4k". Ninguno venia de la cuenta de quien miraba.
   *
   * El ciclo si es calculable: `stageDurations` trae los dos tramos en dias,
   * que sumados son el tiempo de nuevo a cierre. Cuando todavia no hay ningun
   * lead que haya recorrido el camino completo llegan en nulo, y entonces se
   * dice "sin datos" en vez de inventar una cifra.
   */
  const duraciones = leadSummary.stageDurations;
  const cicloDias =
    duraciones && duraciones.nuevoAContactado !== null && duraciones.contactadoACierre !== null
      ? duraciones.nuevoAContactado + duraciones.contactadoACierre
      : null;

  return (
    <div className="flex flex-col gap-4 animate-ios-slide-up pb-2">
      
      {/* Header and Back Button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary transition-colors"
          >
            <Icon.ArrowLeft />
            Volver al pipeline
          </button>
          <div className="h-4 w-[1px] bg-line" />
          <h1 className="text-section-title font-semibold text-ink tracking-tight">Reporte completo del embudo</h1>
        </div>
        
        <select 
          className="text-[11px] border border-line rounded-[6px] px-2 py-1 text-ink bg-surface cursor-pointer hover:border-primary transition-colors outline-none"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>Hoy</option>
          <option>Últimos 7 días</option>
          <option>Últimos 30 días</option>
          <option>Este año</option>
        </select>
      </div>

      {/* 1. KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {/* Tasa de conversión */}
        <Card className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5 text-ink-secondary">
            <div className="w-5 h-5 flex items-center justify-center bg-primary-soft text-primary-light rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Tasa de conversión</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[20px] font-bold text-ink leading-none tabular-nums">{conversionRate}%</span>
          </div>
          <span className="text-[9px] text-ink-muted mt-1 leading-none">convertidos sobre el total</span>
        </Card>

        {/* Ciclo de ventas */}
        <Card className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5 text-ink-secondary">
            <div className="w-5 h-5 flex items-center justify-center bg-primary-soft text-primary-light rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Ciclo de ventas</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            {cicloDias === null ? (
              <span className="text-[13px] font-semibold text-ink-muted leading-none">Sin datos</span>
            ) : (
              <>
                <span className="text-[20px] font-bold text-ink leading-none tabular-nums">
                  {cicloDias.toFixed(1)}
                </span>
                <span className="text-[10px] font-medium text-ink-secondary">días</span>
              </>
            )}
          </div>
          <span className="text-[9px] text-ink-muted mt-1 leading-none">
            {cicloDias === null ? 'Ningún lead completó el recorrido' : 'de nuevo a cierre'}
          </span>
        </Card>

        {/* Tasa de pérdida */}
        <Card className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5 text-ink-secondary">
            <div className="w-5 h-5 flex items-center justify-center bg-primary-soft text-primary-light rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Tasa de pérdida (Churn)</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[20px] font-bold text-ink leading-none tabular-nums">{churnRate}%</span>
          </div>
          <span className="text-[9px] text-ink-muted mt-1 leading-none">descartados sobre el total</span>
        </Card>

        {/*
          AQUI HABIA UNA TARJETA DE "VALOR POTENCIAL DEL PIPE: $12.4K".

          Se retira, no se arregla. En toda la base de datos no existe ningun
          importe: ni precio por lead, ni valor de oportunidad, ni moneda. Ese
          "$12.4k" era un literal, y no habia forma de calcularlo aunque se
          quisiera.

          Para que vuelva hace falta primero decidir el dato -de donde sale el
          valor de un lead- y guardarlo. Mientras tanto, una tarjeta menos es
          mejor que una cifra inventada sobre el dinero de quien la lee.

          En su lugar va el total de leads en el embudo, que si es real y
          mantiene la rejilla de cuatro.
        */}
        <Card className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5 text-ink-secondary">
            <div className="w-5 h-5 flex items-center justify-center bg-primary-soft text-primary-light rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Leads en el embudo</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-ink leading-none tabular-nums">
              {leadSummary.total || 0}
            </span>
          </div>
          <span className="text-[9px] text-ink-muted mt-1 leading-none">en total</span>
        </Card>
      </div>

      {/* 2. Gráfico Avanzado de Embudo y Razones de Pérdida */}
      <div className="grid grid-cols-3 gap-3">
        
        {/* Drop-off Analysis */}
        <Card className="col-span-2 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <h3 className="text-card-title font-medium text-ink">Análisis de Fugas (Drop-offs)</h3>
            <div className="text-ink-muted"><Icon.Help /></div>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[140px] max-w-[400px] w-full mx-auto">
            <AdvancedFunnelChart snapshot={snapshot} />
          </div>
        </Card>

        {/* Loss Reasons */}
        <Card className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-card-title font-medium text-ink">Razones de descarte</h3>
            <div className="text-ink-muted"><Icon.Help /></div>
          </div>
          <div className="flex-1 min-h-[140px]">
            <LossReasonsChart data={leadSummary.lossReasons} />
          </div>
        </Card>
      </div>

      {/* 3. Análisis de Tiempos y Calidad por Fuente */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Time in Stage */}
        <Card className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <h3 className="text-card-title font-medium text-ink">Tiempo promedio por etapa</h3>
            <div className="text-ink-muted"><Icon.Help /></div>
          </div>
          <div className="flex-1">
            <TimeInStageChart data={leadSummary.stageDurations} />
          </div>
        </Card>

        {/* Quality Matrix */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-card-title font-medium text-ink">Calidad de Leads por Fuente</h3>
            <div className="text-ink-muted"><Icon.Help /></div>
          </div>
          <div className="flex-1 overflow-auto">
            <QualityMatrix data={leadSummary.originQuality} />
          </div>
        </Card>
      </div>


      
    </div>
  );
}
