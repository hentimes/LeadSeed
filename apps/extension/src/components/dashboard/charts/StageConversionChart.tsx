import React from 'react';

interface StageData {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

interface StageConversionChartProps {
  stages: {
    nuevo: number;
    contactado: number;
    interesado: number;
    convertido: number;
  };
  total: number;
}

export default function StageConversionChart({ stages, total }: StageConversionChartProps) {
  const safeTotal = total > 0 ? total : 1;
  
  const data: StageData[] = [
    {
      id: 'nuevo',
      name: 'Nuevo',
      count: stages.nuevo,
      percentage: Math.round((stages.nuevo / safeTotal) * 100),
    },
    {
      id: 'contactado',
      name: 'Contactado',
      count: stages.contactado,
      percentage: Math.round((stages.contactado / safeTotal) * 100),
    },
    {
      id: 'interesado',
      name: 'Interesado',
      count: stages.interesado,
      percentage: Math.round((stages.interesado / safeTotal) * 100),
    },
    {
      id: 'convertido',
      name: 'Convertido',
      count: stages.convertido,
      percentage: Number(((stages.convertido / safeTotal) * 100).toFixed(1)),
    }
  ];

  return (
    <div className="w-full flex flex-col justify-center h-full pt-1">
      <div className="flex w-full items-center justify-between px-1">
        {data.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-medium text-ink-secondary mb-1">{stage.name}</span>
              <span className="text-[20px] font-bold text-ink leading-none mb-1">{stage.count}</span>
              <span className="text-[11px] font-medium text-ink-muted">{stage.percentage}%</span>
            </div>
            {idx < data.length - 1 && (
              <div className="text-[#C2C9D6] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
