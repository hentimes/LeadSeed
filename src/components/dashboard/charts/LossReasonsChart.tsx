import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function LossReasonsChart() {
  const data = [
    { name: 'Precio alto', value: 42 },
    { name: 'No responde', value: 28 },
    { name: 'Competencia', value: 18 },
    { name: 'Fuera de zona', value: 12 },
  ];

  const COLORS = ['#7B5CFF', '#8F85FF', '#BCAFFF', '#EBE5FF'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ink rounded-[6px] p-2 shadow-lg">
          <p className="text-[11px] text-white">
            <span className="font-bold">{payload[0].name}:</span> {payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col justify-center gap-1 pb-2">
      <div className="w-full flex-1 min-h-[100px] max-h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={40}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
              animationBegin={600}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full flex flex-col gap-2 mt-2 px-6">
        {data.map((entry, idx) => (
          <div key={entry.name} className="flex items-center gap-2 text-[11px] font-medium text-ink">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            <span className="text-ink-secondary leading-none">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
