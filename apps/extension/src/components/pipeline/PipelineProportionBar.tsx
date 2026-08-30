import { PIPELINE_STAGES, STATUS_LABELS, type LeadStatus } from '../../types';

/**
 * Color de relleno de cada etapa en la barra.
 *
 * NO son los mismos `STATUS_COLORS` de la franja del cuadrante, y la diferencia
 * importa: alli el color es identidad al lado de su palabra, asi que se tolera
 * poco contraste. Aca **el largo es el dato**, y si no se ve donde termina un
 * segmento no se lee la proporcion.
 *
 * Medidos contra el fondo de pagina, los originales no llegaban al 3:1 que pide
 * WCAG 1.4.11 para un grafico: el ambar daba 2.04 y el verde 2.41. Los dos se
 * sustituyen por su version de tinta, que es el mismo tono con la luminosidad
 * corregida y sigue al tema. Los otros dos ya pasaban y no se tocan.
 *
 *   contactado 3.49 · interesado 4.62 · convertido 3.57 · descartado 3.57
 */
const RELLENO: Record<(typeof PIPELINE_STAGES)[number], string> = {
  contactado: 'bg-state-info',
  interesado: 'bg-state-warning-ink',
  convertido: 'bg-state-success-ink',
  descartado: 'bg-state-danger',
};

/** Ancho minimo de un segmento que no esta vacio, en porcentaje del total. */
const MINIMO_VISIBLE = 1.5;

/**
 * PROPORCION POR ETAPA
 *
 * Una barra apilada de ancho completo.
 *
 * ## Por que apilada y no cuatro barras
 *
 * El caso real de esta cuenta es 561 / 0 / 0 / 0. Con cuatro barras separadas
 * eso dibuja una llena y **tres pistas vacias**, y una pista vacia
 * (`surface-sunken` sobre `surface`) da 1.11:1: seria invisible, asi que el
 * grafico contaria que solo existe una etapa. La apilada no tiene pista, asi
 * que no puede mentir de esa forma: con un solo valor se ve un bloque entero,
 * que es exactamente la lectura correcta -todo esta atascado en una etapa-.
 *
 * ## Por que no lleva leyenda
 *
 * Una leyenda repetiria los cuatro rotulos que los cuadrantes ya tienen unos
 * pixeles mas abajo, y cuesta dos filas. En vez de eso, el orden de los
 * segmentos es el mismo orden de lectura de la matriz, y la franja de cada
 * cuadrante repite su color exacto. El nombre accesible deletrea las cuatro
 * cifras en palabras, que es lo que necesita quien no ve la barra.
 *
 * La barra da la FORMA; los numeros que mandan son los de cada cuadrante.
 */
export function PipelineProportionBar({ cuentas }: { cuentas: Record<LeadStatus, number> }) {
  const total = PIPELINE_STAGES.reduce((suma, etapa) => suma + cuentas[etapa], 0);
  if (total === 0) return null;

  const descripcion = PIPELINE_STAGES.map(
    (etapa) => `${STATUS_LABELS[etapa]} ${cuentas[etapa]}`,
  ).join(', ');

  return (
    <div role="img" aria-label={`Proporción por etapa: ${descripcion}.`} className="flex gap-0.5">
      {PIPELINE_STAGES.map((etapa) => {
        const cuenta = cuentas[etapa];
        if (cuenta === 0) return null;

        /*
         * Un segmento por debajo del minimo se agranda a proposito. Un lead
         * entre 561 mide medio pixel, o sea nada; es preferible una proporcion
         * levemente distorsionada a un dato que no se ve.
         */
        const porcentaje = Math.max((cuenta / total) * 100, MINIMO_VISIBLE);

        return (
          <span
            key={etapa}
            className={`h-2.5 rounded-full ${RELLENO[etapa]}`}
            style={{ width: `${porcentaje}%` }}
          />
        );
      })}
    </div>
  );
}
