import React, { useEffect, useState } from 'react';
import { chartColors } from '../../design/palette';
import type { Trend } from './trend';

/**
 * El tamano llega por clase, no por prop numerica.
 *
 * Hasta el 2026-08-20 era `size = 88` aplicado como `style={{ width, height }}`.
 * 88px fijos por dona, mas su texto al lado, daban una fila de ~540px de ancho
 * minimo dentro de un panel que por defecto mide 400: la tercera dona quedaba
 * cortada a la mitad contra el borde. El SVG ya usa `viewBox` con
 * `width="100%"`, asi que escala solo; lo unico que hacia falta era dejar de
 * clavar el tamano en pixeles para que los puntos de corte pudieran tocarlo.
 */
function AnimatedDonut({ percent, color, className = '' }: { percent: number; color: string; className?: string }) {
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
    <div className={`relative shrink-0 transition-[width,height] duration-200 ease-spring ${className}`}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-sm">
        {/* Gray ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={chartColors.border}
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

/** Sin cambios no es ni bueno ni malo: no debe pintarse de verde. */
const COLOR_TENDENCIA: Record<Trend['direction'], string> = {
  up: 'text-state-success',
  down: 'text-state-danger',
  flat: 'text-ink-muted',
};

interface GoalRingCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  trend?: Trend;
  color: string;
  tooltipText: string;
  /** Permite a la fila decidir si esta dona cabe. Ver `OverviewTab`. */
  className?: string;
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
  tooltipText,
  className = ''
}: GoalRingCardProps) {
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    /* `min-w-0` es lo que permite encoger: sin el, un hijo flex se niega a bajar
       de su ancho de contenido y empuja la fila fuera de la tarjeta. */
    <div className={`flex flex-col items-start flex-1 min-w-0 px-1 py-1 group cursor-default ${className}`}>

      {/* Título y Logo alineado a la izquierda */}
      <div className="flex items-center gap-1.5 panel-md:gap-2 mb-2 panel-md:mb-4 ml-1 panel-md:ml-3 min-w-0 w-full">
        <div className={`flex items-center justify-center w-5 h-5 shrink-0 ${iconColor}`}>
          <div className="scale-110">{icon}</div>
        </div>
        <span className="text-[13px] panel-md:text-[14px] font-medium text-ink truncate">{title}</span>
      </div>

      {/* Contenido principal */}
      <div className="flex items-center gap-1.5 panel-md:gap-2 w-full min-w-0">
        {/* Gráfica Animada Custom */}
        <div className="relative group/tooltip shrink-0 cursor-pointer" title={tooltipText}>
          <AnimatedDonut
            percent={percent}
            color={color}
            className="w-14 h-14 panel-md:w-[72px] panel-md:h-[72px] panel-xl:w-[88px] panel-xl:h-[88px]"
          />
        </div>

        {/* Textos y Trend */}
        <div className="flex flex-col items-start justify-center min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] panel-md:text-[24px] font-medium text-ink tracking-tight">{current}</span>
            <span className="text-[12px] font-medium text-ink-secondary">/ {target > 0 ? target : '-'}</span>
          </div>
          <span className="text-[12px] text-ink-secondary font-normal leading-none mb-2">{unit}</span>

          {trend && (
            <span className={`text-[12px] font-medium mt-0.5 flex items-center gap-1 ${COLOR_TENDENCIA[trend.direction]}`}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : ''} {trend.value}
              {/* La etiqueta del periodo es lo primero que sobra cuando falta
                  sitio: repite un dato que ya esta en la cabecera de la tarjeta. */}
              <span className="hidden panel-xl:inline text-ink-muted text-[11px] font-normal">{trend.label}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
