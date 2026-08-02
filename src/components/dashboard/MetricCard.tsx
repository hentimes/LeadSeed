import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  trend?: {
    value: number | string;
    label: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export default function MetricCard({
  icon,
  iconColor = 'text-ink',
  title,
  value,
  subtitle,
  trend,
  onClick
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex-1 flex items-start justify-center lg:justify-start gap-3 px-2 py-2 transition-all duration-300 ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      <div className={`w-[40px] h-[40px] flex items-center justify-center shrink-0 ${iconColor} ${onClick ? 'group-hover:scale-105 transition-transform' : ''}`}>
        <div className="scale-[1.3]">{icon}</div>
      </div>
      
      <div className="flex flex-col items-start text-left overflow-hidden">
        <span className="text-[24px] font-medium leading-none tracking-tight text-ink">{value}</span>
        <span className="text-[12px] font-medium text-ink-secondary mt-1.5 leading-tight whitespace-nowrap">{title}</span>
        
        {(trend || subtitle) && (
          <div className="mt-1.5 flex items-center gap-1 text-[12px] font-medium whitespace-nowrap">
            {trend && (
              <span className={`flex items-center gap-1 ${trend.isPositive ? 'text-state-success' : 'text-state-danger'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
                <span className="text-ink-muted text-[11px] font-normal">vs ayer</span>
              </span>
            )}
            {subtitle && !trend && <span className="text-ink-secondary">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
