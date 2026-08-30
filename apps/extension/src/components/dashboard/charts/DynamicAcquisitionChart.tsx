import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Legend, LabelList
} from 'recharts';
import { chartColors } from '../../../design/palette';
import type { PropsEtiqueta, PropsTooltip } from '../rechartsProps';
import type { PropsPunto } from '../rechartsProps';

export type ChartVisualType = 'area' | 'line' | 'bar' | 'stacked' | 'cumulative';

interface MonthlyCount {
  name: string;
  count: number;
}

interface DynamicAcquisitionChartProps {
  data: MonthlyCount[];
  /**
   * Mismos meses que `data`, pero desglosados por origen del lead. Solo lo usa
   * el modo apilado; el resto de modos grafican el total.
   */
  byOrigin: Array<{ name: string; counts: Record<string, number> }>;
  type: ChartVisualType;
}

/**
 * Etiquetas de los origenes que el CRM registra hoy. Si aparece uno nuevo se
 * muestra su clave tal cual en vez de esconderlo: es preferible ver una etiqueta
 * fea a perder leads del grafico.
 */
const ETIQUETAS_ORIGEN: Record<string, string> = {
  manual: 'Manual',
  imported: 'Importado',
  web_form: 'Formulario web',
};

/**
 * Colores de las franjas apiladas, en orden de uso.
 *
 * Se leen por getter porque `chartColors` resuelve contra tokens.css en tiempo
 * de ejecucion y cambia al alternar claro/oscuro.
 */
function coloresApilado(): string[] {
  return [chartColors.primary, chartColors.primaryLight, chartColors.soft, chartColors.primaryDeep];
}

/**
 * Los origenes presentes en la ventana, del que mas leads aporta al que menos.
 *
 * El orden importa: la franja mas grande queda abajo, que es donde el ojo la
 * lee como base. Ordenar por nombre dejaria barras que saltan de mes a mes.
 */
function ordenarOrigenes(byOrigin: Array<{ counts: Record<string, number> }>): string[] {
  const totales = new Map<string, number>();
  for (const mes of byOrigin) {
    for (const [origen, cantidad] of Object.entries(mes.counts)) {
      totales.set(origen, (totales.get(origen) ?? 0) + cantidad);
    }
  }
  return [...totales.entries()].sort((a, b) => b[1] - a[1]).map(([origen]) => origen);
}

// Helper to render the label inside the bar
const renderCustomizedLabel = (props: PropsEtiqueta, textColor: string) => {
  const { x, y, width, height, value } = props;
  
  // Recharts declara la geometria como `string | number` porque admite unidades
  // SVG en texto. Aqui hay que calcular con ella, asi que se comprueba que sean
  // numeros en vez de darlo por hecho.
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number'
  ) {
    return null;
  }
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

export default function DynamicAcquisitionChart({ data, byOrigin, type }: DynamicAcquisitionChartProps) {
  /**
   * Origenes presentes, ya ordenados. Hasta el `2026-08-14` el apilado no
   * miraba ningun origen: repartia el total con porcentajes fijos escritos en
   * el codigo (38.8% web, 29.8% whatsapp, 21.1% linkedin, el resto formulario),
   * asi que las cuatro franjas eran siempre el mismo dibujo con otra escala.
   */
  const origenes = useMemo(() => ordenarOrigenes(byOrigin), [byOrigin]);

  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    // `byOrigin` trae los mismos meses en el mismo orden, pero se indexa por
    // nombre para no depender de esa coincidencia.
    const porMes = new Map(byOrigin.map((mes) => [mes.name, mes.counts]));

    let result = data.map((item) => {
      const nombre = item.name.substring(0, 3).toUpperCase();
      const counts = porMes.get(item.name) ?? porMes.get(nombre) ?? {};

      const fila: Record<string, string | number> = { name: nombre, total: item.count };
      for (const origen of origenes) {
        const cantidad = counts[origen] ?? 0;
        fila[origen] = cantidad;
        fila[`${origen}Percent`] =
          item.count > 0 && cantidad > 0 ? `${Math.round((cantidad / item.count) * 100)}%` : '';
      }
      return fila;
    });

    if (type === 'cumulative') {
      let accum = 0;
      result = result.map((item) => {
        accum += Number(item.total);
        return { ...item, total: accum };
      });
    }

    return result;
  }, [data, byOrigin, origenes, type]);

  const renderTooltip = (props: PropsTooltip) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      if (type === 'stacked') {
        return (
          <div className="bg-ink rounded-[6px] p-2 shadow-lg min-w-[110px]">
            <p className="text-[10px] font-bold text-white mb-1.5 border-b border-[#2A3449] pb-1">{label}</p>
            <div className="flex flex-col gap-1">
              {[...payload].reverse().map((entry, index) => (
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
      
      const val = payload[0]?.value;
      const title = type === 'cumulative' ? 'Acumulado' : 'Leads';
      return (
        <div className="bg-surface border border-line rounded-[8px] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <p className="text-[12px] font-bold text-ink">{label}</p>
          <p className="text-[13px] text-primary font-bold mt-1">{val} <span className="font-normal text-ink-secondary text-[11px]">{title}</span></p>
        </div>
      );
    }
    return null;
  };

  const renderDot = (props: PropsPunto<{ total: number }>) => {
    const { cx, cy, index, payload } = props;
    const isLast = index === processedData.length - 1;
    
    // Only pulse if there's actually a value
    if (isLast && payload && payload.total > 0) {
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 500 }} />
            <Tooltip content={renderTooltip} cursor={{ stroke: chartColors.border, strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line type="monotone" dataKey="total" stroke={chartColors.primary} strokeWidth={3} dot={renderDot} activeDot={{ r: 6, fill: chartColors.primary, stroke: '#fff', strokeWidth: 2 }} filter="url(#colorShadow)" />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 500 }} />
            <Tooltip content={renderTooltip} cursor={{ fill: chartColors.surface }} />
            <Bar dataKey="total" fill={chartColors.primary} radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={4} />
          </BarChart>
        );

      case 'stacked':
        return (
          <BarChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartColors.inkMuted, fontSize: 10, fontWeight: 500 }} />
            <Tooltip content={renderTooltip} cursor={{ fill: chartColors.surface }} />
            <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: chartColors.inkSecondary, paddingTop: '15px' }} />
            
            {origenes.map((origen, i) => {
              const paleta = coloresApilado();
              const fondo = paleta[i % paleta.length] ?? chartColors.primary;
              // Las dos primeras franjas son oscuras y las siguientes claras,
              // asi que el texto del porcentaje invierte para seguir leyendose.
              const textoEncima = i < 2 ? '#ffffff' : chartColors.primaryDeep;
              return (
                <Bar
                  key={origen}
                  dataKey={origen}
                  name={ETIQUETAS_ORIGEN[origen] ?? origen}
                  stackId="a"
                  fill={fondo}
                  maxBarSize={40}
                  {...(i === 0 ? { minPointSize: 4 } : {})}
                >
                  <LabelList
                    dataKey={`${origen}Percent`}
                    content={(p) => renderCustomizedLabel(p, textoEncima)}
                  />
                </Bar>
              );
            })}
          </BarChart>
        );

      case 'area':
      case 'cumulative':
      default:
        return (
          <AreaChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
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
