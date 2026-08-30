import type { AlertOptions, ConfirmOptions } from './types';

/**
 * EL PUENTE ENTRE EL PUERTO DE DIALOGOS Y EL DIALOGO DE REACT
 *
 * `webDialogs.confirm()` se llama desde cualquier sitio -un hook, un servicio,
 * un manejador de evento- y tiene que devolver una promesa. El dialogo que
 * responde esa promesa, en cambio, es un componente montado una sola vez en la
 * raiz. Este modulo es lo que los une: una funcion que se registra al montar y
 * se da de baja al desmontar.
 *
 * No es un contexto de React a proposito. Un contexto obligaria a que TODO
 * llamador fuera un componente o un hook, y la mitad no lo son: hay
 * confirmaciones dentro de servicios y de manejadores sueltos. El puerto existe
 * justamente para que no tengan que serlo.
 *
 * ## Si no hay nadie montado, se cae al dialogo del navegador
 *
 * Y esto no es una concesion perezosa: es la unica salida honesta.
 *
 * Un `confirm` sin host puede resolver tres cosas, y dos son peores que un
 * dialogo feo. Si resuelve `true`, la accion destructiva se ejecuta SIN
 * preguntar. Si resuelve `false`, el boton que el usuario acaba de tocar no hace
 * nada y no dice por que. Solo queda preguntar de verdad, aunque sea con la
 * ventana gris del navegador.
 *
 * En la practica pasa en dos momentos: antes de que React monte, y si el arbol
 * revienta y lo recoge el limite de error. Los dos son raros y los dos son justo
 * cuando menos conviene perder una confirmacion.
 */

/** Una peticion en espera de respuesta. */
export interface SolicitudDeDialogo {
  /** Identificador para la lista de React. */
  id: number;
  tipo: 'confirm' | 'alert';
  mensaje: string;
  titulo?: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  tono?: 'neutral' | 'danger';
  /** `true` si acepta. Un `alert` siempre resuelve `true` al cerrarse. */
  responder: (aceptado: boolean) => void;
}

type Presentador = (solicitud: SolicitudDeDialogo) => void;

let presentador: Presentador | null = null;
let ultimoId = 0;

/**
 * Conecta el host de React. Devuelve la funcion para desconectarlo.
 *
 * Se comprueba que quien se da de baja sea el que estaba puesto: en el modo
 * estricto de desarrollo React monta, desmonta y vuelve a montar, y sin esa
 * comprobacion la limpieza del primer montaje borraria el registro del segundo,
 * dejando la aplicacion sin dialogos propios y sin ningun sintoma visible hasta
 * que alguien intenta borrar algo.
 */
export function registrarHostDeDialogos(fn: Presentador): () => void {
  presentador = fn;
  return () => {
    if (presentador === fn) presentador = null;
  };
}

/** Solo para tests: deja el puente sin host. */
export function resetHostDeDialogos(): void {
  presentador = null;
}

export function hayHostDeDialogos(): boolean {
  return presentador !== null;
}

export function pedirConfirmacion(mensaje: string, opciones: ConfirmOptions = {}): Promise<boolean> {
  const mostrar = presentador;
  if (!mostrar) return Promise.resolve(window.confirm(mensaje));

  return new Promise<boolean>((resolver) => {
    ultimoId += 1;
    mostrar({
      id: ultimoId,
      tipo: 'confirm',
      mensaje,
      // Campo por campo, y NO `...opciones`. El puerto habla en ingles y la
      // solicitud en castellano, asi que el spread colaba claves que nadie leia:
      // el dialogo salia sin titulo y sin el rojo de lo destructivo, y
      // TypeScript no lo veia porque un spread no dispara el chequeo de
      // propiedades sobrantes. Lo encontro el test, no el compilador.
      titulo: opciones.title,
      rotuloConfirmar: opciones.confirmLabel,
      rotuloCancelar: opciones.cancelLabel,
      tono: opciones.tone,
      responder: resolver,
    });
  });
}

export function pedirAviso(mensaje: string, opciones: AlertOptions = {}): Promise<void> {
  const mostrar = presentador;
  if (!mostrar) {
    window.alert(mensaje);
    return Promise.resolve();
  }

  return new Promise<void>((resolver) => {
    ultimoId += 1;
    mostrar({
      id: ultimoId,
      tipo: 'alert',
      mensaje,
      titulo: opciones.title,
      rotuloConfirmar: opciones.confirmLabel,
      responder: () => resolver(),
    });
  });
}
