/**
 * Puertos de plataforma.
 *
 * Este archivo define QUE necesita la capa de dominio del entorno donde corre,
 * sin decir COMO se resuelve. Las implementaciones concretas viven en
 * `chrome.ts` hoy, y en un futuro `native.ts` para la app Expo.
 *
 * Motivo, segun la auditoria del 2026-08-11: el bloqueador real para reusar el
 * nucleo en movil no es Chrome, cuyas APIs estan razonablemente contenidas en 18
 * archivos, sino **el DOM dentro de hooks de dominio**. Nueve `confirm()` y
 * `alert()` en `useLeadsPageController`, uno en `useAgenda`, y navegacion por
 * `window.location.hash`. Nada de eso existe en React Native.
 *
 * Regla que hace cumplir ESLint: `services`, `repositories`, `hooks`, `utils` y
 * `config` no pueden usar `confirm`, `alert` ni `prompt`. Este modulo es la
 * salida legitima a esa restriccion.
 *
 * Ver capitulo 13.6 del roadmap.
 */

/**
 * Dialogos de confirmacion y aviso.
 *
 * `confirm` devuelve una promesa aunque la implementacion Chrome sea sincrona:
 * en movil y en cualquier dialogo propio la respuesta llega despues, y un
 * contrato sincrono haria imposible implementarlo alli. Los llamadores ya usan
 * `await`, asi que el cambio no altera su forma.
 */

/**
 * Ajustes opcionales de una confirmacion.
 *
 * Son opcionales y no obligatorios porque el mensaje solo ya alcanza para la
 * mayoria; esto es para las veces en que no. `tone: 'danger'` pinta el boton de
 * aceptar en rojo, y se reserva para lo que no tiene vuelta atras.
 *
 * El puerto los declara -en vez de que los invente la implementacion web-
 * porque son decisiones de dominio: que una accion sea destructiva no depende de
 * si corre en un navegador o en un telefono.
 */
export interface ConfirmOptions {
  /** Encabezado corto. Sin el, el dialogo muestra solo el mensaje. */
  title?: string;
  /** Rotulo del boton que acepta. Por defecto, "Aceptar". */
  confirmLabel?: string;
  /** Rotulo del boton que cancela. Por defecto, "Cancelar". */
  cancelLabel?: string;
  /** `danger` para lo irreversible: borrar, cancelar una cita. */
  tone?: 'neutral' | 'danger';
}

export interface AlertOptions {
  title?: string;
  confirmLabel?: string;
}

export interface DialogsPort {
  /** Pregunta al usuario y resuelve `true` si acepta. */
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  /** Informa algo al usuario, sin pedir respuesta. */
  alert(message: string, options?: AlertOptions): Promise<void>;
}

/**
 * Navegacion entre vistas de la aplicacion.
 *
 * Se modela como rutas con parametros y no como cadenas de hash, porque el hash
 * es un detalle del entorno web. En Expo esto lo implementa React Navigation
 * sobre las mismas rutas logicas.
 */
export type AppRoute =
  | {
      name: 'leads';
      /** Abre la ficha de un lead concreto al entrar. */
      leadId?: string;
      /** Preselecciona la bandeja de olvidados. */
      filter?: 'olvidados';
      /** Abre el formulario de lead nuevo al entrar. */
      action?: 'new';
    }
  | { name: 'agenda'; appointmentId?: string }
  /**
   * La tarea concreta que hay que abrir al entrar.
   *
   * `filter` ya viajaba por el hash sin estar declarado aca: el panel escribe
   * `#tasks?filter=overdue` a mano. Queda modelado para que la ruta describa
   * lo que de verdad se usa.
   */
  | { name: 'tasks'; taskId?: string; filter?: string };

export interface NavigationPort {
  /** Ruta actual, o `null` si la actual no corresponde a ninguna conocida. */
  current(): AppRoute | null;
  /** Navega a una ruta, reemplazando la actual en el historial. */
  replace(route: AppRoute): void;
  /** Se suscribe a los cambios de ruta. Devuelve la funcion para cancelar. */
  subscribe(onChange: () => void): () => void;
}

/**
 * Almacenamiento clave-valor persistente.
 *
 * Dos ambitos, porque la extension ya los distinguia y la distincion tiene
 * sentido en cualquier plataforma:
 *
 * - `sync`: preferencias del usuario que deberian seguirlo entre dispositivos.
 *   En Chrome es `chrome.storage.sync`; en movil seria almacenamiento remoto o
 *   simplemente local si no hay sincronizacion.
 * - `local`: estado operativo de este dispositivo, que no tiene sentido
 *   propagar. En Chrome es `chrome.storage.local`; en movil, AsyncStorage.
 *
 * Todas las operaciones son asincronas aunque alguna implementacion pudiera
 * resolverlas al momento: en Chrome y en React Native lo son.
 *
 * Las implementaciones **no deben lanzar** si el almacenamiento no esta
 * disponible. La capa de dominio trata la ausencia de un valor como "sin
 * preferencia guardada", no como un error que haya que manejar en cada
 * llamada.
 */
export interface KeyValueStorePort {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
}

export interface StoragePort {
  sync: KeyValueStorePort;
  local: KeyValueStorePort;
}

/**
 * Apertura de enlaces fuera de la aplicacion.
 *
 * En la extension es `window.open`; en movil, `Linking.openURL`. El puerto
 * expone solo la intencion, no el mecanismo, y deliberadamente **no** conoce
 * WhatsApp ni ningun destino concreto: que URL construir es una decision de
 * dominio y vive en `utils/waHelper.ts`, no aqui.
 */
export interface DeeplinkPort {
  openExternal(url: string): void;
}

/**
 * Copiar al portapapeles.
 *
 * En el navegador es `navigator.clipboard`, que ademas exige contexto seguro y
 * puede rechazar si el gesto del usuario ya se perdio. En React Native es
 * `expo-clipboard`, con otra firma y sin ese requisito. No es la misma API con
 * otro nombre, asi que cruza por un puerto.
 *
 * Devuelve si se pudo: el llamador tiene que poder decir "copiado" solo cuando
 * de verdad se copio. Un `void` obligaria a asumir el exito.
 */
export interface ClipboardPort {
  writeText(text: string): Promise<boolean>;
}

/** Mensaje entre la interfaz y el proceso de fondo. */
export interface AppMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Canal de mensajes con el proceso de fondo.
 *
 * En la extension es `chrome.runtime`; en movil serian notificaciones push o un
 * emisor de eventos en proceso.
 *
 * `send` no rechaza si no hay nadie escuchando. En MV3 el service worker puede
 * estar dormido, y eso es un estado normal, no un error: cada llamador estaba
 * repitiendo un `.catch()` vacio para tolerarlo. El puerto lo absorbe.
 */
export interface MessageBusPort {
  /** Indica si hay un proceso de fondo con el que hablar. */
  isAvailable(): boolean;
  send(message: AppMessage): Promise<void>;
  /** Escucha mensajes entrantes. Devuelve la funcion para cancelar. */
  subscribe(listener: (message: AppMessage) => void): () => void;
}

/**
 * Flujo de OAuth con un proveedor externo.
 *
 * Existen dos formas de resolverlo y la diferencia no es cosmetica:
 *
 * - la app puede quedarse viva y recibir la URL de callback (extension de
 *   Chrome con `chrome.identity`, o `expo-auth-session` en movil)
 * - la app navega fuera y el proveedor devuelve al usuario despues (web plano)
 *
 * `launch` devuelve la URL de callback en el primer caso y `null` en el
 * segundo, donde no hay retorno inmediato porque la pagina ya se fue.
 */
export interface OAuthLauncherPort {
  /** URL de retorno que se declara al proveedor. */
  redirectUrl(): string;
  /** true si el flujo puede completarse sin abandonar la aplicacion. */
  canCompleteInApp(): boolean;
  /** Ejecuta el flujo. Devuelve la URL de callback, o null si navego fuera. */
  launch(oauthUrl: string): Promise<string | null>;
}

/**
 * Entrega un archivo generado al usuario.
 *
 * En la extension es el truco clasico de un `<a download>` sintetico; en movil
 * seria `expo-file-system` mas `expo-sharing`, que guarda y abre la hoja de
 * compartir. La diferencia es grande, y por eso el puerto habla de "entregar un
 * archivo" y no de descargarlo: "descargar" ya es una palabra del navegador.
 *
 * Recibe el contenido y no una URL de objeto: crear y revocar la URL es un
 * detalle del entorno web que no tiene equivalente en movil.
 */
export interface FileSaverPort {
  save(file: { content: Blob | string; filename: string; mimeType: string }): Promise<void>;
}

/**
 * Impide que el fondo se desplace mientras hay una superficie modal abierta.
 *
 * Se modela como puerto y no se deja como DOM suelto porque la **intencion** si
 * es comun a las plataformas: mientras el usuario esta en un formulario o una
 * ficha, lo de detras no debe moverse. Lo que cambia es el mecanismo: en web
 * hay que tocar el `overflow` del body a mano; en React Native el componente
 * `Modal` ya lo resuelve, asi que la implementacion nativa sera vacia.
 *
 * Deuda de fondo, distinta de esta: bloquear el scroll es responsabilidad del
 * componente que abre el modal, no del hook que gestiona los datos. Que esto
 * viva en `useLeadsPageController` y `useLeadDetail` es un sintoma de que esos
 * hooks hacen demasiado. Se corrige al dividirlos, en el bloque 6.
 */
export interface ScrollLockPort {
  lock(): void;
  unlock(): void;
}

/**
 * Abre o descarga un archivo que el servidor solo entrega si recibe
 * credenciales en el cuerpo de la peticion.
 *
 * El puerto expresa la intencion y no el mecanismo, porque los mecanismos no se
 * parecen en nada:
 *
 * - en la extension hay que abrir una ventana y enviarle un `<form>` oculto por
 *   POST, porque una navegacion no puede llevar cabecera `Authorization` y el
 *   token viaja en el cuerpo
 * - en movil seria descargar con `fetch`, guardar con `expo-file-system` y
 *   abrir con el visor del sistema
 *
 * Devuelve un resultado en vez de lanzar porque el fallo mas comun no es un
 * error de programa sino una condicion del entorno que el usuario puede
 * resolver: el navegador bloqueo la ventana emergente. La capa de dominio
 * necesita ese caso para mostrar el mensaje adecuado.
 */
export interface ProtectedFilePort {
  open(request: {
    url: string;
    /** Campos del cuerpo, incluidas las credenciales. */
    fields: Record<string, string>;
    mode: 'view' | 'download';
    /** Identificador estable para reutilizar la misma superficie por archivo. */
    key: string;
  }): Promise<{ ok: true } | { ok: false; reason: string }>;
}

/** Conjunto completo de puertos que la capa de dominio puede pedir. */
export interface Platform {
  dialogs: DialogsPort;
  navigation: NavigationPort;
  storage: StoragePort;
  deeplink: DeeplinkPort;
  clipboard: ClipboardPort;
  messageBus: MessageBusPort;
  oauth: OAuthLauncherPort;
  fileSaver: FileSaverPort;
  scrollLock: ScrollLockPort;
  protectedFile: ProtectedFilePort;
}
