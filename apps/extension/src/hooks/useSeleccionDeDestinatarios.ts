import { useCallback, useState } from 'react';

export interface SeleccionDeDestinatarios {
  leadIds: Set<string>;
  listaIds: Set<number>;
  alternarLead: (id: string) => void;
  /** Marca o desmarca varios de una vez. No alterna: fija el estado pedido. */
  alternarLeads: (ids: string[], seleccionar: boolean) => void;
  alternarLista: (id: number) => void;
  limpiar: () => void;
}

/**
 * A QUIENES SE LES VA A MANDAR.
 *
 * Dos conjuntos y no uno: se puede elegir leads sueltos y listas enteras, y el
 * destinatario final es la union de los dos. Guardar la union ya resuelta
 * perderia cual lista se eligio, y quitar un lead de una lista dejaria de ser
 * posible sin desmarcar la lista completa.
 *
 * ## Por que `alternarLeads` no es un bucle de `alternarLead`
 *
 * Lo pide la casilla de "esta pagina" del selector. Llamar ocho veces a
 * `alternarLead` habria hecho lo mismo, pero con semantica de alternar: los que
 * ya estaban marcados se habrian desmarcado, que es lo contrario de lo que
 * promete una casilla de "marcar todos". Ademas es una sola actualizacion de
 * estado en vez de ocho.
 *
 * ## Por que salio de `WhatsAppSender`
 *
 * Porque no es del canal. Elegir destinatarios se hace igual para WhatsApp,
 * correo y llamadas, y ahi vivia mezclado con la plantilla, la cola y el cupo.
 * `WhatsAppSender` no estaba en el plan de extraccion -nadie habia leido el
 * archivo- y esta es la pieza cuya responsabilidad se distingue sola.
 */
export function useSeleccionDeDestinatarios(): SeleccionDeDestinatarios {
  const [leadIds, setLeadIds] = useState<Set<string>>(new Set());
  const [listaIds, setListaIds] = useState<Set<number>>(new Set());

  const alternarLead = useCallback((id: string) => {
    setLeadIds((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }, []);

  const alternarLeads = useCallback((ids: string[], seleccionar: boolean) => {
    setLeadIds((previo) => {
      const siguiente = new Set(previo);
      for (const id of ids) {
        if (seleccionar) siguiente.add(id);
        else siguiente.delete(id);
      }
      return siguiente;
    });
  }, []);

  const alternarLista = useCallback((id: number) => {
    setListaIds((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }, []);

  const limpiar = useCallback(() => {
    setLeadIds(new Set());
    setListaIds(new Set());
  }, []);

  return { leadIds, listaIds, alternarLead, alternarLeads, alternarLista, limpiar };
}
