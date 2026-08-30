import { useState } from 'react';
import { colorDeBurbuja } from '../../utils/bubbleColor';
import { useLongPress } from '../../hooks/useLongPress';
import MessageContent from './MessageContent';
import MessageAttachment from './MessageAttachment';
import ChatMessageActions from './ChatMessageActions';
import { ChatReactionBar } from './ChatReactionBar';
import { ChatIcon } from './ChatIcons';
import { toPlainText } from '../../utils/mentionParser';
import type { ChatMessage, ChatReactionKind, ChatReactionSummary } from '../../types';
import type { Mention } from '../../types/mentions';

/**
 * UNA BURBUJA
 *
 * Estaba escrita en linea dentro del `.map()` de `ChatMessageList`, que por eso
 * media 362 lineas.
 *
 * El cambio visual grande esta aca: la burbuja propia pasa a ser morada solida
 * con texto blanco. Antes usaba `bg-primary-soft` -el mismo tenido palido que
 * llevan todos los chips del producto- y la ajena, blanco con borde: sobre el
 * gris de fondo las dos se leian igual de claras y habia que buscar el avatar
 * para saber quien hablaba.
 */

export type PosicionEnGrupo = { primera: boolean; ultima: boolean };

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  isStaff: boolean;
  posicion: PosicionEnGrupo;

  isSaved: boolean;
  isHighlighted: boolean;

  reactions: ChatReactionSummary[];
  /** Hay una reaccion de este mensaje viajando al servidor. */
  reactionPending: boolean;
  onToggleReaction: (reaction: ChatReactionKind) => void;

  openMenu: 'reactions' | 'more' | 'pin' | 'report' | null;
  onOpenMenu: (menu: 'reactions' | 'more' | 'pin' | 'report' | null) => void;

  onReply: () => void;
  onToggleSaved: () => void;
  onToggleHighlight: () => void;
  onDelete: () => void;
  onPin: (hours: number) => void;
  onReport: (reason: string) => void;
  onMentionClick: (mention: Mention) => void;
}

export default function ChatMessageBubble({
  message,
  isOwn,
  isStaff,
  posicion,
  isSaved,
  isHighlighted,
  reactions,
  reactionPending,
  onToggleReaction,
  openMenu,
  onOpenMenu,
  onReply,
  onToggleSaved,
  onToggleHighlight,
  onDelete,
  onPin,
  onReport,
  onMentionClick,
}: ChatMessageBubbleProps) {
  const eliminado = !!message.deleted_at;

  /*
   * Las esquinas cuentan la racha: la del lado de quien escribe queda apretada
   * arriba siempre -es la punta que apunta al avatar- y tambien abajo mientras
   * haya otra burbuja debajo del mismo autor. Asi tres mensajes seguidos se
   * leen como una columna y no como tres tarjetas sueltas.
   *
   * Los cuatro nombres van escritos enteros y no compuestos con una plantilla
   * (`rounded-t${lado}-md`): Tailwind busca cadenas literales en el codigo, asi
   * que una clase armada en tiempo de ejecucion no llega a generarse nunca y la
   * esquina se quedaria redonda sin que nada avise.
   */
  const tieneReacciones = reactions.length > 0;

  /*
   * En pantalla tactil no hay hover, asi que los controles serian inalcanzables.
   * Mantener apretada la burbuja los fija. El estado vive aca y no en el hook
   * porque es interfaz de este componente, no logica de dominio.
   */
  const [forzarVisibles, setForzarVisibles] = useState(false);
  const pulsacionLarga = useLongPress(() => setForzarVisibles(true));

  /*
   * Carril reservado para los tres puntos, del lado de quien escribe. Las dos
   * ramas son clases literales y no una plantilla: Tailwind busca cadenas
   * completas en el codigo, y `pr-${x}` no genera nada.
   */
  /*
   * Carril reservado para el boton de "..." que vive dentro de la burbuja.
   * Baja de 32 a 28px porque el boton se encogio a 24: el carril tiene que
   * seguir siendo exactamente lo que ocupa el boton mas su separacion del
   * borde, o el texto se le mete debajo.
   */
  const relleno = isOwn ? 'pl-3 pr-7' : 'pl-7 pr-3';

  const esquinaSuperior = isOwn ? 'rounded-tr-md' : 'rounded-tl-md';
  /*
   * Con reacciones debajo, la esquina de abajo vuelve a ser redonda aunque el
   * mensaje siga teniendo otro del mismo autor detras: la esquina apretada
   * apunta a la burbuja siguiente, y con una fila de chips en medio esa union
   * ya no existe.
   */
  const esquinaInferior =
    posicion.ultima || tieneReacciones ? '' : isOwn ? 'rounded-br-md' : 'rounded-bl-md';
  const esquinas = `rounded-2xl ${esquinaSuperior} ${esquinaInferior}`;

  if (eliminado) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <p
          className={`flex max-w-full items-center gap-1.5 border border-dashed border-line bg-surface-sunken px-3 py-1.5 text-meta italic text-ink-muted ${esquinas}`}
        >
          <ChatIcon.Trash className="h-3.5 w-3.5" />
          {message.content}
        </p>
      </div>
    );
  }

  return (
    /*
     * La burbuja es a la vez el `group` del hover y el ancla de las acciones:
     * antes habia un div envolvente con `flex justify-*` y era el que ancoraba
     * la pildora, asi que esta aparecia en el borde de la columna y no en el de
     * la burbuja.
     *
     * `break-words` sin `[overflow-wrap:anywhere]`. La diferencia importa:
     * `anywhere` SI entra en el calculo del ancho intrinseco -deja el
     * min-content en un solo caracter-, asi que la burbuja se podia encoger
     * hasta partir una palabra de cuatro letras. `break-words` solo parte
     * cuando una palabra de verdad no entra en la linea, que es lo que se
     * queria para las URLs largas.
     */
    <div
      className={`group relative flex w-full flex-col ${isOwn ? 'items-end' : 'items-start'} ${
        tieneReacciones ? 'mb-1' : ''
      }`}
    >
      <div
        /*
         * El fondo de la burbuja ajena sale del autor, no del azar: ver
         * `utils/bubbleColor`. Va en `style` y no en una clase porque el indice
         * se calcula en tiempo de ejecucion, y una clase de Tailwind armada asi
         * no llega a generarse nunca.
         *
         * La propia conserva el degradado de marca: entre ocho colores
         * repartidos, lo que tiene que seguir distinguiendose de un vistazo es
         * cual de todas es la tuya.
         */
        style={
          isOwn
            ? { background: 'var(--ls-bubble-own)' }
            : { backgroundColor: colorDeBurbuja(message.user_id) }
        }
        {...pulsacionLarga}
        /*
         * `text-chat` (12px) y `py-1.5` en vez de `text-body` (13) y `py-2`.
         * La burbuja pasa de unos 35px de alto a 29, que es lo que se pedia:
         * mas compacta sin que el texto deje de ser el contenido principal.
         *
         * Los 29px no son de sobra: el boton de "..." mide 24 y se apoya a 2px
         * del borde, asi que ocupa 26 de esos 29. Por eso el boton se encogio a
         * la vez que la burbuja; bajar solo el relleno lo habria dejado
         * asomando por arriba y por abajo.
         */
        className={`relative min-w-0 max-w-full break-words py-1.5 text-chat shadow-sm ${relleno} ${esquinas} ${
          isOwn ? 'text-ink-inverse' : 'border border-line text-ink'
        }`}
      >
        {/*
          LA CITA, EN UNA LINEA.
 
          Era un bloque de dos renglones con fondo propio y su borde: una caja
          dentro de la burbuja, que en un panel angosto pesaba casi tanto como
          el mensaje que la lleva. La cita es contexto, no contenido.
 
          Queda el filete vertical y nada mas: sin relleno de fondo, nombre y
          texto en el mismo renglon separados por un punto. De 34px de alto pasa
          a 15, y se lee de un vistazo sin competir con el mensaje.
        */}
        {message.reply_to_message && (
          <div
            className={`mb-1 flex min-w-0 items-center gap-1.5 border-l-2 pl-1.5 text-micro ${
              isOwn ? 'border-ink-inverse/50 text-ink-inverse/75' : 'border-primary/60 text-ink-muted'
            }`}
          >
            <span className="shrink-0 truncate font-semibold">
              {message.reply_to_message.user_profile?.full_name || 'Usuario'}
            </span>
            <span aria-hidden="true" className="shrink-0 opacity-50">·</span>
            <span className="min-w-0 flex-1 truncate">
              {toPlainText(message.reply_to_message.content)}
            </span>
          </div>
        )}

        {message.content && (
          <MessageContent
            content={message.content}
            onMentionClick={onMentionClick}
            onOwnBubble={isOwn}
          />
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${message.content ? 'mt-2' : ''}`}>
            {message.attachments.map((attachment) => (
              <MessageAttachment key={attachment.id} attachment={attachment} onOwnBubble={isOwn} />
            ))}
          </div>
        )}

        {/* La estrella pasa al lado de quien escribe. Antes estaba del lado que
            mira al centro, que es justo donde ahora vive la carita. */}
        {isHighlighted && (
          <span
            className={`absolute -bottom-1 ${isOwn ? '-right-1' : '-left-1'} rounded-full bg-surface p-0.5 text-accent shadow-sm`}
            title="Mensaje destacado"
          >
            <ChatIcon.Star className="h-3 w-3" filled />
          </span>
        )}

        {/*
          Las acciones viven DENTRO de la burbuja: los tres puntos se colocan
          contra su borde y la carita justo por fuera, y las dos posiciones se
          miden contra esta caja. Con el componente fuera, `right-full` apuntaba
          al borde de la columna y no al de la burbuja.
        */}
        <ChatMessageActions
          isOwn={isOwn}
          isStaff={isStaff}
          isSaved={isSaved}
          isHighlighted={isHighlighted}
          canReport={!isOwn}
          authorName={message.user_profile?.full_name || 'Usuario'}
          reactions={reactions}
          onToggleReaction={onToggleReaction}
          onReply={onReply}
          onToggleSaved={onToggleSaved}
          onToggleHighlight={onToggleHighlight}
          onDelete={onDelete}
          openMenu={openMenu}
          onOpenMenu={(menu) => {
            onOpenMenu(menu);
            // Al cerrar, los controles vuelven a depender del raton.
            if (!menu) setForzarVisibles(false);
          }}
          onPin={onPin}
          onReport={onReport}
          forzarVisibles={forzarVisibles}
        />
      </div>

      <ChatReactionBar
        reactions={reactions}
        isOwn={isOwn}
        pending={reactionPending}
        onToggle={onToggleReaction}
      />
    </div>
  );
}
