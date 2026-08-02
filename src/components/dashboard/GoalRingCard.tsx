import React, { useEffect, useState } from 'react';

function AnimatedDonut({ percent, color, size = 88 }: { percent: number; color: string; size?: number }) {
  const strokeWidth = 5;
  const radius = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  
  const [grayOffset, setGrayOffset] = useState(circumference);
  const [colorOffset, setColorOffset] = useState(circumference);
  const [animatingGray, setAnimatingGray] = useState(false);
  const [animatingColor, setAnimatingColor] = useState(false);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    // Animations for the rings
    const t1 = setTimeout(() => {
      setAnimatingGray(true);
      setGrayOffset(0);
    }, 100);
    
    const t2 = setTimeout(() => {
      setAnimatingColor(true);
      setColorOffset(0);
    }, 700);
    
    const t3 = setTimeout(() => {
      const finalPercent = Math.max(percent, 0.01);
      const finalOffset = circumference - (finalPercent / 100) * circumference;
      setColorOffset(finalOffset);
    }, 1300);

    // Number animation matching the ring timings
    let startTimestamp: number;
    let rafId: number;
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;

      // cubic-bezier(0.4, 0, 0.2, 1) approximation
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      if (elapsed > 700 && elapsed <= 1300) {
        const progress = (elapsed - 700) / 600;
        setDisplayPercent(Math.round(easeOut(progress) * 100));
      } else if (elapsed > 1300 && elapsed <= 1900) {
        const progress = (elapsed - 1300) / 600;
        setDisplayPercent(Math.round(100 - (100 - percent) * easeOut(progress)));
      } else if (elapsed > 1900) {
        setDisplayPercent(percent);
        return;
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); cancelAnimationFrame(rafId); };
  }, [percent, circumference]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-sm">
        {/* Gray ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#E2E6F0"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={grayOffset}
          strokeLinecap="round"
          style={{ transition: animatingGray ? 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}
        />
        {/* Color ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={colorOffset}
          strokeLinecap="round"
          style={{ transition: animatingColor ? 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[14px] font-bold text-ink">
          {displayPercent}%
        </span>
      </div>
    </div>
  );
}

interface GoalRingCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  trend?: {
    value: number | string;
    isPositive: boolean;
  };
  color: string;
  tooltipText: string;
}

export default function GoalRingCard({
  icon,
  iconColor = 'text-ink-secondary',
  title,
  current,
  target,
  unit,
  trend,
  color,
  tooltipText
}: GoalRingCardProps) {
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="flex flex-col items-start flex-1 px-1 py-1 group cursor-default">
      
      {/* Título y Logo alineado a la izquierda */}
      <div className="flex items-center gap-2 mb-4 ml-3">
        <div className={`flex items-center justify-center w-5 h-5 ${iconColor}`}>
          <div className="scale-110">{icon}</div>
        </div>
        <span className="text-[14px] font-medium text-ink">{title}</span>
      </div>

      {/* Contenido principal */}
      <div className="flex items-center gap-2 w-full">
        {/* Gráfica Animada Custom */}
        <div className="relative group/tooltip shrink-0 cursor-pointer" title={tooltipText}>
          <AnimatedDonut percent={percent} color={color} size={88} />
        </div>

        {/* Textos y Trend */}
        <div className="flex flex-col items-start justify-center">
          <div className="flex items-baseline gap-1">
            <span className="text-[24px] font-medium text-ink tracking-tight">{current}</span>
            <span className="text-[12px] font-medium text-ink-secondary">/ {target > 0 ? target : '-'}</span>
          </div>
          <span className="text-[12px] text-ink-secondary font-normal leading-none mb-2">{unit}</span>
          
          {trend && (
            <span className={`text-[12px] font-medium mt-0.5 flex items-center gap-1 ${trend.isPositive ? 'text-[#16B364]' : 'text-[#F04461]'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
              <span className="text-ink-muted text-[11px] font-normal">vs ayer</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
