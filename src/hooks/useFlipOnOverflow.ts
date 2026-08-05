import { useEffect, useRef, useState } from 'react';

/**
 * Los popovers de la lista de mensajes se posicionan con `position: absolute`
 * dentro de un contenedor con scroll (`overflow-y-auto`). Si el mensaje esta
 * cerca del final, abrir siempre hacia abajo (top-full) los saca del area
 * visible y quedan cortados. Esto mide el popover apenas se monta y, si se
 * pasa del borde inferior de la ventana, avisa para que abra hacia arriba en
 * su lugar.
 */
export function useFlipOnOverflow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [openUpward, setOpenUpward] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      setOpenUpward(true);
    }
  }, []);

  return { ref, openUpward };
}
