/**
 * Identidad de los tres canales de envio.
 *
 * Antes cada pestana pintaba su propio color en botones, bordes y focos
 * (verde, azul, ambar), y la seccion no se parecia al resto del producto.
 * Ahora el color de canal se usa solo para el glifo que lo identifica: las
 * acciones, los focos y los estados son los de la marca, como en el
 * Dashboard.
 */
export type SendChannel = 'whatsapp' | 'email' | 'call';

interface ChannelMeta {
  label: string;
  /** Clase de color del glifo. Sale de los tokens, no es literal. */
  glyphClass: string;
  /** Verbo de la accion primaria, para el boton de envio. */
  actionVerb: string;
}

export const CHANNELS: Record<SendChannel, ChannelMeta> = {
  whatsapp: {
    label: 'WhatsApp',
    glyphClass: 'text-state-success',
    actionVerb: 'Abrir WhatsApp',
  },
  email: {
    label: 'Email',
    glyphClass: 'text-primary',
    actionVerb: 'Enviar',
  },
  call: {
    label: 'Llamadas',
    glyphClass: 'text-state-warning',
    actionVerb: 'Registrar llamada',
  },
};
