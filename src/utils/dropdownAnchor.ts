/** Hacia donde se despliega un panel flotante respecto de su boton. */
export interface Anclaje {
  /** `left` crece hacia la derecha; `right` crece hacia la izquierda. */
  horizontal: 'left' | 'right';
  vertical: 'up' | 'down';
}

export interface CajaBoton {
  right: number;
  bottom: number;
}

export interface Medidas {
  ancho: number;
  alto: number;
  /** Margen minimo con el borde de la ventana. */
  margen: number;
  ventanaAlto: number;
}

/**
 * Decide hacia donde abrir un desplegable para que no se salga de la ventana.
 *
 * Vive aparte y sin tocar el DOM porque esta decision ya se equivoco dos veces:
 * primero no existia (el panel se salia por abajo) y despues se corrigio solo el
 * eje vertical cuando el sintoma real era horizontal. Es logica, no pintura, y
 * conviene poder probarla.
 *
 * El eje horizontal es el que engaña: anclado a la derecha del boton el panel
 * crece hacia la **izquierda**, asi que un boton pegado al borde izquierdo -como
 * el del editor de plantillas- deja el panel fuera de la vista.
 */
export function decidirAnclaje(caja: CajaBoton, medidas: Medidas): Anclaje {
  // Anclado a la derecha, el borde izquierdo del panel caeria aqui.
  const bordeIzquierdoSiDerecha = caja.right - medidas.ancho;

  return {
    horizontal: bordeIzquierdoSiDerecha < medidas.margen ? 'left' : 'right',
    vertical: medidas.ventanaAlto - caja.bottom < medidas.alto ? 'up' : 'down',
  };
}
