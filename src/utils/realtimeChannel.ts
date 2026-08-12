/**
 * Nombres de canal de Supabase Realtime.
 *
 * Los canales se identificaban con un nombre estatico y global
 * (`public:leads`, `public:lead_lists`). Dos suscriptores simultaneos al mismo
 * nombre colisionan: es exactamente el fallo que se sufrio y parcheo en el chat
 * (commit `cd70955`, "colision de canal realtime al abrir el chat con DMs sin
 * leer"), y seguia latente en leads, listas y plantillas.
 *
 * El caso que dispara la colision no requiere dos usuarios: basta con que dos
 * componentes de la misma sesion monten el mismo hook a la vez, por ejemplo un
 * modal que use `useLists()` dentro de una pagina que ya lo usa. Por eso el
 * sufijo combina el usuario y un identificador por instancia: solo con el
 * usuario, ese caso seguiria roto.
 *
 * Ver capitulo 13.4 del roadmap.
 */

/**
 * Construye un nombre de canal unico por usuario y por instancia del hook.
 *
 * El nombre logico se conserva como prefijo legible para que los canales sigan
 * siendo reconocibles al depurar en el panel de Supabase.
 */
export function buildRealtimeChannelName(
  logicalName: string,
  userId: string | null | undefined,
  instanceId: string,
): string {
  const scope = userId?.trim() || 'anon';
  // `useId` de React devuelve valores con dos puntos (":r0:"), que ya se usan
  // como separador en los nombres logicos. Se normalizan para que el nombre
  // final tenga una estructura predecible de tres segmentos.
  const instance = instanceId.replace(/:/g, '');

  return `${logicalName}:${scope}:${instance}`;
}

/**
 * Contador de instancias para contextos sin React.
 *
 * Los repositorios exponen funciones `subscribeTo*` que no pueden usar `useId`.
 * Un contador de modulo basta: solo tiene que distinguir dos suscripciones
 * vivas dentro de la misma pestaña, no ser unico entre sesiones ni persistente.
 */
let channelCounter = 0;

/**
 * Nombre de canal unico para suscripciones creadas desde un repositorio.
 *
 * Cada llamada devuelve un nombre distinto: dos componentes que se suscriban a
 * lo mismo obtienen canales separados en vez de pisarse. El caso concreto que
 * esto evita es `subscribeReceiverMessages`, que usaba un nombre fijo aunque
 * filtrara por usuario, asi que dos vistas de soporte abiertas a la vez
 * competian por el mismo canal.
 *
 * El nombre resultante no es estable entre llamadas, y no debe serlo: los
 * llamadores conservan la referencia al canal y la cierran con
 * `supabase.removeChannel(channel)`, nunca por nombre.
 */
export function uniqueChannelName(logicalName: string, scope?: string | null): string {
  channelCounter += 1;
  const suffix = scope?.trim() ? `${scope.trim()}:` : '';

  return `${logicalName}:${suffix}i${channelCounter}`;
}
