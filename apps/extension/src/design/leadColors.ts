import { STATE } from '../config/colors';
import type { LeadStatus, LeadSourceChannel } from '../types/leads';

/**
 * QUE COLOR SE LE PONE A CADA ESTADO Y A CADA CANAL
 *
 * Vivian dentro de `types/leads.ts`, que es donde se define el dominio. Un tipo
 * de dominio no decide colores: el estado `interesado` existe igual sin que
 * nadie haya elegido pintarlo de ambar, y la prueba es que la futura app movil
 * va a querer los mismos estados con otra paleta.
 *
 * Aca no hay nada portable, y por eso el archivo esta en `design/`: al partir el
 * proyecto en paquetes, `types/leads.ts` viaja al nucleo compartido y esto se
 * queda con la interfaz de la extension.
 *
 * ## Por que son cadenas y no clases de Tailwind
 *
 * Se usan como valor en `style`, no como clase: `LeadCell` compone el fondo
 * concatenando la transparencia (`${color}15`), y `PipelineProportionBar` calcula
 * anchos. Una clase de Tailwind armada en tiempo de ejecucion no genera CSS
 * -lo detecta `npm run check:classes`-, asi que aqui el color tiene que ser dato.
 */

export const STATUS_COLORS: Record<LeadStatus, string> = {
  // 'nuevo' y 'convertido' no tienen token equivalente: son un gris neutro y un
  // verde mas frio que --ls-success. Se dejan literales en vez de forzar una
  // correspondencia que no existe.
  nuevo: '#6b7280',
  contactado: STATE.info,
  interesado: STATE.warning,
  convertido: '#10b981',
  descartado: STATE.danger,
};

export const SOURCE_CHANNEL_COLORS: Record<LeadSourceChannel, string> = {
  pb: STATE.info,
  general: '#6b7280',
  retiro: '#a855f7',
};
