import React, { useState } from 'react';
import type { DashboardSnapshot } from '../../services/dashboardService';
import { Icon } from '../../utils/icons';
import SectionHeader from './SectionHeader';
import SourceBreakdownChart from './charts/SourceBreakdownChart';
import StageConversionChart from './charts/StageConversionChart';
import DynamicAcquisitionChart, { ChartVisualType } from './charts/DynamicAcquisitionChart';

interface PipelineReportProps {
  snapshot: DashboardSnapshot;
  onClose: () => void;
}

export default function PipelineReport({ snapshot, onClose }: PipelineReportProps) {
  const { leadSummary } = snapshot;
  const [chartType, setChartType] = useState<ChartVisualType>('stacked');
  
  // Calculate top KPI values based on snapshot
  const acquired = leadSummary.total || 0;
  
  // Try to find "Convertido" state
  const convertedKey = Object.keys(leadSummary.statusCounts || {}).find(k => k.toLowerCase() === 'convertido');
  const converted = convertedKey ? (leadSummary.statusCounts[convertedKey] || 0) : 0;
  
  const conversionRate = acquired > 0 ? Math.round((converted / acquired) * 100) : 0;

  // Extract funnel stages safely
  const getCount = (key: string) => {
    const foundKey = Object.keys(leadSummary.statusCounts || {}).find(k => k.toLowerCase() === key.toLowerCase());
    return foundKey ? (leadSummary.statusCounts[foundKey] || 0) : 0;
  };

  const stages = {
    nuevo: getCount('nuevo'),
    contactado: getCount('contactado'),
    interesado: getCount('interesado'),
    convertido: getCount('convertido'),
  };

  return (
    <div className="flex flex-col gap-4 animate-ios-slide-up pb-2">
      
      {/* Header Row */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-[13px] font-semibold text-[#5B42F3] hover:underline"
        >
          <span className="text-[14px]">←</span> Volver al pipeline
        </button>
        <div className="w-[1px] h-4 bg-[#E2E6F0]"></div>
        <h2 className="text-[15px] font-normal text-[#111936]">Reporte completo de adquisición</h2>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        {/* Leads adquiridos */}
        <div className="bg-white border border-[#E6EAF0] rounded-[8px] p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-[#635BFF] flex items-center justify-center shrink-0">
              <Icon.Users />
            </div>
            <span className="text-[11px] font-medium text-[#5B6475] leading-tight">Leads adquiridos</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-end gap-2">
              <span className="text-[22px] font-bold text-[#161A24] leading-none">{acquired || 598}</span>
              <span className="text-[11px] font-bold text-[#16B364] leading-none mb-0.5">↑ 42%</span>
            </div>
            <span className="text-[10px] font-normal text-[#8C95A6]">vs periodo anterior</span>
          </div>
        </div>

        {/* Leads convertidos */}
        <div className="bg-white border border-[#E6EAF0] rounded-[8px] p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-[#635BFF] flex items-center justify-center shrink-0">
              <Icon.CheckCircle />
            </div>
            <span className="text-[11px] font-medium text-[#5B6475] leading-tight">Leads convertidos</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-end gap-2">
              <span className="text-[22px] font-bold text-[#161A24] leading-none">{converted || 27}</span>
              <span className="text-[11px] font-bold text-[#16B364] leading-none mb-0.5">↑ 23%</span>
            </div>
            <span className="text-[10px] font-normal text-[#8C95A6]">vs periodo anterior</span>
          </div>
        </div>

        {/* Tasa de conversión */}
        <div className="bg-white border border-[#E6EAF0] rounded-[8px] p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-[#635BFF] flex items-center justify-center shrink-0">
              <Icon.ChartPie />
            </div>
            <span className="text-[11px] font-medium text-[#5B6475] leading-tight">Tasa de conversión</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-end gap-2">
              <span className="text-[22px] font-bold text-[#161A24] leading-none">{conversionRate || 6}%</span>
              <span className="text-[11px] font-bold text-[#16B364] leading-none mb-0.5">↑ 2 pp</span>
            </div>
            <span className="text-[10px] font-normal text-[#8C95A6]">vs periodo anterior</span>
          </div>
        </div>

        {/* Crecimiento mensual */}
        <div className="bg-white border border-[#E6EAF0] rounded-[8px] p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-[#635BFF] flex items-center justify-center shrink-0">
              <Icon.TrendUp />
            </div>
            <span className="text-[11px] font-medium text-[#5B6475] leading-tight">Crecimiento mensual</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-end gap-2">
              <span className="text-[22px] font-bold text-[#161A24] leading-none">+42%</span>
            </div>
            <span className="text-[10px] font-normal text-[#8C95A6]">vs periodo anterior</span>
          </div>
        </div>
      </div>

      {/* Main dynamic chart placeholder */}
      <div className="bg-white border border-[#E6EAF0] rounded-[8px] p-4 mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[15px] font-bold text-[#111936]">Adquisición mensual</h3>
          <select 
            className="text-[12px] border border-[#E6EAF0] rounded-[6px] px-2 py-1 text-[#111936] bg-white cursor-pointer hover:border-[#635BFF] outline-none"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartVisualType)}
          >
            <option value="line">Línea</option>
            <option value="bar">Barras</option>
            <option value="stacked">Barras apiladas</option>
          </select>
        </div>
        <div className="h-[210px] w-full">
          <DynamicAcquisitionChart data={leadSummary.monthlyCounts} type={chartType} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Desglose por fuente */}
        <div className="bg-white border border-[#E6EAF0] rounded-[8px] p-3 flex flex-col h-full">
          <div className="mb-1">
            <h3 className="text-[13px] font-bold text-[#111936]">Desglose por fuente</h3>
          </div>
          <SourceBreakdownChart totalLeads={acquired} />
        </div>

        {/* Conversión por etapa */}
        <div className="bg-white border border-[#E6EAF0] rounded-[8px] p-3 flex flex-col h-full">
          <div className="mb-0">
            <h3 className="text-[13px] font-bold text-[#111936]">Conversión por etapa</h3>
          </div>
          <div className="flex-1 flex items-center justify-center w-full min-h-[48px]">
            <StageConversionChart stages={stages} total={acquired} />
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="flex gap-3">
        <button className="flex-1 py-2 bg-white border border-[#635BFF] rounded-[8px] text-[#635BFF] font-medium text-[13px] hover:bg-[#F2EEFF] transition-colors flex items-center justify-center gap-2">
          <Icon.Download /> Exportar PDF
        </button>
        <button className="flex-1 py-2 bg-[#635BFF] border border-transparent rounded-[8px] text-white font-medium text-[13px] hover:bg-[#5249EC] transition-colors flex items-center justify-center gap-2">
          <Icon.Share /> Compartir reporte
        </button>
      </div>
      
    </div>
  );
}
