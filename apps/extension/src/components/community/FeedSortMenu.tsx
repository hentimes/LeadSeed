import { useState, type ReactNode } from 'react';
// Se reutiliza la superficie de menu del chat: ya resuelve el cierre con
// Escape, el foco que entra y vuelve, y el volteo cuando no cabe.
import ChatMenuSurface from '../chat/ChatMenuSurface';
import { ChatIcon } from '../chat/ChatIcons';
import { Icon } from '../../utils/icons';
import type { CommunityFeedSort } from '../../types/community';

/**
 * ORDEN DEL FEED
 *
 * Los tres ordenes de un grupo de Facebook, detras de un menu "Ordenar por".
 *
 * Estuvieron como tres botones en linea, y no daba: tres opciones con icono
 * ocupan ~100px que compiten con el aviso de quien esta conectado y con el
 * boton de publicar, y ademas un selector de tres posiciones se lee como si las
 * tres estuvieran al mismo nivel, cuando lo normal es cambiarlo una vez y
 * olvidarse. Un menu ocupa lo que mide su etiqueta y dice cual esta puesto.
 */

interface Opcion {
  value: CommunityFeedSort;
  label: string;
  /** Que significa, para quien no lo tenga claro por el nombre. */
  hint: string;
  icon: ReactNode;
}

const OPCIONES: Opcion[] = [
  {
    value: 'activity',
    label: 'Actividad',
    hint: 'Lo que se comentó recién, arriba',
    icon: <Icon.Messages />,
  },
  {
    value: 'recent',
    label: 'Recientes',
    hint: 'Lo último que se publicó',
    icon: <Icon.History />,
  },
  {
    value: 'trending',
    label: 'Relevantes',
    hint: 'Lo que más movimiento tuvo',
    icon: <Icon.TrendUp />,
  },
];

export default function FeedSortMenu({
  value,
  onChange,
}: {
  value: CommunityFeedSort;
  onChange: (value: CommunityFeedSort) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = OPCIONES.find((opcion) => opcion.value === value) ?? OPCIONES[0];

  if (!actual) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((estaba) => !estaba)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Ordenar por: ${actual.label}`}
        title={`Ordenar por: ${actual.label}`}
        className="flex h-control-sm items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-meta font-semibold text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{actual.icon}</span>
        <span className="hidden panel-sm:inline">{actual.label}</span>
        <ChatIcon.Chevron className="h-3 w-3 shrink-0 rotate-90 text-ink-muted" />
      </button>

      {abierto && (
        <ChatMenuSurface
          onClose={() => setAbierto(false)}
          align="right"
          width="w-56"
          label="Ordenar el feed"
        >
          {OPCIONES.map((opcion) => {
            const puesta = opcion.value === value;

            return (
              <button
                key={opcion.value}
                type="button"
                role="menuitemradio"
                aria-checked={puesta}
                onClick={() => {
                  onChange(opcion.value);
                  setAbierto(false);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-hover ${
                  puesta ? 'bg-primary-soft' : ''
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5 ${
                    puesta ? 'text-primary' : 'text-ink-muted'
                  }`}
                >
                  {opcion.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-meta font-semibold ${puesta ? 'text-primary' : 'text-ink'}`}
                  >
                    {opcion.label}
                  </span>
                  <span className="block text-micro text-ink-muted">{opcion.hint}</span>
                </span>

                {puesta && (
                  <ChatIcon.Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </ChatMenuSurface>
      )}
    </div>
  );
}
