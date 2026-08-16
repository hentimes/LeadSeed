import type { FlowStepStatus } from '../../types';

/**
 * Ancho fijo del riel. **No crece con el numero de pasos**: en una columna de
 * ~318px utiles, una ficha por paso muere en el septimo. Con ancho fijo, cada
 * segmento mide `(72 - 2*(N-1)) / N`, que a 12 pasos son 4.2px, el piso donde
 * un segmento todavia se lee como segmento.
 */
const ANCHO = 72;

/** Por encima de esto el riel deja de informar y se cambia por el contador. */
export const MAX_PASOS_RIEL = 12;

/**
 * La forma distingue el estado, el color solo lo refuerza.
 *
 * Cuatro alturas: hueco = falta, lleno = hecho, alto = reclama accion, bajo =
 * se salto. Asi se lee sin depender del color, que es lo que exige WCAG 1.4.1.
 *
 * Ojo con el verde: se reserva al correo, que es el unico canal con
 * confirmacion real. Un paso de WhatsApp registrado va en azul informativo,
 * porque solo consta que se abrio el chat.
 */
function claseDe(status: FlowStepStatus, esCorreo: boolean): string {
  switch (status) {
    case 'registrado':
      return esCorreo ? 'h-1.5 bg-state-success' : 'h-1.5 bg-state-info';
    case 'toca':
      return 'h-2 bg-state-warning';
    case 'fallido':
      return 'h-2 bg-state-danger';
    case 'omitido':
      return 'h-[3px] bg-line-strong';
    default:
      return 'h-1.5 border border-line-strong bg-surface-sunken';
  }
}

const PALABRA: Record<FlowStepStatus, string> = {
  pendiente: 'pendiente',
  toca: 'toca ahora',
  registrado: 'registrado',
  omitido: 'omitido',
  fallido: 'fallido',
};

interface Props {
  estados: FlowStepStatus[];
  esCorreo: boolean;
}

export function FlowProgressRail({ estados, esCorreo }: Props) {
  if (estados.length === 0) {
    return <span className="text-micro text-ink-muted">Sin pasos</span>;
  }

  const resumen = estados.map((e, i) => `paso ${i + 1} ${PALABRA[e]}`).join(', ');

  return (
    <span
      role="img"
      aria-label={resumen}
      className="flex shrink-0 items-center gap-[2px]"
      style={{ width: ANCHO }}
    >
      {estados.map((estado, i) => (
        <span
          key={i}
          title={`Paso ${i + 1}: ${PALABRA[estado]}`}
          className={`flex-1 rounded-full ${claseDe(estado, esCorreo)}`}
        />
      ))}
    </span>
  );
}
