import React, { useEffect, useState } from 'react';

interface ConversionBarProps {
  total: number;
  contacted: number;
  converted: number;
  periodLabel?: string;
  onPeriodChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function ConversionBar({
  total,
  contacted,
  converted,
  periodLabel = 'Hoy',
  onPeriodChange
}: ConversionBarProps) {
  const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  const [blueWidth, setBlueWidth] = useState(0);
  const [greenWidth, setGreenWidth] = useState(0);
  const [displayContact, setDisplayContact] = useState(0);
  const [displayConversion, setDisplayConversion] = useState(0);

  useEffect(() => {
    setBlueWidth(0);
    setGreenWidth(0);

    const t1 = setTimeout(() => setBlueWidth(100), 400); // Blue starts filling
    const t2 = setTimeout(() => setGreenWidth(100), 700); // Green starts filling after a delay
    const t3 = setTimeout(() => setBlueWidth(contactRate), 1300); // Blue drains to final
    const t4 = setTimeout(() => setGreenWidth(conversionRate), 1600); // Green drains to final

    let startTimestamp: number;
    let rafId: number;
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      // Blue (contact) animation: 400->1200 (0 to 100), 1300->2100 (100 to contactRate)
      if (elapsed > 400 && elapsed <= 1200) {
        setDisplayContact(Math.round(easeOut((elapsed - 400) / 800) * 100));
      } else if (elapsed > 1300 && elapsed <= 2100) {
        setDisplayContact(Math.round(100 - (100 - contactRate) * easeOut((elapsed - 1300) / 800)));
      } else if (elapsed > 2100) {
        setDisplayContact(contactRate);
      }

      // Green (conversion) animation: 700->1500 (0 to 100), 1600->2400 (100 to conversionRate)
      if (elapsed > 700 && elapsed <= 1500) {
        setDisplayConversion(Math.round(easeOut((elapsed - 700) / 800) * 100));
      } else if (elapsed > 1600 && elapsed <= 2400) {
        setDisplayConversion(Math.round(100 - (100 - conversionRate) * easeOut((elapsed - 1600) / 800)));
      } else if (elapsed > 2400) {
        setDisplayConversion(conversionRate);
      }

      if (elapsed <= 2400) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); cancelAnimationFrame(rafId); };
  }, [contactRate, conversionRate]);

  return (
    <div className="bg-surface border border-line rounded-[6px] py-2 px-4 flex flex-col gap-2">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-[15px] font-medium text-ink">Conversión global</h2>
        
        {onPeriodChange && (
          <select 
            className="text-[13px] border border-surface-muted rounded-[8px] px-3 py-1.5 text-ink font-medium bg-surface-muted outline-none hover:bg-surface-hover transition-all cursor-pointer"
            onChange={onPeriodChange}
            value={periodLabel.toLowerCase()}
          >
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="7d">7 días</option>
            <option value="30d">30 días</option>
          </select>
        )}
      </div>

      <div className="flex items-center justify-between mt-1 gap-4">
        <div className="flex flex-col items-center min-w-[70px]">
          <span className="text-[24px] font-medium text-primary leading-none tracking-tight">{displayContact}%</span>
          <span className="text-[12px] font-medium text-ink-secondary mt-1.5">Contactados</span>
        </div>
        
        <div className="flex-1 relative flex items-center py-1">
          <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-primary rounded-full" 
              style={{ width: `${blueWidth}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            ></div>
            <div 
              className="absolute top-0 left-0 h-full bg-[#00C875] rounded-full" 
              style={{ width: `${greenWidth}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            ></div>
          </div>
          {/* Marcador intermedio */}
          <div className="absolute inset-x-0 h-full flex pointer-events-none justify-center items-center">
             <div className="w-[1px] border-l-2 border-dashed border-[#D4D8E3] h-8"></div>
          </div>
        </div>

        <div className="flex flex-col items-center min-w-[70px]">
          <span className="text-[24px] font-medium text-state-success leading-none tracking-tight">{displayConversion}%</span>
          <span className="text-[12px] font-medium text-ink-secondary mt-1.5">Convertidos</span>
        </div>
      </div>
      
      <div className="flex justify-center items-center gap-1.5 text-[12px] text-ink-secondary font-medium mt-1">
        <strong className="text-ink">{contacted}</strong> de {total} leads
        <span className="w-1 h-1 rounded-full bg-line mx-1"></span>
        <strong className="text-state-success">{converted} convertidos</strong>
      </div>
    </div>
  );
}
