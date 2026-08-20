import React from 'react';
import type { Trend } from './trend';

/** Sin cambios no es ni bueno ni malo: no debe pintarse de verde. */
const COLOR_TENDENCIA: Record<Trend['direction'], string> = {
  up: 'text-state-success',
  down: 'text-state-danger',
  flat: 'text-ink-muted',
};

interface MetricCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  trend?: Trend;
  onClick?: () => void;
  /** Permite a la fila decidir si esta metrica cabe. Ver `OverviewTab`. */
  className?: string;
}

export default function MetricCard({
  icon,
  iconColor = 'text-ink',
  title,
  value,
  subtitle,
  trend,
  onClick,
  className = ''
}: MetricCardProps) {
  return (
    /*
     * `lg:justify-start` estuvo aca desde el rediseno inicial sin llegar a
     * aplicarse nunca: `lg` son 640px y este panel rara vez pasa de 500. Ahora
     * usa la escala de panel, que si se alcanza.
     */
    <div
      onClick={onClick}
      className={`flex-1 min-w-0 flex items-start justify-center panel-md:justify-start gap-2 panel-md:gap-3 px-1 panel-md:px-2 py-2 transition-all duration-300 ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      <div className={`w-8 h-8 panel-sm:w-[40px] panel-sm:h-[40px] flex items-center justify-center shrink-0 ${iconColor} ${onClick ? 'group-hover:scale-105 transition-transform' : ''}`}>
        <div className="scale-110 panel-sm:scale-[1.3]">{icon}</div>
      </div>

      {/*
       * Los dos `whitespace-nowrap` que habia aqui eran la causa directa del
       * corte. Con la etiqueta del periodo en una sola linea, "sin cambios vs
       * sem. pasada" mide ~145px irreducibles; por tres tarjetas la fila pedia
       * ~640px dentro de un panel de 360. Ahora el texto puede fluir y la
       * etiqueta desaparece antes de deformar nada.
       */}
      <div className="flex flex-col items-start text-left min-w-0 overflow-hidden">
        <span className="text-[20px] panel-md:text-[24px] font-medium leading-none tracking-tight text-ink">{value}</span>
        <span className="text-[12px] font-medium text-ink-secondary mt-1.5 leading-tight">{title}</span>

        {(trend || subtitle) && (
          <div className="mt-1.5 flex items-center gap-1 text-[12px] font-medium whitespace-nowrap">
            {/*
              La etiqueta del periodo ("vs sem. pasada") se pintaba aqui. Venia
              de ajustes, asi que el dato era correcto, pero repetirla en cada
              metrica costaba ~145px irreducibles por tarjeta y era la causa
              directa de que la fila se saliera del panel. Pasa a declararse una
              vez en la cabecera de la tarjeta, junto al titulo.
            */}
            {trend && (
              <span className={`flex items-center gap-1 ${COLOR_TENDENCIA[trend.direction]}`}>
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : ''} {trend.value}
              </span>
            )}
            {subtitle && !trend && <span className="text-ink-secondary">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
