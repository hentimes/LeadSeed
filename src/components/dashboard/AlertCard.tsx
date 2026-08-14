import { Icon } from '../../utils/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';

interface AlertCardProps {
  title: string;
  count: number;
  description: string;
  onClick?: () => void;
  type?: 'urgent' | 'warning' | 'info';
}

export default function AlertCard({
  title,
  count,
  description,
  onClick,
  type = 'urgent'
}: AlertCardProps) {
  
  const getColors = () => {
    switch (type) {
      case 'urgent':
        return {
          bg: 'bg-[#FFF5F5]',
          border: 'border-[#FFEBEB]',
          text: 'text-state-danger',
          iconBg: 'bg-[#FFD6D6]',
          icon: 'text-state-danger'
        };
      case 'warning':
        return {
          bg: 'bg-[#FFF9F0]',
          border: 'border-transparent',
          text: 'text-state-warning',
          iconBg: 'bg-state-warning',
          icon: 'text-white'
        };
      case 'info':
      default:
        return {
          bg: 'bg-primary-soft',
          border: 'border-transparent',
          text: 'text-primary',
          iconBg: 'bg-primary',
          icon: 'text-white'
        };
    }
  };

  const colors = getColors();

  return (
    <div 
      onClick={onClick}
      className={`border rounded-[6px] py-2 px-4 flex justify-between items-center transition-all duration-300 group ${colors.bg} ${colors.border} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-[44px] h-[44px] rounded-[14px] flex items-center justify-center shrink-0 ${colors.iconBg} ${colors.icon}`}>
          <div className="animate-alert-ring flex items-center justify-center">
            {type === 'urgent' && <FontAwesomeIcon icon={faBell} className="text-[20px]" />}
            {type === 'warning' && <Icon.History />}
            {type === 'info' && <Icon.ChartPie />}
          </div>
        </div>
        <div className="flex flex-col">
          <span className={`text-[15px] font-medium ${colors.text} leading-tight`}>{title}</span>
          <span className="text-[12px] font-medium text-ink-secondary mt-1">{description}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className={`text-[28px] font-medium tracking-tight ${colors.text}`}>{count}</span>
        {onClick && (
          <span className={`w-[40px] h-[32px] rounded-[8px] border border-[#FFEBEB] bg-surface flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 group-hover:scale-105 ${colors.text}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
