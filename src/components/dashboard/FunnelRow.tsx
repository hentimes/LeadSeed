import { Icon } from '../../utils/icons';

interface FunnelRowProps {
  id: string;
  label: string;
  count: number;
  color: string;
  iconBg: string;
  iconColor: string;
  percentTotal: number;
  prevConv: number | null;
  prevLabel?: string;
  isLast?: boolean;
  onClick?: () => void;
}

export default function FunnelRow({
  label,
  count,
  percentTotal,
  prevConv,
  prevLabel,
  isLast,
  onClick
}: FunnelRowProps) {
  
  const getIcon = () => {
    switch (label.toLowerCase()) {
      case 'nuevo': return <Icon.Users />;
      case 'contactado': return <Icon.PhoneOutline />;
      case 'interesado': return <Icon.MessagesOutline />;
      case 'convertido': return <Icon.CheckOutline />;
      case 'descartado': return <Icon.Close />;
      default: return <Icon.Sort />;
    }
  };

  return (
    <div 
      className="group flex flex-col cursor-pointer transition-colors hover:bg-[#F8F7FF] -mx-2 px-2 rounded-[8px]"
      onClick={onClick}
    >
      <div className="flex items-center h-[46px]">
        {/* Icono y Label */}
        <div className="w-[105px] shrink-0 flex items-center gap-2 h-full relative">
          <div className="w-8 h-full flex items-center justify-center relative">
            {!isLast && (
              <div className="absolute top-[50%] left-[50%] -translate-x-1/2 w-[1px] h-[46px] bg-line z-0" />
            )}
            <div className={`w-8 h-8 rounded-full border border-line flex items-center justify-center shrink-0 z-10 bg-white ${percentTotal > 0 ? 'text-ink' : 'text-ink-muted'}`}>
              {getIcon()}
            </div>
          </div>
          <span className="text-[12px] font-bold text-ink w-[70px] truncate">{label}</span>
        </div>

        {/* Barra principal y porcentaje del total */}
        <div className="flex-1 flex flex-col justify-center px-4">
          <div className="flex items-end gap-1.5 mb-1.5">
            <span className="text-[14px] font-bold text-ink leading-none">{count}</span>
            <span className="text-[11px] font-medium text-ink-muted">({percentTotal}%)</span>
          </div>
          <div className="h-[3px] w-full bg-surface-muted rounded-full overflow-hidden flex">
            <div 
              className="h-full rounded-full transition-all duration-500 bg-primary" 
              style={{ width: `${percentTotal}%` }} 
            />
          </div>
        </div>

        {/* Conversión desde etapa anterior */}
        <div className="w-[85px] shrink-0 flex flex-col justify-center items-start pl-2">
          {prevConv !== null ? (
            <>
              <span className="text-[9px] font-medium text-ink-muted text-left leading-tight mb-0.5">
                conv. desde<br/>{prevLabel}
              </span>
              <span className={`text-[12px] font-bold ${prevConv > 0 ? 'text-primary' : 'text-ink'}`}>{prevConv}%</span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-medium text-ink-muted text-left leading-tight mb-0.5">Inicio<br/>&nbsp;</span>
              <span className={`text-[12px] font-bold ${percentTotal > 0 ? 'text-primary' : 'text-ink'}`}>{percentTotal}%</span>
            </>
          )}
        </div>
        
        {/* Chevron para hover */}
        <div className="w-5 shrink-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Icon.ChevronRight />
        </div>
      </div>
    </div>
  );
}
