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
export interface DialogsPort {
  /** Pregunta al usuario y resuelve `true` si acepta. */
  confirm(message: string): Promise<boolean>;
  /** Informa algo al usuario, sin pedir respuesta. */
  alert(message: string): Promise<void>;
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
  | { name: 'agenda'; appointmentId?: string };

export interface NavigationPort {
  /** Ruta actual, o `null` si la actual no corresponde a ninguna conocida. */
  current(): AppRoute | null;
  /** Navega a una ruta, reemplazando la actual en el historial. */
  replace(route: AppRoute): void;
  /** Se suscribe a los cambios de ruta. Devuelve la funcion para cancelar. */
  subscribe(onChange: () => void): () => void;
}

/** Conjunto completo de puertos que la capa de dominio puede pedir. */
export interface Platform {
  dialogs: DialogsPort;
  navigation: NavigationPort;
}
