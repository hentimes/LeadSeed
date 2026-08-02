import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Legend, LabelList
} from 'recharts';
import { chartColors } from '../../../design/palette';

export type ChartVisualType = 'area' | 'line' | 'bar' | 'stacked' | 'cumulative';

interface MonthlyCount {
  name: string;
  count: number;
}

interface DynamicAcquisitionChartProps {
  data: MonthlyCount[];
  type: ChartVisualType;
}

// Helper to render the label inside the bar
const renderCustomizedLabel = (props: any, textColor: string) => {
  const { x, y, width, height, value } = props;
  
  if (x == null || y == null || width == null || height == null) return null;
  if (!value || value === '0%' || value === 'NaN%') return null;

  // Siempre mostrar el porcentaje, incluso si el bloque es pequeño,
  // para evitar que el usuario piense que faltan datos.
  return (
    <text 
      x={x + width / 2} 
      y={y + height / 2} 
      fill={textColor} 
      fontSize={10} 
      fontWeight="bold" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="pointer-events-none"
    >
      {value}
    </text>
  );
};

export default function DynamicAcquisitionChart({ data, type }: DynamicAcquisitionChartProps) {
  // Transform data based on type
  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    // Base data with mocked sources for stacked bars
    let result = data.map(item => {
      const web = Math.round(item.count * 0.388);
      const whatsapp = Math.round(item.count * 0.298);
      const linkedin = Math.round(item.count * 0.211);
      const formulario = item.count - web - whatsapp - linkedin;

      return {
        name: item.name.substring(0, 3).toUpperCase(),
        total: item.count,
        web,
        whatsapp,
        linkedin,
        formulario,
        webPercent: item.count > 0 ? Math.round((web / item.count) * 100) + '%' : '',
        whatsappPercent: item.count > 0 ? Math.round((whatsapp / item.count) * 100) + '%' : '',
        linkedinPercent: item.count > 0 ? Math.round((linkedin / item.count) * 100) + '%' : '',
        formularioPercent: item.count > 0 ? Math.round((formulario / item.count) * 100) + '%' : '',
      };
    });

    if (type === 'cumulative') {
      let accum = 0;
      result = result.map(item => {
        accum += item.total;
        return { ...item, total: accum };
      });
    }

    return result;
  }, [data, type]);

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      if (type === 'stacked') {
        return (
          <div className="bg-ink rounded-[6px] p-2 shadow-lg min-w-[110px]">
            <p className="text-[10px] font-bold text-white mb-1.5 border-b border-[#2A3449] pb-1">{label}</p>
            <div className="flex flex-col gap-1">
              {[...payload].reverse().map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-white/80">{entry.name}</span>
                  </div>
                  <span className="font-bold text-white ml-3">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      
      const val = payload[0].value;
      const title = type === 'cumulative' ? 'Acumulado' : 'Leads';
      return (
        <div className="bg-white border border-line rounded-[8px] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <p className="text-[12px] font-bold text-ink">{label}</p>
          <p className="text-[13px] text-primary font-bold mt-1">{val} <span className="font-normal text-ink-secondary text-[11px]">{title}</span></p>
        </div>
      );
    }
    return null;
  };

  const renderDot = (props: any) => {
    const { cx, cy, index, payload } = props;
    const isLast = index === processedData.length - 1;
    
    // Only pulse if there's actually a value
    if (isLast && payload.total > 0) {
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

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <filter id="colorShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={chartColors.primary} floodOpacity="0.2" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F7" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 500 }} />
            <Tooltip content={renderTooltip} cursor={{ stroke: chartColors.border, strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line type="monotone" dataKey="total" stroke={chartColors.primary} strokeWidth={3} dot={renderDot} activeDot={{ r: 6, fill: chartColors.primary, stroke: '#fff', strokeWidth: 2 }} filter="url(#colorShadow)" />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F7" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 500 }} />
            <Tooltip content={renderTooltip} cursor={{ fill: '#F8F9FC' }} />
            <Bar dataKey="total" fill={chartColors.primary} radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={4} />
          </BarChart>
        );

      case 'stacked':
        return (
          <BarChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F7" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 500 }} />
            <Tooltip content={renderTooltip} cursor={{ fill: '#F8F9FC' }} />
            <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#66718F', paddingTop: '15px' }} />
            
            <Bar dataKey="web" name="Web" stackId="a" fill={chartColors.primary} maxBarSize={40} minPointSize={4}>
              <LabelList dataKey="webPercent" content={(p) => renderCustomizedLabel(p, '#ffffff')} />
            </Bar>
            <Bar dataKey="whatsapp" name="WhatsApp" stackId="a" fill={chartColors.primaryLight} maxBarSize={40}>
              <LabelList dataKey="whatsappPercent" content={(p) => renderCustomizedLabel(p, '#ffffff')} />
            </Bar>
            <Bar dataKey="linkedin" name="LinkedIn" stackId="a" fill={chartColors.primaryLight} maxBarSize={40}>
              <LabelList dataKey="linkedinPercent" content={(p) => renderCustomizedLabel(p, '#5B42F3')} />
            </Bar>
            <Bar dataKey="formulario" name="Formulario" stackId="a" fill="#E8E5FF" maxBarSize={40}>
              <LabelList dataKey="formularioPercent" content={(p) => renderCustomizedLabel(p, '#5B42F3')} />
            </Bar>
          </BarChart>
        );

      case 'area':
      case 'cumulative':
      default:
        return (
          <AreaChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F7" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 500 }} />
            <Tooltip content={renderTooltip} cursor={{ stroke: chartColors.border, strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke={chartColors.primary} 
              strokeWidth={3} 
              fill={chartColors.primary}
              fillOpacity={0.15}
              activeDot={{ r: 6, fill: chartColors.primary, stroke: '#fff', strokeWidth: 2 }} 
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
