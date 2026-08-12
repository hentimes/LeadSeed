import type { Page } from '../../types';
import type { DashboardSnapshot } from '../../services/dashboardService';
import FunnelRow from '../../components/dashboard/FunnelRow';
import MonthlyChart from '../../components/dashboard/MonthlyChart';
import { Icon } from '../../utils/icons';
import { chartColors } from '../../design/palette';

interface PipelineTabProps {
  snapshot: DashboardSnapshot;
  onNavigate?: (page: Page) => void;
  onViewReport: (type: 'acquisition' | 'funnel') => void;
}

export default function PipelineTab({ snapshot, onNavigate, onViewReport }: PipelineTabProps) {
  const { leadSummary } = snapshot;
  
  // Extraemos cuentas ignorando case para evitar NaN
  const getCount = (key: string) => {
    const foundKey = Object.keys(leadSummary.statusCounts || {}).find(k => k.toLowerCase() === key.toLowerCase());
    return foundKey ? (leadSummary.statusCounts[foundKey] || 0) : 0;
  };
  
  const counts = {
    nuevo: getCount('nuevo'),
    contactado: getCount('contactado'),
    interesado: getCount('interesado'),
    convertido: getCount('convertido'),
    descartado: getCount('descartado'),
  };
  const total = leadSummary.total || 1;
  
  const funnelData = [
    { 
      id: 'nuevo', 
      label: 'Nuevo', 
      count: counts.nuevo, 
      color: chartColors.primary, 
      iconBg: 'bg-primary-soft',
      iconColor: 'text-primary',
      percentTotal: Math.round((counts.nuevo / total) * 100),
      prevConv: null
    },
    { 
      id: 'contactado', 
      label: 'Contactado', 
      count: counts.contactado, 
      color: '#2F73F4',
      iconBg: 'bg-[#EAF1FE]',
      iconColor: 'text-[#2F73F4]',
      percentTotal: Math.round((counts.contactado / total) * 100),
      prevConv: counts.nuevo > 0 ? Math.round((counts.contactado / counts.nuevo) * 100) : 0,
      prevLabel: 'Nuevo'
    },
    { 
      id: 'interesado', 
      label: 'Interesado', 
      count: counts.interesado, 
      color: chartColors.warning,
      iconBg: 'bg-[#FFF9F0]',
      iconColor: 'text-state-warning',
      percentTotal: Math.round((counts.interesado / total) * 100),
      prevConv: counts.contactado > 0 ? Math.round((counts.interesado / counts.contactado) * 100) : 0,
      prevLabel: 'Contactado'
    },
    { 
      id: 'convertido', 
      label: 'Convertido', 
      count: counts.convertido, 
      color: chartColors.success,
      iconBg: 'bg-[#E6F9F0]',
      iconColor: 'text-state-success',
      percentTotal: Math.round((counts.convertido / total) * 100),
      prevConv: counts.interesado > 0 ? Math.round((counts.convertido / counts.interesado) * 100) : 0,
      prevLabel: 'Interesado'
    },
    { 
      id: 'descartado', 
      label: 'Descartado', 
      count: counts.descartado, 
      color: chartColors.danger,
      iconBg: 'bg-[#FFEDED]',
      iconColor: 'text-state-danger',
      percentTotal: Math.round((counts.descartado / total) * 100),
      prevConv: counts.interesado > 0 ? Math.round((counts.descartado / counts.interesado) * 100) : 0,
      prevLabel: 'Interesado'
    }
  ];

  const chartData = leadSummary.monthlyCounts.map((m: any) => ({
    name: m.name.substring(0, 3).toUpperCase(),
    value: m.count
  }));

  const calculateMonthlyGrowth = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].value;
    const previous = chartData[chartData.length - 2].value;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  const monthlyGrowth = calculateMonthlyGrowth();
  const isGrowthPositive = monthlyGrowth >= 0;


  return (
    <div className="flex flex-col gap-4 animate-ios-slide-up pb-2">
      {/* Embudo de ventas */}
      <div className="card-standard">
        <div className="card-header">
          <h2 className="card-title">Embudo de ventas</h2>
          
          <select className="text-[12px] border border-line rounded-[6px] px-3 py-1 text-ink bg-white cursor-pointer hover:border-primary transition-colors outline-none">
            <option>Hoy</option>
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
          </select>
        </div>

        <div className="flex">
          {/* Total Leads Column */}
          <div className="w-[140px] shrink-0 border-r border-line pr-4 flex flex-col">
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[11px] font-medium text-ink-secondary mb-1.5">Total leads</span>
              <span className="text-[32px] font-bold text-ink leading-none mb-1.5">{total}</span>
              <span className="text-[10px] text-ink-secondary">- 0% vs ayer</span>
            </div>

            <div className="w-full h-[1px] bg-line" />

            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[11px] font-medium text-ink-secondary mb-1.5">Tasa de conversión</span>
              <span className="text-[32px] font-bold text-primary leading-none mb-1.5">{total ? Math.round((counts.convertido / total) * 100) : 0}%</span>
              <span className="text-[10px] text-ink-secondary">- 0 pp vs ayer</span>
            </div>
          </div>

          {/* Funnel Rows */}
          <div className="flex-1 pl-4 flex flex-col">
            {funnelData.map((step, idx) => (
              <FunnelRow key={step.id} {...step} isLast={idx === funnelData.length - 1} onClick={() => onNavigate?.('leads')} />
            ))}
          </div>
        </div>
        
        {/* Footer actions */}
        <div className="mt-3 border-t border-line flex justify-between items-center pt-3">
          <div className="flex items-center gap-2 text-[12px] font-medium text-ink-secondary">
            <div className="flex items-center justify-center text-ink-muted w-4 h-4"><Icon.Lists /></div>
            {counts.nuevo} leads → {counts.convertido} clientes
          </div>
          <button 
            onClick={() => onViewReport('funnel')}
            className="text-[12px] font-semibold text-primary flex items-center gap-1.5 hover:text-primary transition-colors group"
          >
            Ver detalle del embudo
            <Icon.ArrowRight />
          </button>
        </div>
      </div>

      {/* Adquisición mensual */}
      <div className="card-standard">
        <div className="card-header">
          <h2 className="card-title">Adquisición mensual</h2>
          
          <select className="text-[12px] border border-line rounded-[6px] px-3 py-1 text-ink bg-white cursor-pointer hover:border-primary transition-colors outline-none">
            <option>Últimos 6 meses</option>
            <option>Este año</option>
          </select>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="w-[140px] shrink-0 border-r border-line pr-4 flex flex-col gap-3 pt-2">
            <div className="flex flex-col">
              <span className="text-[24px] font-bold text-primary leading-none mb-1">{chartData.reduce((a: any, b: any) => a + b.value, 0)}</span>
              <span className="text-[11px] font-medium text-ink-secondary mb-1.5">Leads adquiridos</span>
              <span className={`text-[10px] font-bold ${isGrowthPositive ? 'text-state-success' : 'text-state-danger'}`}>
                {isGrowthPositive ? '↑' : '↓'} {Math.abs(monthlyGrowth)}% <span className="font-normal text-ink-muted">vs periodo anterior</span>
              </span>
            </div>
            
            <div className="w-full h-[1px] bg-line" />
            
            <div className="flex flex-col">
              <span className="text-[24px] font-bold text-state-success leading-none mb-1">{counts.convertido}</span>
              <span className="text-[11px] font-medium text-ink-secondary mb-1.5">Leads convertidos</span>
              <span className="text-[10px] text-ink-secondary">
                - 0% vs periodo anterior
              </span>
            </div>
            
            <div className="w-full h-[1px] bg-line" />
            
            <div className="flex flex-col">
              <span className="text-[24px] font-bold text-primary leading-none mb-1">{total ? Math.round((counts.convertido / total) * 100) : 0}%</span>
              <span className="text-[11px] font-medium text-ink-secondary mb-1.5">Tasa de conversión</span>
              <span className="text-[10px] text-ink-secondary">
                - 0 pp vs periodo anterior
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="mt-0">
              <MonthlyChart data={chartData} />
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-line flex justify-between items-center pt-3">
          <div className="flex items-center gap-2 text-[12px] font-medium text-ink-secondary">
            <div className="flex items-center justify-center text-primary"><Icon.Crown /></div>
            {isGrowthPositive 
              ? `Crecimiento: +${monthlyGrowth}% vs mes anterior`
              : `Disminución: ${monthlyGrowth}% vs mes anterior`
            }
          </div>
          <button 
            onClick={() => onViewReport('acquisition')}
            className="text-[12px] font-semibold text-primary flex items-center gap-1.5 hover:text-primary transition-colors group"
          >
            Ver reporte completo
            <Icon.ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
