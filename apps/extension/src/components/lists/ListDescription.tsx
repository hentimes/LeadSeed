/**
 * La descripcion de una lista: se ve, y se edita en el sitio.
 *
 * No abre un modal ni lleva a otra pantalla porque son 30 caracteres: montar un
 * dialogo para eso cuesta mas atencion del usuario que el propio texto. Se
 * pulsa, se escribe y se guarda con Intro.
 *
 * Solo aparece en la pagina de Listas. Es para acordarse de que va cada lista al
 * verlas juntas, no un campo de notas que deba viajar al resto de pantallas.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MAX_LIST_DESCRIPTION } from '../../types';

interface Props {
  description?: string;
  /** Las listas automaticas no se editan: su contenido lo decide una regla. */
  editable: boolean;
  onSave: (description: string) => Promise<void>;
  /** Para el texto accesible de los controles. */
  listName: string;
  /** El ancho lo decide quien lo monta: comparte linea con nombre y contador. */
  className?: string;
}

export default function ListDescription({
  description,
  editable,
  onSave,
  listName,
  className = '',
}: Props) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(description || '');
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) inputRef.current?.select();
  }, [editando]);

  const abrir = () => {
    setValor(description || '');
    setEditando(true);
  };

  const cerrar = () => {
    setEditando(false);
    setValor(description || '');
  };

  const guardar = async () => {
    const limpio = valor.trim();
    if (limpio === (description || '')) {
      setEditando(false);
      return;
    }

    setGuardando(true);
    try {
      await onSave(limpio);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  };

  const alPulsarTecla = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      void guardar();
    }
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrar();
    }
  };

  if (!editable) {
    return description ? (
      <span className={`truncate text-meta italic text-ink-muted ${className}`}>{description}</span>
    ) : null;
  }

  if (editando) {
    return (
      // stopPropagation en todo el bloque: la fila entera despliega la lista al
      // pulsarla, y escribir aqui dentro no deberia desplegarla.
      <span
        className="inline-flex items-center gap-1.5"
        onClick={(evento) => evento.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          onKeyDown={alPulsarTecla}
          onBlur={() => void guardar()}
          maxLength={MAX_LIST_DESCRIPTION}
          disabled={guardando}
          placeholder="De que va esta lista"
          aria-label={`Descripcion de la lista ${listName}`}
          className="text-[11px] px-1.5 py-0.5 rounded border border-primary-soft bg-surface text-ink outline-none focus:ring-1 focus:ring-primary-soft w-[170px] disabled:opacity-60"
        />
        <span className="text-[10px] text-ink-muted tabular-nums">
          {valor.length}/{MAX_LIST_DESCRIPTION}
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(evento) => {
        evento.stopPropagation();
        abrir();
      }}
      aria-label={
        description
          ? `Editar la descripcion de ${listName}`
          : `Anadir una descripcion a ${listName}`
      }
      /*
       * El ancho lo decide quien lo monta con `className`, no este componente:
       * ahora comparte linea con el nombre y el contador, y un `max-w` fijo
       * aca le impediria aprovechar el sitio que quede.
       *
       * Cursiva y tono mas claro tambien CON descripcion: en una sola linea
       * junto al nombre, es lo que distingue una cosa de la otra.
       */
      /*
        `text-left` no es decorativo: en las listas editables esto es un
        `<button>`, y un boton centra su texto por defecto. Como ocupa todo el
        ancho sobrante, la descripcion aparecia flotando en el medio de la fila
        en vez de junto al nombre. En las no editables es un `<span>` y el
        problema no se veia, lo que lo hacia mas dificil de encontrar.
      */
      className={`truncate rounded px-1 -mx-1 text-left text-meta italic hover:bg-surface-hover focus:outline-none focus:ring-1 focus:ring-focus ${
        description
          ? 'text-ink-muted'
          : // Sin descripcion el invitador solo aparece al pasar por encima:
            // una fila de "anadir descripcion" repetida en cada lista es ruido.
            'text-ink-muted/0 group-hover:text-ink-muted/70'
      } ${className}`}
    >
      {description || 'añadir descripción'}
    </button>
  );
}
