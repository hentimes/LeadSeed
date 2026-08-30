import { useRef, useState, type ReactNode, type RefObject } from 'react';
import EmojiPicker from '../chat/EmojiPicker';
import { ChatIcon } from '../chat/ChatIcons';
import {
  insertBlockLine,
  insertLink,
  toggleLinePrefix,
  wrapSelection,
  type SelectionResult,
} from '../../utils/textareaSelection';

/**
 * BARRA DE FORMATO DEL EDITOR DE PUBLICACIONES
 *
 * Actua sobre un `textarea`, no sobre un `contenteditable`.
 *
 * Esa fue la decision de fondo y no es de gusto: `contenteditable` obliga a
 * leer y escribir `innerHTML`, o sea a tener una cadena de HTML producida por
 * el usuario dando vueltas por el codigo. Todo el diseno del formato -ver
 * `utils/richTextParser.ts`- existe justamente para que esa cadena no exista
 * nunca. Ademas `document.execCommand`, que es como se aplica formato en un
 * `contenteditable`, esta declarado obsoleto y se comporta distinto en cada
 * navegador.
 *
 * El coste es real y conviene decirlo: mientras se escribe se ven las marcas
 * (`**negrita**`), no el resultado. Se compensa con la pestana de vista previa,
 * que usa EXACTAMENTE el mismo parser con el que se dibuja despues en el feed:
 * no hay dos caminos que se puedan desincronizar.
 *
 * ## Foco
 *
 * Cada boton devuelve el foco al textarea y restaura la seleccion. Un boton de
 * formato que deja el cursor perdido al final del texto es el fallo clasico de
 * este patron, y hace el editor inusable con teclado.
 */

const BOTON =
  'flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-md px-1.5 text-meta font-bold transition-colors text-ink-muted hover:bg-surface-hover hover:text-ink';

function Separador() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-line-soft" aria-hidden="true" />;
}

/**
 * Va en el ambito del modulo y NO dentro del componente.
 *
 * Estuvo dentro, y era un fallo serio: una funcion declarada en el cuerpo del
 * componente se vuelve a crear en cada render, asi que React la ve como un tipo
 * de componente DISTINTO cada vez y desmonta y vuelve a montar los ocho
 * botones. Como el editor se redibuja con cada tecla, el remontaje ocurria
 * mientras se escribia y **el foco se perdia a mitad de palabra**.
 */
function Boton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // `onMouseDown` con preventDefault: sin esto, pulsar el boton le quita el
      // foco al textarea ANTES del clic, y la seleccion que habia se pierde.
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      aria-label={label}
      className={BOTON}
    >
      {children}
    </button>
  );
}

export default function RichTextToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showEmojis, setShowEmojis] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const seleccionGuardada = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  /** Aplica el resultado y devuelve el foco con la seleccion en su sitio. */
  const aplicar = (resultado: SelectionResult) => {
    onChange(resultado.text);

    requestAnimationFrame(() => {
      const campo = textareaRef.current;
      if (!campo) return;
      campo.focus();
      campo.setSelectionRange(resultado.selectionStart, resultado.selectionEnd);
    });
  };

  const conSeleccion = (accion: (start: number, end: number) => SelectionResult) => {
    const campo = textareaRef.current;
    const start = campo?.selectionStart ?? value.length;
    const end = campo?.selectionEnd ?? start;
    aplicar(accion(start, end));
  };

  const abrirEnlace = () => {
    const campo = textareaRef.current;
    const start = campo?.selectionStart ?? value.length;
    const end = campo?.selectionEnd ?? start;

    // La seleccion se guarda ANTES de abrir el formulario: al mover el foco al
    // campo de la URL, el textarea pierde su seleccion y despues no hay contra
    // que insertar.
    seleccionGuardada.current = { start, end };
    setLinkLabel(value.slice(start, end));
    setLinkUrl('');
    setLinkOpen(true);
  };

  const confirmarEnlace = () => {
    const destino = linkUrl.trim();
    if (!destino) return;

    const { start, end } = seleccionGuardada.current;
    aplicar(insertLink(value, start, end, destino, linkLabel));
    setLinkOpen(false);
  };

  return (
    <div className="relative">
      <div
        role="toolbar"
        aria-label="Formato del texto"
        aria-controls="cuerpo-de-la-publicacion"
        className="flex items-center gap-0.5 border-b border-line-soft pb-1.5"
      >
        <Boton label="Negrita" onClick={() => conSeleccion((s, e) => wrapSelection(value, s, e, '**'))}>
          B
        </Boton>

        <Boton
          label="Encabezado 1"
          onClick={() => conSeleccion((s) => toggleLinePrefix(value, s, '# '))}
        >
          H1
        </Boton>

        <Boton
          label="Encabezado 2"
          onClick={() => conSeleccion((s) => toggleLinePrefix(value, s, '## '))}
        >
          H2
        </Boton>

        <Separador />

        <Boton label="Viñetas" onClick={() => conSeleccion((s) => toggleLinePrefix(value, s, '- '))}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="5" cy="7" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="5" cy="17" r="1.4" fill="currentColor" stroke="none" />
            <path strokeLinecap="round" d="M10 7h10M10 12h10M10 17h10" />
          </svg>
        </Boton>

        <Boton
          label="Línea horizontal"
          onClick={() => conSeleccion((s) => insertBlockLine(value, s, '---'))}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 12h16" />
          </svg>
        </Boton>

        <Separador />

        <Boton label="Insertar enlace" onClick={abrirEnlace}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
            />
          </svg>
        </Boton>

        <Boton label="Emoticones" onClick={() => setShowEmojis((abierto) => !abierto)}>
          <ChatIcon.Smiley className="h-4 w-4" />
        </Boton>
      </div>

      {showEmojis && (
        <div className="absolute right-0 top-full z-30">
          <EmojiPicker
            onClose={() => setShowEmojis(false)}
            onSelect={(emoji) => {
              conSeleccion((s, e) => ({
                text: value.slice(0, s) + emoji + value.slice(e),
                selectionStart: s + emoji.length,
                selectionEnd: s + emoji.length,
              }));
              setShowEmojis(false);
            }}
          />
        </div>
      )}

      {/*
        Dos campos, no un `prompt()`. Ademas de que `prompt` no existe en React
        Native -y este nucleo se va a portar-, un dialogo del navegador no
        permite pegar la direccion y ver la etiqueta a la vez.
      */}
      {linkOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-line bg-surface p-2.5 shadow-float">
          <p className="mb-1.5 text-micro font-bold uppercase tracking-wider text-ink-muted">
            Insertar enlace
          </p>

          <input
            type="text"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Texto del enlace"
            aria-label="Texto del enlace"
            className="mb-1.5 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-meta text-ink outline-none transition-colors focus:border-focus"
          />

          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmarEnlace();
              }
            }}
            placeholder="https://…"
            aria-label="Dirección del enlace"
            autoFocus
            className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-meta text-ink outline-none transition-colors focus:border-focus"
          />

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              className="text-meta font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarEnlace}
              disabled={!linkUrl.trim()}
              className="text-meta font-semibold text-primary hover:underline disabled:opacity-50"
            >
              Insertar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
