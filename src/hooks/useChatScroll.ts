import { useEffect, useRef, useState } from 'react';

/**
 * Margen en pixeles para considerar que el usuario esta "abajo del todo".
 *
 * No es cero a proposito: el scroll suave y el redondeo de alturas dejan
 * diferencias de unos pocos pixeles, y con un umbral exacto la vista parpadearia
 * entre "abajo" y "no abajo" al terminar cada animacion.
 */
export const AT_BOTTOM_THRESHOLD_PX = 50;

/**
 * Auto-scroll de la sala y contador de mensajes sin leer.
 *
 * Extraido de `ChatRoom.tsx` como parte del bloque 6. La regla que implementa
 * es la de cualquier chat, y conviene tenerla escrita en un solo sitio:
 *
 * - si el usuario esta mirando el final, cada mensaje nuevo baja la vista
 * - si esta leyendo mas arriba, no se le mueve la vista y se le cuenta cuantos
 *   mensajes lleva sin ver
 * - al volver abajo, por scroll o por el boton, el contador se pone a cero
 *
 * Lo que no entra aqui: marcar la sala como leida en el servidor. Eso es una
 * llamada de dominio y se queda en el componente, que es quien tiene la sala y
 * el usuario.
 */
export interface ChatScroll {
  containerRef: React.RefObject<HTMLDivElement>;
  endRef: React.RefObject<HTMLDivElement>;
  isAtBottom: boolean;
  unreadCount: number;
  /** Recalcula la posicion. Se engancha al `onScroll` del contenedor. */
  handleScroll(): void;
  /** Baja del todo y limpia el contador. Lo usa el aviso de no leidos. */
  scrollToBottom(): void;
}

export function useChatScroll(messageCount: number): ChatScroll {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleScroll = () => {
    const contenedor = containerRef.current;
    if (!contenedor) return;

    const { scrollTop, scrollHeight, clientHeight } = contenedor;
    const abajo = scrollHeight - scrollTop - clientHeight < AT_BOTTOM_THRESHOLD_PX;

    setIsAtBottom(abajo);
    if (abajo) setUnreadCount(0);
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setUnreadCount(0);
  };

  useEffect(() => {
    if (isAtBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnreadCount((previo) => previo + 1);
    }
    // Solo depende del numero de mensajes: reaccionar tambien a `isAtBottom`
    // haria que volver abajo contara un mensaje mas que nunca llego.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageCount]);

  return { containerRef, endRef, isAtBottom, unreadCount, handleScroll, scrollToBottom };
}
