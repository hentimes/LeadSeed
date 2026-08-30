import { Badge } from '../../design';

/**
 * La cifra de "hay algo nuevo aca".
 *
 * Antes cada aviso de Admin inventaba el suyo: rojo con `animate-bounce` en la
 * pestana de Soporte, morado con `animate-pulse` en la fila de usuario, ambar
 * sin animar para los leads, y un punto `animate-ping` en la pestana de
 * mensajes. Cuatro tratamientos para la misma idea, y ninguno decia mas que
 * los otros.
 *
 * ## El tono es la naturaleza del aviso, no su urgencia
 *
 * Si el rojo significa a la vez "hay un reclamo" y "tienes dos mensajes", deja
 * de significar nada. Por eso el rojo se reserva para lo unico que de verdad
 * lo es -un reclamo abierto- y el resto baja un escalon.
 *
 * ## Por que no hay animacion
 *
 * En un panel de 320px, algo que rebota o parpadea no se lee como urgencia: se
 * lee como que la interfaz se rompio. El numero ya destaca por color y forma.
 */
export type CountTone = 'primary' | 'info' | 'warning' | 'danger';

/** Tope de severidad, para cuando dos avisos caen en la misma fila. */
const SEVERIDAD: Record<CountTone, number> = { info: 0, primary: 1, warning: 2, danger: 3 };

export function tonoMasSevero(tones: CountTone[]): CountTone {
  return tones.reduce((peor, tone) => (SEVERIDAD[tone] > SEVERIDAD[peor] ? tone : peor), 'info');
}

export function CountBadge({
  count,
  tone = 'primary',
  label,
}: {
  count: number;
  tone?: CountTone;
  /** Nombre accesible: "3 mensajes sin leer". Sin el, el numero solo no dice nada. */
  label: string;
}) {
  if (count <= 0) return null;

  return (
    <span role="status" aria-label={`${count} ${label}`} title={`${count} ${label}`} className="shrink-0">
      <Badge tone={tone} className="min-w-[18px] justify-center rounded-full px-1 tabular-nums">
        {count > 9 ? '9+' : count}
      </Badge>
    </span>
  );
}
