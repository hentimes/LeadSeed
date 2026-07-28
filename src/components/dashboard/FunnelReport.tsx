import React, { useState } from 'react';
import type { DashboardSnapshot } from '../../services/dashboardService';
import { Icon } from '../../utils/icons';

// Import our new charts (we will create them next)
import AdvancedFunnelChart from './charts/AdvancedFunnelChart';
import TimeInStageChart from './charts/TimeInStageChart';
import LossReasonsChart from './charts/LossReasonsChart';
import QualityMatrix from './charts/QualityMatrix';

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

  return (
    <div className="flex flex-col gap-4 animate-ios-slide-up pb-2">
      
      {/* Header and Back Button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#635BFF] hover:text-[#5B42F3] transition-colors"
          >
            <Icon.ArrowLeft />
            Volver al pipeline
          </button>
          <div className="h-4 w-[1px] bg-[#E2E6F0]" />
          <h1 className="text-[14px] font-medium text-[#111936]">Reporte completo del embudo</h1>
        </div>
        
        <select 
          className="text-[11px] border border-[#E6EAF0] rounded-[6px] px-2 py-1 text-[#161A24] bg-white cursor-pointer hover:border-[#635BFF] transition-colors outline-none"
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
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-3 flex flex-col shadow-sm">
          <div className="flex items-center gap-1.5 mb-1.5 text-[#5B6475]">
            <div className="w-5 h-5 flex items-center justify-center bg-[#F4F1FF] text-[#7B5CFF] rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Tasa de conversión</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[20px] font-bold text-[#111936] leading-none">{conversionRate}%</span>
            <span className="text-[10px] font-bold text-[#16C26E]">+ 3 pp</span>
          </div>
          <span className="text-[9px] text-[#8C95A6] mt-1 leading-none">vs periodo anterior</span>
        </div>

        {/* Ciclo de ventas */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-3 flex flex-col shadow-sm">
          <div className="flex items-center gap-1.5 mb-1.5 text-[#5B6475]">
            <div className="w-5 h-5 flex items-center justify-center bg-[#F4F1FF] text-[#7B5CFF] rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Ciclo de ventas</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111936] leading-none">14.2</span>
            <span className="text-[10px] font-medium text-[#5B6475]">días</span>
          </div>
          <span className="text-[9px] text-[#16C26E] mt-1 font-bold leading-none">+ 1.5 días vs ant.</span>
        </div>

        {/* Tasa de pérdida */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-3 flex flex-col shadow-sm">
          <div className="flex items-center gap-1.5 mb-1.5 text-[#5B6475]">
            <div className="w-5 h-5 flex items-center justify-center bg-[#F4F1FF] text-[#7B5CFF] rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Tasa de pérdida (Churn)</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[20px] font-bold text-[#111936] leading-none">{churnRate}%</span>
            <span className="text-[10px] font-bold text-[#EF3340]">↑ 2 pp</span>
          </div>
          <span className="text-[9px] text-[#8C95A6] mt-1 leading-none">vs periodo anterior</span>
        </div>

        {/* Valor de Oportunidades */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-3 flex flex-col shadow-sm">
          <div className="flex items-center gap-1.5 mb-1.5 text-[#5B6475]">
            <div className="w-5 h-5 flex items-center justify-center bg-[#F4F1FF] text-[#7B5CFF] rounded-full shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="text-[11px] font-semibold leading-none">Valor potencial del pipe</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111936] leading-none">$12.4k</span>
          </div>
          <span className="text-[9px] text-[#8C95A6] mt-1 leading-none">Basado en leads activos</span>
        </div>
      </div>

      {/* 2. Gráfico Avanzado de Embudo y Razones de Pérdida */}
      <div className="grid grid-cols-3 gap-3">
        
        {/* Drop-off Analysis */}
        <div className="col-span-2 bg-white border border-[#E6EAF0] rounded-[6px] p-3 shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <h3 className="text-[12px] font-medium text-[#111936]">Análisis de Fugas (Drop-offs)</h3>
            <div className="text-[#8C95A6]"><Icon.Help /></div>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[140px] max-w-[400px] w-full mx-auto">
            <AdvancedFunnelChart snapshot={snapshot} />
          </div>
        </div>

        {/* Loss Reasons */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-3 shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-[12px] font-medium text-[#111936]">Razones de descarte</h3>
            <div className="text-[#8C95A6]"><Icon.Help /></div>
          </div>
          <div className="flex-1 min-h-[140px]">
            <LossReasonsChart />
          </div>
        </div>
      </div>

      {/* 3. Análisis de Tiempos y Calidad por Fuente */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Time in Stage */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-3 shadow-sm flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <h3 className="text-[12px] font-medium text-[#111936]">Tiempo promedio por etapa</h3>
            <div className="text-[#8C95A6]"><Icon.Help /></div>
          </div>
          <div className="flex-1">
            <TimeInStageChart />
          </div>
        </div>

        {/* Quality Matrix */}
        <div className="bg-white border border-[#E6EAF0] rounded-[6px] p-3 shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-[12px] font-medium text-[#111936]">Calidad de Leads por Fuente</h3>
            <div className="text-[#8C95A6]"><Icon.Help /></div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <QualityMatrix />
          </div>
        </div>
      </div>


      
    </div>
  );
}
