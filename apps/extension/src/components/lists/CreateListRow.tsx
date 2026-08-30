import { useState } from 'react';
import { Button, IconButton } from '../../design';
import { Icon } from '../../utils/icons';
import { elegirColorAlAzar } from '../../utils/listColors';
import { MAX_LIST_NAME } from '../../types';
import { getErrorMessage } from '../../utils/errorMessage';

/**
 * CREAR UNA LISTA, EN UNA SOLA LINEA
 *
 * ## Que estaba roto
 *
 * La fila tenia dos campos de texto con anchos minimos de 160 y 150px, cinco
 * muestras de color con su flecha de paginado (~110px) y el boton de crear.
 * Sumaba unos 550px de minimo. Ademas ni el formulario ni su contenedor tenian
 * `min-w-0`, asi que nada podia encogerse: en un panel de 320px todo lo que iba
 * a la derecha -colores, "Crear" y el engranaje- se salia de la pantalla, y
 * como los scrollbars estan ocultos globalmente no habia ninguna pista de que
 * estuviera ahi.
 *
 * ## Que quedo
 *
 * Nombre, color y crear. La cuenta a 320px, con 246px interiores:
 *
 *   nombre (flex-1) 140 + gap 8 + color 28 + gap 8 + Crear 62 = 246
 *
 * 140px aceptan unos 18 caracteres a 13px, que alcanzan para ver lo que se
 * escribe. Y la fila es IDENTICA en los cinco anchos: nada aparece ni se muda
 * al ensanchar el panel, solo crece el campo de nombre. Que la posicion de un
 * control dependa del ancho de la ventana obliga a buscarlo de nuevo cada vez.
 *
 * ## La descripcion no esta aca
 *
 * Se escribe despues, tocandola en la propia lista: `ListDescription` ya la
 * edita en el sitio con Intro y Escape. Tenerla tambien al crear duplicaba ese
 * editor y costaba 150px de la unica fila donde no sobraban.
 */
export default function CreateListRow({
  existingNames,
  existingColors,
  onCreate,
  onOpenSettings,
}: {
  /** Para avisar antes de intentar crear una repetida. */
  existingNames: string[];
  /** Para que el color sorteado no repita el de otra lista. */
  existingColors: string[];
  onCreate: (data: { name: string; color: string }) => Promise<void>;
  onOpenSettings: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  const limpio = name.trim();
  const repetida = existingNames.some(
    (existente) => existente.trim().toLowerCase() === limpio.toLowerCase()
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!limpio || creando) return;

    if (repetida) {
      setError('Ya tenés una lista con ese nombre.');
      return;
    }

    setError('');
    setCreando(true);

    try {
      /*
       * El color se sortea al enviar y no al montar: asi dos listas creadas
       * seguidas no salen del mismo color, porque la segunda ya ve el de la
       * primera entre los usados.
       */
      await onCreate({ name: limpio, color: elegirColorAlAzar(existingColors) });
      setName('');
    } catch (err) {
      /*
       * El limite del plan llegaba por `alert()`, que en un panel de 320px tapa
       * la extension entera y ademas no existe en React Native. Ahora es una
       * linea debajo del formulario.
       */
      setError(getErrorMessage(err, 'No se pudo crear la lista.'));
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="mb-4 min-w-0">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 items-center gap-2 rounded-md border border-line bg-surface p-1 shadow-sm"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          placeholder="Nueva lista"
          aria-label="Nombre de la lista nueva"
          aria-invalid={!!error}
          aria-describedby={error ? 'error-lista-nueva' : undefined}
          maxLength={MAX_LIST_NAME}
          className={`min-w-0 flex-1 bg-transparent px-2 py-1.5 text-body text-ink outline-none placeholder:text-ink-muted ${
            error ? 'rounded-sm ring-1 ring-state-danger' : ''
          }`}
        />

        {/*
          El engranaje ocupa el hueco de 28px que dejo el selector de color, asi
          que la fila no cambia de medidas. El color ya no se elige aca: se
          sortea al crear y se cambia despues desde esta misma configuracion,
          donde ademas se puede hacer sobre varias listas de una vez.
        */}
        <IconButton
          icon={Icon.Settings()}
          label="Configuración de listas"
          size="sm"
          onClick={onOpenSettings}
        />

        <Button type="submit" variant="primary" size="sm" disabled={!limpio || creando}>
          {creando ? 'Creando…' : 'Crear'}
        </Button>
      </form>

      {/*
        `role="status"` con `aria-live`: el aviso se anuncia sin robarle el foco
        a quien esta escribiendo. Va debajo y es condicional, asi que la fila
        sigue siendo de una sola linea mientras no haya error.
      */}
      {error && (
        <p
          id="error-lista-nueva"
          role="status"
          aria-live="polite"
          className="mt-1 px-1 text-micro font-medium text-state-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
