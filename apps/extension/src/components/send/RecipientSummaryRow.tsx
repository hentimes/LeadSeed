import { Badge } from '../../design';
import { Icon } from '../../utils/icons';

/**
 * RESUMEN DE DESTINATARIOS
 *
 * La fila que sustituye a la lista de leads incrustada en la pagina.
 *
 * ## Que problema resuelve
 *
 * La lista vivia dentro de la tarjeta del paso, y ocupaba unos 500px: buscador,
 * aviso de descartados, ocho filas de lead, paginador y los chips de listas.
 * Con eso, el boton de enviar quedaba a mas de mil pixeles de scroll.
 *
 * Peor: se montaba con `flush` y `-mx-3`, o sea con margen negativo para salir
 * del relleno de la tarjeta y apoyarse en el borde. Visualmente era una capa de
 * otro material incrustada a la fuerza dentro de otra. Cuando el usuario dijo
 * que la lista se veia "atravesada", estaba describiendo ese margen negativo.
 *
 * Aca son 64px que dicen cuantos y quienes, y abren la lista en una hoja. Es el
 * mismo gesto que ya usa `ReasonPicker`, asi que no estrena patron.
 *
 * ## Toda la fila es el disparador
 *
 * 336x64 de objetivo tactil, muy por encima de los 24x24 de WCAG 2.5.8. Con el
 * movil a la vista, un objetivo grande importa mas que ahorrar pixeles.
 */
export function RecipientSummaryRow({
  count,
  names,
  onOpen,
  emptyLabel = 'Ninguno todavía',
}: {
  count: number;
  /** Los primeros nombres, para que la fila diga a quien y no solo cuantos. */
  names: string[];
  onOpen: () => void;
  emptyLabel?: string;
}) {
  const muestra = names.slice(0, 3).join(', ');
  const resto = count - Math.min(3, names.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-left shadow-card transition-colors hover:bg-surface-hover"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-body font-medium text-ink">Destinatarios</span>
          {count > 0 && (
            <Badge tone="primary">
              {count} {count === 1 ? 'elegido' : 'elegidos'}
            </Badge>
          )}
        </span>

        {/*
          `text-ink-secondary` y no `text-ink-muted`: es la linea que dice a
          quien le vas a escribir, no un dato terciario.
        */}
        <span className="mt-0.5 block truncate text-meta text-ink-secondary">
          {count === 0 ? emptyLabel : resto > 0 ? `${muestra} y ${resto} más` : muestra}
        </span>
      </span>

      <span className="shrink-0 text-ink-muted [&_svg]:h-4 [&_svg]:w-4">
        <Icon.ChevronRight />
      </span>
    </button>
  );
}
