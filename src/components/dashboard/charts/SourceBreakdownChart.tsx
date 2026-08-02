import React from 'react';
import { Icon } from '../../../utils/icons';

interface SourceData {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

interface SourceBreakdownChartProps {
  totalLeads: number;
}

export default function SourceBreakdownChart({ totalLeads }: SourceBreakdownChartProps) {
  // Datos simulados basados en porcentajes proporcionales al total real
  const sources: SourceData[] = [
    {
      id: 'web',
      name: 'Web',
      count: Math.round(totalLeads * 0.388),
      percentage: 38.8,
      color: 'bg-primary',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      )
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      count: Math.round(totalLeads * 0.298),
      percentage: 29.8,
      color: 'bg-primary-light',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      )
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      count: Math.round(totalLeads * 0.211),
      percentage: 21.1,
      color: 'bg-[#CFC7FF]',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
          <rect x="2" y="9" width="4" height="12"></rect>
          <circle cx="4" cy="4" r="2"></circle>
        </svg>
      )
    },
    {
      id: 'formulario',
      name: 'Formulario',
      count: Math.round(totalLeads * 0.103),
      percentage: 10.3,
      color: 'bg-[#E8E5FF]',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      )
    }
  ];

  return (
    <div className="w-full flex flex-col pt-1">
      <div className="flex text-[10px] font-medium text-ink-secondary mb-2 px-1">
        <div className="flex-1">Fuente</div>
        <div className="w-[40px] text-right">Leads</div>
        <div className="w-[60px] text-right">%</div>
      </div>
      
      <div className="flex flex-col gap-1">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center text-[11px] font-medium text-ink px-1 hover:bg-surface-muted rounded-[4px] transition-colors py-1 cursor-pointer">
            {/* Icon + Name */}
            <div className="w-[80px] flex items-center gap-1.5 shrink-0">
              <div className="text-primary flex items-center justify-center">
                {source.icon}
              </div>
              <span>{source.name}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="flex-1 px-2 flex items-center">
              <div className="w-full h-[4px] bg-[#F2F4F7] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${source.color} rounded-full transition-all duration-500`}
                  style={{ width: `${source.percentage}%` }}
                />
              </div>
            </div>
            
            {/* Stats */}
            <div className="w-[40px] text-right font-bold">{source.count}</div>
            <div className="w-[60px] text-right text-ink">{source.percentage}%</div>
          </div>
        ))}
      </div>
      
      <div className="flex text-[11px] font-bold text-ink mt-2 pt-2 border-t border-line px-1">
        <div className="flex-1 text-ink-secondary font-normal">Total</div>
        <div className="w-[40px] text-right">{totalLeads}</div>
        <div className="w-[60px] text-right">100%</div>
      </div>
    </div>
  );
}
