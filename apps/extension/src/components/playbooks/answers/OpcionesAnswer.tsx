import { useState } from 'react';
import { Input, ToggleIconButton } from '../../../design';
import { Icon } from '../../../utils/icons';
import type { PlaybookOption, PlaybookSelection } from '../../../types';
import { RespuestaFila } from './RespuestaFila';

/**
 * Responder marcando opciones. Sirve para una sola y para varias.
 *
 * ## La misma fila que la clasificacion
 *
 * Hubo dos intentos antes: cajas de formulario en rejilla, y despues fichas
 * redondeadas en flujo libre. Los dos se rechazaron, y por el mismo motivo de
 * fondo: no se parecian al resto. La clasificacion de criterios ya tenia la
 * forma correcta -etiqueta a la izquierda, control de 24px a la derecha- y era
 * la unica que nadie objeto. Asi que la direccion es hacia ella.
 *
 * El control es el MISMO `ToggleIconButton` que marca un punto del guion como
 * hecho. Un cuarto tono solo para esto habria vuelto a partir el lenguaje.
 *
 * ## Cuantas columnas caben, medido
 *
 * El limite lo pone la etiqueta mas larga del catalogo -"Red de clinicas",
 * ~82px a `text-micro`- mas el control de 24px y su hueco. Con `gap-x-3`:
 *
 *   panel-sm  336px utiles  2 columnas  ~150px por celda   holgado
 *   panel-md  416px utiles  3 columnas  ~127px por celda   holgado
 *   panel-lg  476px utiles  3 columnas  (a 4 quedarian 78px de texto: trunca)
 *   panel-xl  556px utiles  4 columnas  ~121px por celda   holgado
 *
 * Once opciones pasan de ~310px en una columna a ~87px en cuatro, sin cambiar
 * de lenguaje ni recortar el objetivo tactil.
 *
 * Si algun dia las etiquetas se acortan, el salto a cuatro se puede adelantar a
 * `panel-lg`; hoy ahi se truncarian dos de las once.
 *
 * Se descarto meter scroll propio con `max-h`: en este proyecto las barras de
 * desplazamiento estan ocultas globalmente, asi que un segundo scroll dentro
 * del que ya tiene el corredor no avisaria de que hay mas opciones abajo.
 * Tambien se descarto mostrar primero lo marcado: una fila que salta de sitio
 * al tocarla es lo peor que puede pasar en una pantalla que se mira de reojo.
 */

/** Marca de "esta elegida". La clasificacion usa sus propios valores. */
const ELEGIDA = 'si';

interface Props {
  opciones: PlaybookOption[];
  selecciones: PlaybookSelection[];
  /** Una sola opcion o varias. */
  unica: boolean;
  soloLectura: boolean;
  onGuardar: (selecciones: PlaybookSelection[]) => void;
}

export default function OpcionesAnswer({
  opciones,
  selecciones,
  unica,
  soloLectura,
  onGuardar,
}: Props) {
  const [otro, setOtro] = useState('');
  const [pidiendoOtro, setPidiendoOtro] = useState(false);

  const elegidas = new Set(selecciones.filter((s) => s.value === ELEGIDA).map((s) => s.id));
  const adHoc = selecciones.filter((s) => s.label && !opciones.some((o) => o.id === s.id));

  const alternar = (id: string) => {
    if (unica) {
      onGuardar(elegidas.has(id) ? [] : [{ id, value: ELEGIDA }]);
      return;
    }

    onGuardar(
      elegidas.has(id)
        ? selecciones.filter((s) => s.id !== id)
        : [...selecciones, { id, value: ELEGIDA }],
    );
  };

  if (opciones.length === 0) {
    return (
      <p className="mt-1.5 text-micro text-ink-muted">
        Todavía no hay nada que elegir: marca opciones en los puntos anteriores primero.
      </p>
    );
  }

  /*
   * En seleccion unica el grupo entero es un solo tabulador y dentro se mueve
   * con flechas, asi que hace falta saber cual lleva `tabIndex=0`: el elegido,
   * o el primero si todavia no hay ninguno.
   */
  const primeroElegible = opciones.findIndex((o) => elegidas.has(o.id));
  const indiceConFoco = primeroElegible >= 0 ? primeroElegible : 0;

  return (
    <div className="mt-1.5 space-y-1.5">
      <ul
        role={unica ? 'radiogroup' : 'group'}
        aria-label="Opciones"
        className="grid grid-cols-1 gap-x-3 panel-sm:grid-cols-2 panel-md:grid-cols-3 panel-xl:grid-cols-4"
      >
        {opciones.map((opcion, indice) => {
          const marcada = elegidas.has(opcion.id);

          return (
            <RespuestaFila key={opcion.id} etiqueta={opcion.label}>
              <ToggleIconButton
                active={marcada}
                tono="success"
                icon={marcada ? Icon.Check() : Icon.CircleEmpty()}
                role={unica ? 'radio' : 'checkbox'}
                aria-checked={marcada}
                aria-label={opcion.label}
                title={opcion.label}
                tabIndex={unica && indice !== indiceConFoco ? -1 : 0}
                disabled={soloLectura}
                onClick={() => alternar(opcion.id)}
              />
            </RespuestaFila>
          );
        })}

        {/* Lo escrito a mano es una fila mas, ya marcada. */}
        {adHoc.map((seleccion) => (
          <RespuestaFila key={seleccion.id} etiqueta={seleccion.label ?? ''}>
            <ToggleIconButton
              active
              tono="success"
              icon={Icon.Check()}
              role="checkbox"
              aria-checked
              aria-label={seleccion.label}
              title={`Quitar "${seleccion.label}"`}
              disabled={soloLectura}
              onClick={() => onGuardar(selecciones.filter((s) => s.id !== seleccion.id))}
            />
          </RespuestaFila>
        ))}
      </ul>

      {/*
       * El "otro" ocupa el ancho entero y no entra en la anatomia de columnas:
       * no tiene etiqueta ni estado, tiene contenido. Meterlo ahi obligaria a
       * inventarle un rotulo que compita con su propio marcador.
       *
       * Y esta detras de un enlace: un campo de 34px siempre visible cuesta mas
       * alto que dos opciones, para algo que la mayoria de las veces no se usa.
       * Se abre con el foco puesto y se cierra solo si se sale sin escribir.
       *
       * Sin el, la frase de confirmacion omitiria justo lo que el cliente dijo
       * con sus palabras, que es peor que no tener frase.
       */}
      {!unica && !soloLectura && !pidiendoOtro && (
        <button
          type="button"
          onClick={() => setPidiendoOtro(true)}
          className="text-micro font-medium text-primary hover:underline"
        >
          + Otro
        </button>
      )}

      {!unica && !soloLectura && pidiendoOtro && (
        <Input
          autoFocus
          value={otro}
          onChange={(e) => setOtro(e.target.value)}
          onBlur={() => {
            if (!otro.trim()) setPidiendoOtro(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOtro('');
              setPidiendoOtro(false);
              return;
            }
            if (e.key !== 'Enter' || !otro.trim()) return;
            onGuardar([
              ...selecciones,
              { id: `otro-${Date.now()}`, value: ELEGIDA, label: otro.trim() },
            ]);
            setOtro('');
          }}
          placeholder="Lo que dijo, y Enter"
        />
      )}
    </div>
  );
}
