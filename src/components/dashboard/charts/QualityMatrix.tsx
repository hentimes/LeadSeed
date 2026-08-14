interface QualityMatrixProps {
  /** Una fila por origen, ya ordenada de mas a menos volumen por el RPC. */
  data: Array<{
    origin: string;
    leads: number;
    converted: number;
    /** Nulo si ese origen todavia no ha convertido ninguno. */
    avgCycleDays: number | null;
  }>;
}

/**
 * Calidad de los leads segun como entraron al CRM.
 *
 * Hasta el `2026-08-14` esta tabla tenia sus cinco filas **escritas a mano**
 * (LinkedIn 126 / 15.2% / 12d, WhatsApp 178 / 12% / 5d...). Ni los numeros ni
 * las fuentes eran reales: LinkedIn y WhatsApp son canales de envio, no
 * origenes de lead, y el CRM nunca los ha registrado como procedencia.
 *
 * Ahora sale de `originQuality`, que cuenta sobre `metadata.origin`. El ciclo
 * promedia solo los convertidos: incluir los abiertos daria un numero que baja
 * cuando entran leads nuevos, al reves de lo que la metrica quiere decir.
 */

const ETIQUETAS: Record<string, string> = {
  manual: 'Manual',
  imported: 'Importado',
  web_form: 'Formulario web',
};

export default function QualityMatrix({ data }: QualityMatrixProps) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-[11px] text-ink-muted">
        Todavia no hay leads que analizar.
      </p>
    );
  }

  return (
    <div className="w-full pt-1">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10px] text-ink-secondary border-b border-line">
            <th className="font-medium pb-2 w-[40%]">Fuente</th>
            <th className="font-medium pb-2 text-right">Volumen</th>
            <th className="font-medium pb-2 text-right">Win Rate</th>
            <th className="font-medium pb-2 text-right">Ciclo (días)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((fila) => {
            const winRate = fila.leads > 0 ? Math.round((fila.converted / fila.leads) * 1000) / 10 : 0;
            return (
              <tr
                key={fila.origin}
                className="border-b border-line last:border-0 hover:bg-surface-muted transition-colors"
              >
                <td className="py-2.5">
                  <span className="text-[12px] font-semibold text-ink">
                    {ETIQUETAS[fila.origin] ?? fila.origin}
                  </span>
                </td>
                <td className="py-2.5 text-right text-[12px] text-ink-secondary">{fila.leads}</td>
                <td className="py-2.5 text-right">
                  <span className="text-[12px] font-bold text-state-success bg-state-success-soft px-1.5 py-0.5 rounded-[4px]">
                    {winRate}%
                  </span>
                </td>
                <td className="py-2.5 text-right text-[12px] text-ink font-medium">
                  {/* Un guion, no un cero: sin convertidos no hay ciclo que medir,
                      y un 0d se leeria como "cierra el mismo dia". */}
                  {fila.avgCycleDays === null ? '—' : `${fila.avgCycleDays}d`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
