import { useState, useEffect } from 'react';

interface TimeInStageChartProps {
  /** Dias promedio de cada tramo. Nulo mientras no haya ningun caso medible. */
  data: {
    nuevoAContactado: number | null;
    contactadoACierre: number | null;
  };
}

/**
 * Cuanto tarda un lead en avanzar.
 *
 * Hasta el `2026-08-14` mostraba cuatro barras con dias escritos a mano (Nuevo
 * 1.2d, Contactado 2.5d, Interesado 7.4d, Convertido 0.5d).
 *
 * Ahora muestra **dos tramos, y son todos los que el modelo permite**: `leads`
 * guarda `first_contacted_at` y `closed_at`, pero no registra cuando el lead
 * paso a "interesado". Para las otras dos etapas haria falta un historial de
 * cambios de estado, que es un frente propio.
 *
 * Mostrar dos tramos ciertos es mejor que cuatro inventados, aunque el grafico
 * se vea mas vacio.
 */
export default function TimeInStageChart({ data }: TimeInStageChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // El retraso coincide con la entrada escalonada del resto del panel.
    const timer = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const tramos = [
    { name: 'Nuevo → Contactado', days: data.nuevoAContactado },
    { name: 'Contactado → Cierre', days: data.contactadoACierre },
  ];

  const medibles = tramos.filter((t): t is { name: string; days: number } => t.days !== null);

  if (medibles.length === 0) {
    return (
      <p className="flex h-full items-center justify-center px-4 text-center text-[11px] text-ink-muted">
        Aun no hay leads suficientes para medir cuanto tardan en avanzar.
      </p>
    );
  }

  const maxDays = Math.max(...medibles.map((t) => t.days));

  return (
    <div className="w-full h-full flex flex-col justify-center gap-6 pt-4 pb-2 px-2">
      {medibles.map((tramo) => {
        // Minimo del 5% para que un tramo muy corto siga siendo visible en vez
        // de parecer que no tiene dato.
        const widthPercent = maxDays > 0 ? Math.max((tramo.days / maxDays) * 100, 5) : 5;

        return (
          <div key={tramo.name} className="flex items-center gap-3 group relative">
            <div className="w-[112px] text-[11px] font-medium text-ink text-left shrink-0 leading-none">
              {tramo.name}
            </div>

            <div className="flex-1 bg-surface-muted h-[8px] rounded-[10px] relative">
              <div
                className="absolute top-0 left-0 h-full rounded-[10px] bg-primary-light transition-all duration-1000 ease-out"
                style={{ width: mounted ? `${widthPercent}%` : '0%' }}
              />
            </div>

            <div className="w-[34px] text-[10px] font-medium text-ink-secondary text-right shrink-0">
              {tramo.days}d
            </div>
          </div>
        );
      })}
    </div>
  );
}
