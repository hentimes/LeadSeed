import { useEffect } from 'react';

/**
 * Cierra con Escape.
 *
 * Los menus y paneles flotantes del chat, el menu de usuario y el cajon de
 * navegacion se cerraban **solo con el raton**: cada uno pinta un
 * `fixed inset-0` invisible detras para capturar el clic. Quien navega con
 * teclado se quedaba atrapado, porque no habia ninguna tecla que los cerrara
 * (WCAG 2.1.2).
 *
 * `design/Modal.tsx` ya resolvia esto por su cuenta, pero solo lo usan los
 * dialogos. Esto es lo mismo para lo que no es un dialogo y no deberia serlo:
 * un menu desplegable no es una ventana modal, no atrapa el foco ni bloquea el
 * scroll, y convertirlo en `Modal` cambiaria como se ve. Lo unico que comparten
 * es la tecla.
 *
 * ## Por que una pila y no un listener por hook
 *
 * Cuando hay un menu abierto dentro de otro, un Escape debe cerrar **solo el de
 * dentro**. Con un listener por instancia eso no se puede: todos cuelgan del
 * mismo `document`, y `stopPropagation` no detiene a los demas listeners del
 * mismo nodo (para eso haria falta `stopImmediatePropagation`, que ademas daria
 * la vuelta al orden: ganaria el que se registro primero, o sea el de fuera).
 *
 * Con una pila el criterio es explicito: hay un unico listener y Escape avisa
 * al ultimo que se monto, que es siempre el mas interno.
 */

/** Callbacks activos, del mas externo al mas interno. */
const pila: Array<() => void> = [];

let escuchando = false;

function alPulsar(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;

  const ultimo = pila[pila.length - 1];
  if (!ultimo) return;

  event.stopPropagation();
  ultimo();
}

function suscribir(callback: () => void): () => void {
  pila.push(callback);

  if (!escuchando) {
    document.addEventListener('keydown', alPulsar, true);
    escuchando = true;
  }

  return () => {
    const posicion = pila.lastIndexOf(callback);
    if (posicion !== -1) pila.splice(posicion, 1);

    // Se retira el listener global cuando no queda nadie escuchando, para no
    // dejarlo colgado durante toda la sesion por un menu que se abrio una vez.
    if (pila.length === 0 && escuchando) {
      document.removeEventListener('keydown', alPulsar, true);
      escuchando = false;
    }
  };
}

/**
 * @param onClose  Que hacer al pulsar Escape.
 * @param enabled  Permite montar el hook incondicionalmente (las reglas de los
 *                 hooks lo exigen) aunque el panel este cerrado.
 */
export function useCloseOnEscape(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    return suscribir(onClose);
  }, [onClose, enabled]);
}

/** Solo para tests: deja la pila como recien cargada. */
export function resetCloseOnEscapeForTesting(): void {
  pila.length = 0;
  if (escuchando) {
    document.removeEventListener('keydown', alPulsar, true);
    escuchando = false;
  }
}
