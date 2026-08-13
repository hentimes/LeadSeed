import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { chartColors } from '../../design/palette';

interface MonthlyChartProps {
  data: { name: string; value: number }[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentIndex = data.findIndex(d => d.name === label);
      const currentVal = payload[0].value;
      let trendEl = null;
      
      const prevData = data[currentIndex - 1];
      if (prevData) {
        const prevVal = prevData.value;
        const percent = prevVal === 0 ? (currentVal > 0 ? 100 : 0) : Math.round(((currentVal - prevVal) / prevVal) * 100);
        const isPositive = percent >= 0;
        trendEl = (
          <div className={`text-[10px] font-bold mt-0.5 ${isPositive ? 'text-state-success' : 'text-state-danger'}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(percent)}% <span className="font-medium text-ink-secondary">vs {prevData.name}</span>
          </div>
        );
      } else {
        trendEl = <div className="text-[10px] font-medium text-[#8F9BB3] mt-0.5">Inicio del periodo</div>;
      }

      return (
        <div className="bg-white border border-line rounded-[8px] p-2 shadow-[0_4px_12px_rgba(28,38,75,0.08)] min-w-[100px] outline-none">
          <div className="text-[11px] font-bold text-ink-secondary uppercase tracking-wider">{label}</div>
          <div className="text-[14px] font-bold text-ink mt-0.5">{currentVal} leads</div>
          {trendEl}
        </div>
      );
    }
    return null;
  };

  const renderDot = (props: any) => {
    const { cx, cy, index } = props;
    const isLast = index === data.length - 1;
    
    if (isLast) {
      return (
        <g key={`dot-${index}`} className="animate-fade-in" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
          <circle cx={cx} cy={cy} r="4" fill={chartColors.primary}>
            <animate attributeName="r" values="4; 10" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6; 0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={cy} r="4" fill={chartColors.primary} stroke="#fff" strokeWidth="2" />
        </g>
      );
    }
    return (
      <circle key={`dot-${index}`} cx={cx} cy={cy} r="3.5" fill={chartColors.primary} stroke="#fff" strokeWidth="1.5" />
    );
  };

  return (
    <div className="h-[160px] w-full outline-none focus:outline-none [&_.recharts-wrapper]:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={chartColors.border} strokeDasharray="3 3" opacity={0.5} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: chartColors.inkSecondary, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: chartColors.inkSecondary }}
            tickCount={7}
            domain={[0, (dataMax: number) => Math.max(600, Math.ceil(dataMax / 100) * 100)]}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: chartColors.primaryLight, strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={chartColors.primary} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            dot={renderDot}
            activeDot={{ r: 6, fill: chartColors.primary, stroke: '#E5E0FF', strokeWidth: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
