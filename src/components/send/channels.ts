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

/**
 * QUE TIENE QUE HACER EL BOTON PRIMARIO AHORA MISMO.
 *
 * El boton de envio se mudo al pie fijo de `SendPage`, fuera de los tres
 * senders. Pero quien sabe si se puede enviar -si hay plantilla, si hay
 * destinatarios, si el envio esta en curso- es el sender, y su estado NO puede
 * subir al padre: los tres canales quedan montados a la vez justo para que
 * cambiar de pestana no borre el trabajo, y unificar tres formas de estado muy
 * distintas en un reducer del padre es reescribir los tres.
 *
 * Asi que no sube el estado: sube este resumen. Cada sender avisa al padre como
 * tiene que verse su boton, y el padre pinta el del canal activo.
 *
 * ## `razonPendiente` en vez de `disabled`
 *
 * No hay un booleano de deshabilitado a proposito. El boton primario de esta
 * seccion **nunca se apaga**: cuando falta algo cambia de rotulo y de variante,
 * y al pulsarlo lleva a lo que falta.
 *
 * El motivo es medible. Un `Button variant="primary" disabled` deja el texto a
 * 1.04:1 sobre el fondo -practicamente invisible- y ademas no explica nada: la
 * plantilla que falta se pide 900px mas arriba. Un boton muerto no se puede
 * interrogar, y el clic es la unica pregunta que el usuario sabe hacer.
 */
export interface SendActionState {
  /** Lo que dice el boton. Es la instruccion, no solo una etiqueta. */
  label: string;
  /**
   * Que falta para poder enviar, si falta algo. `null` significa que el boton
   * envia de verdad, y solo entonces se pinta con el relleno de marca.
   */
  razonPendiente: 'plantilla' | 'destinatarios' | 'enviando' | null;
  /** Enviar, o llevar a lo que falta. Lo decide el sender. */
  onTrigger: () => void;
}
