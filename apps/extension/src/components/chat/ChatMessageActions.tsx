import { ChatReactionPicker } from './ChatReactionBar';
import type { ChatReactionKind, ChatReactionSummary } from '../../types';
import { ChatIcon } from './ChatIcons';
import ChatMenuSurface, { ChatMenuItem } from './ChatMenuSurface';
import PinDurationMenu from './PinDurationMenu';
import ReportMessageMenu from './ReportMessageMenu';

/**
 * ACCIONES SOBRE UN MENSAJE
 *
 * Dos controles, y ninguno se superpone al texto:
 *
 * - **Tres puntos DENTRO de la burbuja**, en la esquina del lado de quien
 *   escribe. La burbuja reserva ese carril con relleno asimetrico, asi que el
 *   texto nunca pasa por debajo.
 * - **Carita FUERA de la burbuja**, del lado opuesto, hacia el centro del
 *   panel. Ahi hay hueco garantizado porque la columna esta topada.
 *
 * Nunca quedan pegados uno al otro, y los dos paneles crecen hacia el centro.
 *
 * ## Por que se reserva el espacio siempre
 *
 * La alternativa era que el relleno apareciera al pasar el raton. En una lista
 * con scroll, reacomodar el texto de un mensaje mueve todo lo que hay debajo:
 * pasar el cursor por encima desplazaria la conversacion entera. Un ancho fijo
 * un poco menor es mejor que una lista que se mueve sola.
 *
 * El coste esta medido: 20px por mensaje, de 152,8 a 132,0px de texto util en
 * el panel mas angosto. A 13px son unos 21 caracteres por linea en vez de 24.
 *
 * ## Por que el selector de reacciones flota
 *
 * Tres botones mas el separador son ~92px y el hueco de la carita mide 32.
 * Inline no entra. Al abrirse pasa a ser una superficie sobre la carita:
 * superponer mientras algo esta ABIERTO es aceptable; superponer en reposo, que
 * es lo que hacia la version anterior, no.
 */

export interface ChatMessageActionsProps {
  isOwn: boolean;
  isStaff: boolean;
  isSaved: boolean;
  isHighlighted: boolean;
  canReport: boolean;
  /** Para que los cuarenta botones de la sala no se llamen todos igual. */
  authorName: string;

  reactions: ChatReactionSummary[];
  onToggleReaction: (reaction: ChatReactionKind) => void;

  onReply: () => void;
  onToggleSaved: () => void;
  onToggleHighlight: () => void;
  onDelete: () => void;

  openMenu: 'reactions' | 'more' | 'pin' | 'report' | null;
  onOpenMenu: (menu: 'reactions' | 'more' | 'pin' | 'report' | null) => void;
  onPin: (hours: number) => void;
  onReport: (reason: string) => void;

  /** En tactil no hay hover: la pulsacion larga los deja fijos. */
  forzarVisibles: boolean;
}

export default function ChatMessageActions({
  isOwn,
  isStaff,
  isSaved,
  isHighlighted,
  canReport,
  authorName,
  reactions,
  onToggleReaction,
  onReply,
  onToggleSaved,
  onToggleHighlight,
  onDelete,
  openMenu,
  onOpenMenu,
  onPin,
  onReport,
  forzarVisibles,
}: ChatMessageActionsProps) {
  // Los paneles se despliegan hacia el centro del panel.
  const align = isOwn ? 'right' : 'left';
  const reaccionesAbiertas = openMenu === 'reactions';

  /*
   * `[@media(hover:none)]:opacity-100`: donde no hay raton los controles estan
   * siempre a la vista. No cuesta nada porque el espacio ya esta reservado.
   */
  const visibilidad =
    forzarVisibles || openMenu
      ? 'opacity-100'
      : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

  return (
    <>
      {/* Tres puntos, en el carril reservado dentro de la burbuja. */}
      {/* `top-0.5` y 24px: la burbuja compacta mide 29 de alto, asi que un
          boton de 28 apoyado a 4px del borde ya no entraba. */}
      <div className={`absolute top-0.5 z-30 ${isOwn ? 'right-0.5' : 'left-0.5'}`}>
        <button
          type="button"
          onClick={() => onOpenMenu(openMenu === 'more' ? null : 'more')}
          aria-label={`Más acciones del mensaje de ${authorName}`}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'more'}
          title="Más acciones"
          className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${visibilidad} ${
            isOwn
              ? 'text-ink-inverse/90 hover:bg-[var(--ls-bubble-own-line)] hover:text-ink-inverse'
              : openMenu === 'more'
                ? 'bg-primary-soft text-primary'
                : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
          }`}
        >
          <ChatIcon.More className="h-[17px] w-[17px]" />
        </button>

        {openMenu === 'more' && (
          <ChatMenuSurface
            onClose={() => onOpenMenu(null)}
            align={align}
            width="w-48"
            label="Acciones del mensaje"
          >
            <ChatMenuItem onClick={onReply} icon={<ChatIcon.Reply />}>
              Responder
            </ChatMenuItem>

            <ChatMenuItem onClick={onToggleSaved} icon={<ChatIcon.Bookmark filled={isSaved} />}>
              {isSaved ? 'Quitar de guardados' : 'Guardar'}
            </ChatMenuItem>

            <ChatMenuItem
              onClick={onToggleHighlight}
              tone="accent"
              icon={<ChatIcon.Star filled={isHighlighted} />}
            >
              {isHighlighted ? 'Quitar destacado' : 'Destacar'}
            </ChatMenuItem>

            {isStaff && (
              <ChatMenuItem onClick={() => onOpenMenu('pin')} icon={<ChatIcon.Pin />}>
                Fijar en la sala
              </ChatMenuItem>
            )}

            {canReport && (
              <ChatMenuItem onClick={() => onOpenMenu('report')} tone="danger" icon={<ChatIcon.Flag />}>
                Reportar
              </ChatMenuItem>
            )}

            {isStaff && (
              <ChatMenuItem onClick={onDelete} tone="danger" icon={<ChatIcon.Trash />}>
                Eliminar
              </ChatMenuItem>
            )}
          </ChatMenuSurface>
        )}

        {openMenu === 'pin' && (
          <PinDurationMenu
            align={align}
            onClose={() => onOpenMenu(null)}
            onSelect={(hours) => {
              onPin(hours);
              onOpenMenu(null);
            }}
          />
        )}

        {openMenu === 'report' && (
          <ReportMessageMenu
            align={align}
            onClose={() => onOpenMenu(null)}
            onSubmit={(reason) => {
              onReport(reason);
              onOpenMenu(null);
            }}
          />
        )}
      </div>

      {/* Carita, fuera de la burbuja y hacia el centro del panel. */}
      <div className={`absolute top-0.5 z-30 ${isOwn ? 'right-full mr-1' : 'left-full ml-1'}`}>
        <button
          type="button"
          onClick={() => onOpenMenu(reaccionesAbiertas ? null : 'reactions')}
          aria-label={`Reaccionar al mensaje de ${authorName}`}
          aria-haspopup="menu"
          aria-expanded={reaccionesAbiertas}
          title={reaccionesAbiertas ? 'Cerrar reacciones' : 'Reaccionar'}
          className={`flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface shadow-card transition-colors ${visibilidad} ${
            reaccionesAbiertas ? 'text-primary' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
          }`}
        >
          <ChatIcon.Smiley className="h-[17px] w-[17px]" />
        </button>

        {reaccionesAbiertas && (
          <>
            {/* Capa de cierre: tocar fuera baja el selector. */}
            <div className="fixed inset-0 z-20" onClick={() => onOpenMenu(null)} aria-hidden="true" />

            <div
              className={`absolute bottom-full z-30 mb-1 flex w-max items-center rounded-full border border-line bg-surface p-0.5 shadow-float ${
                isOwn ? 'right-0' : 'left-0'
              }`}
            >
              <ChatReactionPicker
                reactions={reactions}
                onToggle={(reaction) => {
                  onToggleReaction(reaction);
                  // Solo se puede tener una: elegirla cierra.
                  onOpenMenu(null);
                }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
