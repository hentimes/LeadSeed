import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { PropsTooltip } from '../rechartsProps';
import { chartRamp } from '../../../design/palette';

interface LossReasonsChartProps {
  /** Motivos contados por `get_my_dashboard_snapshot`, de mas a menos frecuente. */
  data: Array<{ name: string; value: number }>;
}

/**
 * Reparto de los leads descartados por motivo.
 *
 * Hasta el `2026-08-14` este grafico mostraba cuatro constantes escritas aqui
 * mismo (Precio alto 42, No responde 28...). No podian ser otra cosa: **el CRM
 * nunca preguntaba por que se descartaba un lead**. Ahora existe el campo y
 * esto cuenta lo que hay.
 *
 * Al principio casi todo caera en "Sin motivo", porque a los descartados
 * anteriores nadie les pregunto. Esa barra es el estado real y se encoge sola.
 */
export default function LossReasonsChart({ data }: LossReasonsChartProps) {
  const COLORS = chartRamp();

  /*
   * EL ESTADO VACIO VA AQUI, NO DENTRO DEL TOOLTIP.
   *
   * Estaba metido dentro de `CustomTooltip`, o sea que para verlo habia que
   * pasar el raton por encima de un trozo del grafico estando el grafico
   * vacio. Como vacio no hay nada por encima de lo que pasar, no se mostraba
   * nunca: se pintaba una tarta sin datos y quedaba un recuadro en blanco sin
   * ninguna explicacion.
   *
   * Se dice ademas COMO se llena, porque un recuadro que solo diga "no hay
   * nada" no ayuda a que deje de estar vacio.
   */
  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-8 text-center">
        <p className="text-[11px] font-medium text-ink-secondary">
          Todavía no hay leads descartados.
        </p>
        <p className="text-[10px] text-ink-muted">
          Al pasar un lead a «Descartado» se pregunta el motivo, y aquí se ve el reparto.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: PropsTooltip) => {
    const entrada = payload?.[0];
    if (active && entrada) {
      return (
        <div className="bg-ink rounded-[6px] p-2 shadow-lg">
          <p className="text-[11px] text-white">
            <span className="font-bold">{entrada.name}:</span> {entrada.value}%
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
              {data.map((_entry, index) => (
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
