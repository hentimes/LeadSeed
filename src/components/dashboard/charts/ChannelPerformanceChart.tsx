import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors } from '../../../design/palette';

interface ChannelData {
  name: string;
  value: number; // For the pie slices (e.g. number of conversions)
  conversionRate: number; // The percentage shown in the legend
  color: string;
}

interface ChannelPerformanceChartProps {
  totalConversions: number;
}

export default function ChannelPerformanceChart({ totalConversions }: ChannelPerformanceChartProps) {
  // Datos simulados basados en las tasas de conversión del diseño
  const data: ChannelData[] = [
    { name: 'WhatsApp', value: Math.round(totalConversions * 0.40), conversionRate: 8.3, color: chartColors.primaryLight },
    { name: 'LinkedIn', value: Math.round(totalConversions * 0.30), conversionRate: 6.1, color: chartColors.primaryLight },
    { name: 'Web',      value: Math.round(totalConversions * 0.20), conversionRate: 5.2, color: chartColors.primary },
    { name: 'Formulario', value: Math.round(totalConversions * 0.10), conversionRate: 3.8, color: chartColors.soft },
  ];

  return (
    <div className="w-full flex items-center h-[60px]">
      
      {/* Donut Chart */}
      <div className="w-[60px] h-[60px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={18}
              outerRadius={28}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`${value} conversiones`, 'Total']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E6EAF0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              itemStyle={{ color: chartColors.ink, fontWeight: 600, fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1 pl-4 flex flex-col gap-1">
        {data.map((item) => (
          <div key={item.name} className="flex justify-between items-center text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-ink-secondary">{item.name}</span>
            </div>
            <span className="font-bold text-ink">{item.conversionRate}%</span>
          </div>
        ))}
      </div>

    </div>
  );
}
