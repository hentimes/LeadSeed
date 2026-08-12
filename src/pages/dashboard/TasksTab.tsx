import type { Page } from '../../types';
import type { DashboardSnapshot } from '../../services/dashboardService';

interface TasksTabProps {
  snapshot: DashboardSnapshot;
  onNavigate?: (page: Page) => void;
}

interface TaskAlertCardProps {
  title: string;
  count: number;
  description: string;
  onClick?: () => void;
  type: 'urgent' | 'warning';
}

function TaskAlertCard({ title, count, description, onClick, type }: TaskAlertCardProps) {
  const isUrgent = type === 'urgent';
  const colors = isUrgent 
    ? {
        cardBg: 'bg-[#FFF9F9]',
        cardBorder: 'border-[#FCA5A5]',
        iconBg: 'bg-white',
        iconBorder: 'border-[#FCA5A5]',
        iconColor: 'text-[#E02424]',
        numberColor: 'text-[#E02424]',
        arrowColor: 'text-[#FCA5A5]'
      }
    : {
        cardBg: 'bg-white',
        cardBorder: 'border-line',
        iconBg: 'bg-white',
        iconBorder: 'border-line',
        iconColor: 'text-ink',
        numberColor: 'text-ink',
        arrowColor: 'text-ink-muted'
      };

  return (
    <div 
      onClick={onClick}
      className={`border rounded-[6px] p-6 flex flex-col gap-6 cursor-pointer transition-colors ${colors.cardBg} ${colors.cardBorder} hover:opacity-90`}
    >
      {/* Top Row: Icon and Title */}
      <div className="flex items-center gap-6">
        <div className={`w-[52px] h-[52px] rounded-full border flex items-center justify-center shrink-0 ${colors.iconBg} ${colors.iconBorder} ${colors.iconColor}`}>
           {isUrgent ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
               <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
               <line x1="12" y1="9" x2="12" y2="13"></line>
               <line x1="12" y1="17" x2="12.01" y2="17"></line>
             </svg>
           ) : (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
               <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
               <line x1="16" y1="2" x2="16" y2="6"></line>
               <line x1="8" y1="2" x2="8" y2="6"></line>
               <line x1="3" y1="10" x2="21" y2="10"></line>
             </svg>
           )}
        </div>
        <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      </div>

      {/* Bottom Row: Number and Description + Arrow */}
      <div className="flex items-center gap-6">
        <div className="w-[52px] shrink-0 flex justify-center">
          <span className={`text-[42px] font-bold leading-none ${colors.numberColor}`}>
            {count}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-between">
          <p className="text-[14px] text-ink-secondary leading-relaxed max-w-[280px]">
            {description}
          </p>
          <div className="pr-2">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={colors.arrowColor}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksTab({ snapshot, onNavigate }: TasksTabProps) {
  const { taskSummary } = snapshot;

  const completed = taskSummary.completedTotal;
  const rate = taskSummary.total > 0 ? Math.round((completed / taskSummary.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 animate-ios-slide-up pb-4">
      {/* Vencidas / urgentes */}
      <TaskAlertCard
        type="urgent"
        title="Vencidas / urgentes"
        count={taskSummary.overdue}
        description="Tienes tareas que ya superaron su fecha límite. Revisa la pestaña de tareas."
        onClick={() => {
          window.location.hash = '#tasks?filter=overdue';
          onNavigate?.('tasks');
        }}
      />

      {/* Para hoy */}
      <TaskAlertCard
        type="warning"
        title="Para hoy"
        count={taskSummary.today}
        description="Tareas programadas para ser completadas el día de hoy."
        onClick={() => {
          window.location.hash = '#tasks?filter=today';
          onNavigate?.('tasks');
        }}
      />

      {/* Eficiencia histórica */}
      <div className="bg-white border border-line rounded-[6px] p-6 flex gap-6">
        {/* Icon */}
        <div className="w-[52px] h-[52px] rounded-full border border-line flex items-center justify-center shrink-0 bg-white text-ink">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
             <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
             <polyline points="17 6 23 6 23 12"></polyline>
           </svg>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-center">
           {/* Title & Dropdown */}
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-[15px] font-medium text-ink">Eficiencia histórica</h3>
             <select className="text-[12px] border border-line rounded-[6px] px-3 py-1 text-ink bg-white cursor-pointer hover:border-primary transition-colors outline-none">
               <option value="30d">Últimos 30 días</option>
               <option value="7d">Últimos 7 días</option>
               <option value="90d">Últimos 90 días</option>
             </select>
           </div>

           {/* Large Percentage */}
           <div className="text-[32px] font-bold text-primary leading-none mb-4">
             {rate}%
           </div>

           {/* Progress Bar Row */}
           <div className="flex flex-col w-full gap-2">
             <div className="flex items-center gap-3">
               <div className="h-[6px] flex-1 bg-surface-muted rounded-full overflow-hidden">
                 <div className="h-full bg-primary transition-all" style={{ width: `${rate}%` }} />
               </div>
               <span className="text-[14px] font-medium text-ink">{rate}%</span>
             </div>
             <div className="text-[12px] text-ink-secondary">
               <strong className="text-ink">{completed}</strong> de {taskSummary.total} tareas
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
