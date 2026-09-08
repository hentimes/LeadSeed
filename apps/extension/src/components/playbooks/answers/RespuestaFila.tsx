import type { ReactNode } from 'react';

/**
 * LA ANATOMIA DE UNA RESPUESTA: primero el control, despues la etiqueta.
 *
 * Es la unica forma que usan los tres cuerpos -elegir opciones, clasificar
 * criterios y desempatar una contradiccion-. Lo unico que cambia entre ellos es
 * cuantos controles hay y que significan:
 *
 *   una opcion        1 control   marcada o no
 *   un criterio       3 controles indispensable / flexible / prescindible
 *   una contradiccion 2 controles mejorarlo / no es indispensable
 *
 * ## Por que el control va DELANTE
 *
 * La primera version ponia la etiqueta a la izquierda y el control al otro
 * extremo con `justify-between`. En una fila de 248px eso deja un vacio enorme
 * entre "Hospitalaria" y su check: hay que recorrer la fila con la vista para
 * saber si esta marcada, y con once opciones es once veces.
 *
 * Delante, el control queda pegado al texto y ademas TODOS los controles caen
 * en la misma columna, asi que el estado del conjunto se lee de una pasada
 * vertical en lugar de rebotando de un borde al otro.
 *
 * ## Por que existe este archivo
 *
 * Esta fila estaba escrita a mano en cada cuerpo, y esa es la causa concreta de
 * que los tres acabaran pareciendo productos distintos: cada arreglo de uno lo
 * alejaba del otro. Con una sola fuente, el layout no puede volver a divergir
 * -y un cambio como este se hace una vez, no tres-.
 *
 * ## Sin separadores y con el minimo de aire
 *
 * `py-0.5` deja la fila en 28px: el control se queda en sus 24px, que son el
 * minimo de objetivo tactil, y el aire sobrante es lo unico que se recorta. Los
 * bordes entre filas tampoco estan: con el control delante, la columna de
 * iconos ya separa una fila de otra sin necesidad de dibujar la linea.
 *
 * ## Marcado: cambia el control, no la fila
 *
 * La etiqueta se queda igual este marcada o no. Teñir la fila entera fue el
 * intento anterior -las fichas- y es lo que hacia que cada opcion gritara mas
 * que el contenido.
 */
interface Props {
  etiqueta: string;
  children: ReactNode;
}

export function RespuestaFila({ etiqueta, children }: Props) {
  return (
    <li className="flex min-w-0 items-center gap-2 py-0.5">
      <div className="flex shrink-0 items-center gap-0.5">{children}</div>
      <span className="min-w-0 flex-1 truncate text-micro text-ink-secondary">{etiqueta}</span>
    </li>
  );
}
