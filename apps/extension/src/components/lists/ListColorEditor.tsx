import { useState } from 'react';
import { EmptyState } from '../../design';
import { Icon } from '../../utils/icons';
import ColorPickerButton from './ColorPickerButton';
import type { LeadList } from '../../types';

/**
 * CAMBIAR EL COLOR DE UNA LISTA
 *
 * Cada fila lleva su propio punto de color; tocarlo abre la paleta y elegir
 * aplica en el acto.
 *
 * ## Por que no hay seleccion multiple
 *
 * La hubo, y estaba mal pensada: casillas por fila mas una grilla de veinte
 * colores empotrada al pie. Con tres listas se veia grande; con treinta, los
 * colores quedaban DESPUES de treinta filas, o sea que para cambiar el color de
 * la primera habia que bajar hasta el fondo, elegir, y volver a subir a
 * comprobar. El control estaba lejos de aquello sobre lo que actua.
 *
 * Con el punto en la fila, la distancia entre lo que se toca y lo que cambia es
 * cero, y la altura de la seccion es la de la lista y nada mas.
 *
 * El coste es real y conviene decirlo: pintar cinco listas del mismo color son
 * ahora cinco toques en vez de uno. Se acepta porque cambiar el color de varias
 * a la vez es raro, y el caso frecuente -corregir el color de UNA- pasa de tres
 * pasos a uno.
 */
export default function ListColorEditor({
  lists,
  onApply,
}: {
  /** Solo listas propias: las automaticas tienen su color fijo en codigo. */
  lists: LeadList[];
  onApply: (ids: number[], color: string) => Promise<void>;
}) {
  const [guardando, setGuardando] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');

  if (lists.length === 0) {
    return (
      <EmptyState
        icon={<Icon.Lists />}
        title="Todavía no tenés listas propias"
        description="Las automáticas tienen un color fijo que no se puede cambiar."
      />
    );
  }

  const aplicar = async (lista: LeadList, color: string) => {
    if (lista.id === undefined) return;

    setGuardando(lista.id);
    try {
      await onApply([lista.id], color);
      setAviso(`Se cambió el color de ${lista.name}.`);
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-meta text-ink-secondary">
        Tocá el punto de una lista para cambiarle el color.
      </p>

      <ul className="overflow-hidden rounded-md border border-line">
        {lists.map((lista) => (
          <li
            key={lista.id}
            className="flex min-h-[36px] items-center gap-2 border-b border-line-soft px-2 last:border-b-0"
          >
            <ColorPickerButton
              value={lista.color}
              onChange={(color) => void aplicar(lista, color)}
              label={`Color de ${lista.name}`}
            />

            <span className="min-w-0 flex-1 truncate text-body text-ink">{lista.name}</span>

            {guardando === lista.id && (
              <span className="shrink-0 text-micro text-ink-muted">Guardando…</span>
            )}
          </li>
        ))}
      </ul>

      {/* El aviso va al final y es una sola linea: con `aria-live` se anuncia
          sin robarle el foco a quien acaba de elegir un color. */}
      <p role="status" aria-live="polite" className="min-h-[16px] text-micro text-ink-muted">
        {aviso}
      </p>
    </div>
  );
}
