import React, { useState, useEffect } from 'react';
import type { DashboardSnapshot } from '../../../services/dashboardService';

interface AdvancedFunnelChartProps {
  snapshot: DashboardSnapshot;
}

export default function AdvancedFunnelChart({ snapshot }: AdvancedFunnelChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const { leadSummary } = snapshot;
  
  const getCount = (key: string) => {
    const foundKey = Object.keys(leadSummary.statusCounts || {}).find(k => k.toLowerCase() === key.toLowerCase());
    return foundKey ? (leadSummary.statusCounts[foundKey] || 0) : 0;
  };
  
  const nuevo = getCount('nuevo');
  const contactado = getCount('contactado');
  const interesado = getCount('interesado');
  const convertido = getCount('convertido');

  const funnel = [
    { id: 'nuevo', label: 'Nuevo', count: nuevo, color: 'bg-primary-light' },
    { id: 'contactado', label: 'Contactado', count: contactado, color: 'bg-primary-light' },
    { id: 'interesado', label: 'Interesado', count: interesado, color: 'bg-[#BCAFFF]' },
    { id: 'convertido', label: 'Convertido', count: convertido, color: 'bg-surface-muted' },
  ];

  const maxCount = Math.max(...funnel.map(s => s.count));

  return (
    <div className="w-full flex flex-col gap-1.5">
      {funnel.map((step, idx) => {
        const widthPercent = Math.max((step.count / maxCount) * 100, 5); // min 5%
        
        let dropoff = null;
        const nextStep = funnel[idx + 1];
        if (nextStep) {
          const drop = step.count > 0 ? Math.round(((step.count - nextStep.count) / step.count) * 100) : 0;
          if (drop > 0) {
            dropoff = drop;
          }
        }

        return (
          <React.Fragment key={step.id}>
            {/* Funnel Step */}
            <div className="flex items-center gap-3">
              <div className="w-[65px] text-[11px] font-medium text-ink text-right leading-none">
                {step.label}
              </div>
              <div className="flex-1">
                <div 
                  className={`h-[24px] rounded-r-[4px] rounded-l-[1px] flex items-center px-2.5 text-[11px] font-medium transition-all duration-1000 ease-out overflow-hidden whitespace-nowrap ${
                    step.count > 0 ? `${step.color} text-white` : 'bg-surface-muted text-ink-muted'
                  }`}
                  style={{ width: mounted ? `${widthPercent}%` : '0%' }}
                >
                  {step.count}
                </div>
              </div>
            </div>

            {/* Drop-off Indicator */}
            {dropoff !== null && (
              <div className="flex items-center gap-3 -my-0.5">
                <div className="w-[65px]" />
                <div className="flex flex-col items-start border-l border-dashed border-line ml-3 py-1.5 pl-3 relative">
                  <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] bg-line rounded-full" />
                  <span className="text-[9px] font-bold text-state-danger bg-[#FFEDED] px-1.5 py-0.5 rounded-[4px] leading-none">
                    {dropoff}% fuga
                  </span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
