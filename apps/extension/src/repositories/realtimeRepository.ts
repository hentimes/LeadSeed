import { supabase } from '../lib/supabaseClient';

/**
 * Suscripcion generica a cambios de una tabla.
 *
 * Existe para que `useRealtimeRefresh` deje de ser el unico hook que importa el
 * cliente de Supabase directamente. De ese hook cuelgan `useLeads`, `useLists`
 * y `useTemplates`, asi que era la fuga de frontera con mayor alcance del
 * repositorio. Ver roadmap 13.4.
 *
 * El nombre del canal llega ya construido y no se arma aca a proposito: la
 * unicidad depende de `useId()` de React, que es especifico de la capa de
 * componentes. El repositorio no debe conocer React.
 */
export interface TableChangeSubscription {
  /** Nombre completo y unico del canal. Ver `utils/realtimeChannel.ts`. */
  channelName: string;
  table: string;
  /** Filtro de PostgREST, por ejemplo `user_id=eq.<uuid>`. */
  filter?: string;
}

/**
 * Abre una suscripcion por cada entrada y devuelve la funcion que las cierra
 * todas.
 *
 * Se devuelve un unico limpiador en vez de la lista de canales para que el
 * llamador no pueda olvidarse de cerrar uno: es el mismo patron que ya usan
 * `supportService` y `realtimeService`, y evita la clase de fuga que se
 * encontro en los chats de soporte.
 */
export function subscribeToTableChanges(
  subscriptions: TableChangeSubscription[],
  onChange: () => void,
): () => void {
  const channels = subscriptions.map((subscription) =>
    supabase
      .channel(subscription.channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: subscription.table,
          ...(subscription.filter ? { filter: subscription.filter } : {}),
        },
        onChange,
      )
      .subscribe(),
  );

  return () => {
    // `removeChannel` y no `unsubscribe`: el segundo corta la suscripcion pero
    // deja el canal registrado en el cliente.
    channels.forEach((channel) => {
      void supabase.removeChannel(channel);
    });
  };
}
