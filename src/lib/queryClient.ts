import { QueryClient } from '@tanstack/react-query';

/**
 * Cache de estado servidor, unica para toda la aplicacion.
 *
 * Hasta aqui cada hook exponia un contador `refreshKey` y cada pantalla hacia
 * su propio `useEffect(() => { getAll().then(setState) })`. Eso no es cache:
 * cada cambio relanzaba consultas completas, sin deduplicar las peticiones
 * simultaneas ni reutilizar nada entre pantallas.
 *
 * En escritorio con buena red se notaba poco. El objetivo declarado es una app
 * en React Native, y ahi la red es intermitente: repetir la consulta entera en
 * cada guardado es la diferencia entre usable e inusable. Por eso esta capa
 * deja de ser opcional.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Un catalogo del propio usuario no cambia solo. Lo que si lo cambia son
      // sus propias escrituras, y esas invalidan la clave explicitamente.
      staleTime: 30_000,

      // El panel lateral se monta y desmonta al abrir y cerrar. Refrescar en
      // cada foco convertiria ese gesto en una peticion.
      refetchOnWindowFocus: false,

      // Un fallo de red en movil es normal y transitorio; uno de permisos no se
      // arregla repitiendo. Se reintenta poco y solo una vez.
      retry: 1,
    },
  },
});

/** Claves de cache. Centralizadas para que no se escriban a mano y diverjan. */
export const claves = {
  motivos: (userId: string) => ['motivos', userId] as const,
} as const;
