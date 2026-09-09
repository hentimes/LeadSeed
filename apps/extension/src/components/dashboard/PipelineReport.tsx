import React, { useState } from 'react';
import type { DashboardSnapshot } from '../../services/dashboardService';
import { Icon } from '../../utils/icons';
import { calcularTendencia, type Trend } from './trend';
import SourceBreakdownChart from './charts/SourceBreakdownChart';
import StageConversionChart from './charts/StageConversionChart';
import DynamicAcquisitionChart, { ChartVisualType } from './charts/DynamicAcquisitionChart';

interface PipelineReportProps {
  snapshot: DashboardSnapshot;
  onClose: () => void;
}

/** Sin cambios no es ni bueno ni malo: no se pinta de verde. */
const COLOR_TENDENCIA: Record<Trend['direction'], string> = {
  up: 'text-state-success',
  down: 'text-state-danger',
  flat: 'text-ink-muted',
};

/**
 * Un indicador del reporte.
 *
 * Existe porque los cuatro eran el mismo bloque copiado con los numeros
 * cambiados, y era justo lo que permitia que tres de ellos llevaran una
 * tendencia escrita a mano sin que se notara al leer el archivo.
 *
 * `tendencia` es opcional a proposito: si no hay con que comparar, la linea de
 * abajo dice de que periodo es el numero y no finge una flecha.
 */
function KpiCard({
  icon,
  label,
  valor,
  pie,
  tendencia,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  pie?: string;
  tendencia?: Trend;
}) {
  return (
    <div className="bg-surface border border-line rounded-[8px] p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="text-primary flex items-center justify-center shrink-0">{icon}</div>
        <span className="text-[11px] font-medium text-ink-secondary leading-tight">{label}</span>
      </div>
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-end gap-2">
          <span className="text-[22px] font-bold text-ink leading-none tabular-nums">{valor}</span>
          {tendencia && (
            <span className={`text-[11px] font-bold leading-none mb-0.5 ${COLOR_TENDENCIA[tendencia.direction]}`}>
              {tendencia.direction === 'up' ? '↑' : tendencia.direction === 'down' ? '↓' : ''} {tendencia.value}
            </span>
          )}
        </div>
        <span className="text-[10px] font-normal text-ink-muted">{tendencia ? tendencia.label : pie}</span>
      </div>
    </div>
  );
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

  /*
   * EL CRECIMIENTO MENSUAL SE CALCULA. ANTES DECIA "+42%" SIEMPRE.
   *
   * Los cuatro indicadores de esta pantalla tenian numeros escritos a mano:
   * valores de reserva (`{acquired || 598}`) que hacian que una cuenta VACIA
   * mostrara 598 leads, y flechas de tendencia literales -"↑ 42%", "↑ 23%",
   * "↑ 2 pp", "+42%"- que decian que todo subia aunque hubiera caido.
   *
   * De los cuatro, el unico con una comparacion posible es este: `monthlyCounts`
   * trae la serie por mes, asi que el ultimo contra el anterior es un dato de
   * verdad. Los otros tres son acumulados desde el principio y en el snapshot
   * no hay un acumulado anterior con que compararlos, asi que **se quedan sin
   * flecha**. Un numero sin tendencia es honesto; una tendencia inventada no.
   */
  const meses = leadSummary.monthlyCounts || [];
  const mesActual = meses[meses.length - 1]?.count ?? 0;
  const mesAnterior = meses[meses.length - 2]?.count ?? 0;
  const tendenciaMensual = calcularTendencia(mesActual, mesAnterior, 'vs mes anterior');

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
          className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
        >
          <span className="text-[14px]">←</span> Volver al pipeline
        </button>
        <div className="w-[1px] h-4 bg-line"></div>
        <h2 className="text-[15px] font-normal text-ink">Reporte completo de adquisición</h2>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <KpiCard
          icon={<Icon.Users />}
          label="Leads adquiridos"
          valor={String(acquired)}
          pie="desde el principio"
        />
        <KpiCard
          icon={<Icon.CheckCircle />}
          label="Leads convertidos"
          valor={String(converted)}
          pie="desde el principio"
        />
        <KpiCard
          icon={<Icon.ChartPie />}
          label="Tasa de conversión"
          valor={`${conversionRate}%`}
          pie="convertidos sobre el total"
        />
        <KpiCard
          icon={<Icon.TrendUp />}
          label="Leads del último mes"
          valor={String(mesActual)}
          tendencia={tendenciaMensual}
        />
      </div>

      {/* Main dynamic chart placeholder */}
      <div className="bg-surface border border-line rounded-[8px] p-4 mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[15px] font-bold text-ink">Adquisición mensual</h3>
          <select 
            className="text-[12px] border border-line rounded-[6px] px-2 py-1 text-ink bg-surface cursor-pointer hover:border-primary outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:rounded-sm"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartVisualType)}
          >
            <option value="line">Línea</option>
            <option value="bar">Barras</option>
            <option value="stacked">Barras apiladas</option>
          </select>
        </div>
        <div className="h-[210px] w-full">
          <DynamicAcquisitionChart data={leadSummary.monthlyCounts} byOrigin={leadSummary.monthlyByOrigin} type={chartType} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Desglose por fuente */}
        <div className="bg-surface border border-line rounded-[8px] p-3 flex flex-col h-full">
          <div className="mb-1">
            <h3 className="text-[13px] font-bold text-ink">Desglose por fuente</h3>
          </div>
          <SourceBreakdownChart originCounts={leadSummary.originCounts} />
        </div>

        {/* Conversión por etapa */}
        <div className="bg-surface border border-line rounded-[8px] p-3 flex flex-col h-full">
          <div className="mb-0">
            <h3 className="text-[13px] font-bold text-ink">Conversión por etapa</h3>
          </div>
          <div className="flex-1 flex items-center justify-center w-full min-h-[48px]">
            <StageConversionChart stages={stages} total={acquired} />
          </div>
        </div>
      </div>

      {/*
        AQUI HABIA "EXPORTAR PDF" Y "COMPARTIR REPORTE".

        Eran los dos controles con mas peso visual de la pantalla -uno con
        borde primario, otro relleno a ancho completo, ambos con icono- y
        ninguno tenia manejador.

        Se retiran porque detras no hay nada que cablear. Exportar a PDF pide
        una libreria de generacion y decidir el formato del documento;
        compartir pide decidir a donde y con que permisos. Son dos
        funcionalidades, no dos `onClick` que faltaban.

        El proyecto SI sabe exportar (`utils/exportData.ts` guarda JSON y
        Excel por el puerto `fileSaver`), asi que el dia que se retomen, ese es
        el camino.
      */}
      
    </div>
  );
}
