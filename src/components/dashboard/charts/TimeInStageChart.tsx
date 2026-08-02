import React, { useState, useEffect } from 'react';

export default function TimeInStageChart() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Delay matches the staggered entrance to be the last one
    const timer = setTimeout(() => setMounted(true), 1200); 
    return () => clearTimeout(timer);
  }, []);

  const data = [
    { name: 'Nuevo', days: 1.2, color: 'bg-primary-light' },
    { name: 'Contactado', days: 2.5, color: 'bg-primary-light' },
    { name: 'Interesado', days: 7.4, color: 'bg-primary-light' },
    { name: 'Convertido', days: 0.5, color: 'bg-[#CFC7FF]' },
  ];

  const maxDays = Math.max(...data.map(d => d.days));

  return (
    <div className="w-full h-full flex flex-col justify-center gap-6 pt-4 pb-2 px-2">
      {data.map((stage) => {
        const widthPercent = Math.max((stage.days / maxDays) * 100, 5);
        
        return (
          <div key={stage.name} className="flex items-center gap-3 group relative cursor-pointer">
            <div className="w-[70px] text-[11px] font-medium text-ink text-left shrink-0 leading-none">
              {stage.name}
            </div>
            
            <div className="flex-1 bg-[#F2F4F7] h-[8px] rounded-[10px] relative">
              <div 
                className={`absolute top-0 left-0 h-full rounded-[10px] transition-all duration-1000 ease-out ${stage.color}`}
                style={{ width: mounted ? `${widthPercent}%` : '0%' }}
              />
            </div>
            
            <div className="w-[30px] text-[10px] font-medium text-ink-secondary text-right shrink-0">
              {stage.days}d
            </div>
          </div>
        );
      })}
    </div>
  );
}
