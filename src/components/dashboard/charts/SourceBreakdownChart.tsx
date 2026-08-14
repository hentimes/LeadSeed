interface SourceBreakdownChartProps {
  /**
   * Cuantos leads entraron por cada origen, tal como los cuenta
   * `get_my_dashboard_snapshot`. Las claves son los valores reales de
   * `metadata.origin`.
   */
  originCounts: Record<string, number>;
}

/**
 * Desglose de leads por como entraron al CRM.
 *
 * Hasta el `2026-08-14` este componente **no mostraba datos**: repartia el total
 * de leads por porcentajes fijos escritos en el codigo (38.8 / 29.8 / 21.1 /
 * 10.3) y los etiquetaba Web, WhatsApp, LinkedIn y Formulario.
 *
 * Ademas de falso era incoherente con el modelo: WhatsApp y LinkedIn son
 * canales de **envio**, no origenes de lead, y el CRM nunca los ha registrado
 * como procedencia. Los valores que si existen son los de `metadata.origin`.
 *
 * Un origen desconocido no se descarta ni se reetiqueta: se muestra con su
 * clave cruda. Si aparece uno nuevo conviene verlo, no esconderlo.
 */

const ETIQUETAS: Record<string, string> = {
  manual: 'Manual',
  imported: 'Importado',
  web_form: 'Formulario web',
};

/** Colores del sistema, en el orden en que se van asignando. */
const COLORES = ['bg-primary', 'bg-primary-light', 'bg-state-info', 'bg-state-warning'];

export default function SourceBreakdownChart({ originCounts }: SourceBreakdownChartProps) {
  const total = Object.values(originCounts).reduce((suma, n) => suma + n, 0);

  const fuentes = Object.entries(originCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([clave, count], i) => ({
      id: clave,
      name: ETIQUETAS[clave] ?? clave,
      count,
      // Sin leads no hay porcentaje que calcular; 0 evita una division por cero
      // que se veria como "NaN%" en pantalla.
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: COLORES[i % COLORES.length] as string,
    }));

  if (fuentes.length === 0) {
    return (
      <p className="py-6 text-center text-[11px] text-ink-muted">
        Todavia no hay leads que desglosar.
      </p>
    );
  }

  return (
    <div className="w-full flex flex-col pt-1">
      <div className="flex text-[10px] font-medium text-ink-secondary mb-2 px-1">
        <div className="flex-1">Fuente</div>
        <div className="w-[40px] text-right">Leads</div>
        <div className="w-[60px] text-right">%</div>
      </div>

      <div className="flex flex-col gap-1">
        {fuentes.map((fuente) => (
          <div
            key={fuente.id}
            className="flex items-center text-[11px] font-medium text-ink px-1 hover:bg-surface-hover rounded py-0.5"
          >
            <div className="w-[110px] shrink-0 truncate" title={fuente.name}>
              {fuente.name}
            </div>

            <div className="flex-1 px-2 flex items-center">
              <div className="w-full h-[4px] bg-surface-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${fuente.color} rounded-full transition-all duration-500`}
                  style={{ width: `${fuente.percentage}%` }}
                />
              </div>
            </div>

            <div className="w-[40px] text-right font-bold">{fuente.count}</div>
            <div className="w-[60px] text-right text-ink">{fuente.percentage}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
