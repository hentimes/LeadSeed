import { ChatReactionPicker } from './ChatReactionBar';
import { ChatIcon } from './ChatIcons';
import type { ChatReactionKind, ChatReactionSummary } from '../../types';

interface Props {
  authorName: string;
  reactions: ChatReactionSummary[];
  onToggleReaction: (reaction: ChatReactionKind) => void;
  abierto: boolean;
  onAbrir: (abierto: boolean) => void;
  /** Hacia donde se despliega el selector: al centro del panel. */
  isOwn: boolean;
  /** Clases de aparicion, compartidas con el resto de acciones del mensaje. */
  visibilidad: string;
}

/**
 * LA CARITA DE REACCIONAR
 *
 * Vive fuera de `ChatMessageActions` y fuera de la burbuja, como un elemento
 * mas de la fila del mensaje.
 *
 * Estaba posicionada en absoluto contra el borde de la burbuja
 * (`left-full ml-1`), que es exactamente donde pasaron a vivir las reacciones
 * ya puestas: en un mensaje de una linea la carita quedaba ENCIMA de ellas y
 * las tapaba. Como el ancho de las reacciones es variable, ningun
 * desplazamiento fijo lo resolvia; lo que hace falta es que la carita venga
 * DESPUES en el flujo, y para eso tiene que estar en el flujo.
 *
 * El selector si sigue en absoluto, pero respecto a la carita, que es la
 * referencia correcta: se abre justo encima de ella.
 */
export default function ChatReactionTrigger({
  authorName,
  reactions,
  onToggleReaction,
  abierto,
  onAbrir,
  isOwn,
  visibilidad,
}: Props) {
  return (
    <div className="relative shrink-0 self-end">
      <button
        type="button"
        onClick={() => onAbrir(!abierto)}
        aria-label={`Reaccionar al mensaje de ${authorName}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        title={abierto ? 'Cerrar reacciones' : 'Reaccionar'}
        className={`flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface shadow-card transition-colors ${visibilidad} ${
          abierto ? 'text-primary' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
        }`}
      >
        <ChatIcon.Smiley className="h-[17px] w-[17px]" />
      </button>

      {abierto && (
        <>
          {/* Capa de cierre: tocar fuera baja el selector. */}
          <div className="fixed inset-0 z-20" onClick={() => onAbrir(false)} aria-hidden="true" />

          <div
            className={`absolute bottom-full z-30 mb-1 flex w-max items-center rounded-full border border-line bg-surface p-0.5 shadow-float ${
              isOwn ? 'left-0' : 'right-0'
            }`}
          >
            <ChatReactionPicker
              reactions={reactions}
              onToggle={(reaction) => {
                onToggleReaction(reaction);
                // Solo se puede tener una: elegirla cierra.
                onAbrir(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
