import { useState } from 'react';
import { createPortal } from 'react-dom';
import { IconButton, Input } from '../../design';
import { Icon } from '../../utils/icons';
import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';
import { formatearFechaHora } from '../../utils/date';
import type { TaskNote } from '../../types';

/**
 * LAS NOTAS: BARRA AL PIE, HISTORIAL HACIA ARRIBA
 *
 * ## Por que `fixed` y no al final del contenido
 *
 * "Al final del contenido" es el fondo del scroll, no el pie de la pantalla. Y
 * `sticky` no serviria: el contenedor que scrollea es el `<main>` de
 * `AppLayout`, dos niveles mas arriba, y Tareas no esta en `PAGE_FILL_HEIGHT`.
 * Es la misma pared que ya documenta `SendActionBar`.
 *
 * `fixed` es seguro AQUI y hay que decir por que: la cadena de ancestros
 * -`main`, `PageShell`- solo usa `animate-fade-in`, que anima opacidad y nada
 * mas. Si alguien envuelve el detalle en `animate-ios-slide-up`, que termina en
 * `forwards` y deja el `transform` puesto, esta barra se ancla al envoltorio en
 * vez de a la ventana y deja de estar al pie.
 *
 * ## El historial se superpone, no empuja
 *
 * Va en un portal a `document.body`, asi que el contenido de la pagina no se
 * mueve un pixel al abrirlo. Eso es lo que se pidio: que no deforme la seccion.
 *
 * No lleva velo oscuro. No es un modal: se abre para leer las notas de la tarea
 * que esta detras, y bajarle la luz a lo que se quiere seguir viendo es un peso
 * que el gesto no merece. El velo existe pero es transparente, solo para poder
 * cerrar tocando afuera.
 *
 * ## Con cuarenta notas si hay scroll, y esta bien
 *
 * Cuarenta notas no entran en 340px por aritmetica. Lo que se garantiza es que
 * el scroll no se lo coma la pagina: `overscroll-contain` corta el
 * encadenamiento, asi que llegar al tope del historial NO empieza a mover la
 * tarea de atras.
 *
 * Y como los scrollbars estan ocultos en todo el producto, el desbordamiento se
 * anuncia de otras tres formas: la nota mas nueva arriba, el contador en la
 * cabecera, y la ultima fila cortada a media altura por el borde.
 */
export function TaskNotesBar({
  notes,
  onAgregar,
  onBorrar,
}: {
  notes: TaskNote[];
  onAgregar: (cuerpo: string) => void;
  onBorrar: (id: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [historialAbierto, setHistorialAbierto] = useState(false);

  useCloseOnEscape(() => setHistorialAbierto(false), historialAbierto);

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    onAgregar(limpio);
    setTexto('');
    // No se cierra el historial al enviar: asi la nota nueva aparece arriba y
    // esto se lee como una conversacion, no como un formulario.
  };

  return (
    <>
      {historialAbierto &&
        createPortal(
          <>
            {/* Velo transparente: cierra al tocar afuera, sin oscurecer nada. */}
            <div
              className="fixed inset-0 z-[190]"
              onClick={() => setHistorialAbierto(false)}
              aria-hidden="true"
            />

            <div
              role="dialog"
              aria-label="Historial de notas"
              className="fixed bottom-[44px] left-0 right-[var(--ls-rail-width)] z-[200] flex max-h-[min(52vh,340px)] flex-col rounded-t-lg border-x border-t border-line bg-surface shadow-float animate-slide-up"
            >
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
                <p className="text-micro font-semibold text-ink-secondary">
                  Historial · {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                </p>
                <IconButton
                  icon={<Icon.Close />}
                  label="Cerrar el historial"
                  size="sm"
                  onClick={() => setHistorialAbierto(false)}
                />
              </div>

              <div className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto overscroll-contain px-3">
                {notes.map((nota) => (
                  <div key={nota.id} className="flex items-start gap-2 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block whitespace-pre-wrap text-body text-ink">
                        {nota.cuerpo}
                      </span>
                      {/* La fecha es lo que hace que una nota signifique algo:
                          "llamé y no contestó" sin cuándo no dice nada. */}
                      <span className="mt-0.5 block text-micro text-ink-muted">
                        {formatearFechaHora(nota.createdAt)}
                      </span>
                    </span>
                    <IconButton
                      icon={<Icon.Trash />}
                      label="Borrar la nota"
                      size="sm"
                      variant="ghost-danger"
                      onClick={() => onBorrar(nota.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}

      <div className="fixed bottom-0 left-0 right-[var(--ls-rail-width)] z-40 flex items-center gap-1.5 border-t border-line bg-surface px-2 py-1.5 shadow-bar">
        {/*
          Con cero notas no es un boton: es un icono inerte. Nada que abrir, y
          asi se esquiva un deshabilitado que ademas dejaria el texto ilegible.
        */}
        {notes.length > 0 ? (
          <button
            type="button"
            onClick={() => setHistorialAbierto((estaba) => !estaba)}
            aria-expanded={historialAbierto}
            title="Ver el historial de notas"
            aria-label={`Ver el historial de ${notes.length} notas`}
            className="flex h-control-sm shrink-0 items-center gap-1 rounded-md px-2 text-micro tabular-nums text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:h-2.5 [&_svg]:w-2.5"
          >
            {historialAbierto ? <Icon.ChevronDown /> : <Icon.ChevronUp />}
            {notes.length}
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-control-sm w-7 shrink-0 items-center justify-center text-ink-muted [&_svg]:h-2.5 [&_svg]:w-2.5"
          >
            <Icon.ChevronUp />
          </span>
        )}

        {/*
          Un renglon, no un area de varias lineas. Es la misma leccion del
          compositor del chat: en 336px un campo de dos filas se come media
          pantalla, y una nota es un apunte.
        */}
        <Input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key !== 'Enter') return;
            evento.preventDefault();
            enviar();
          }}
          placeholder="Anotá lo que pasó…"
          aria-label="Nueva nota"
          className="h-control-sm flex-1 text-chat"
        />

        <IconButton
          icon={<Icon.Send />}
          label="Guardar la nota"
          size="sm"
          shape="circle"
          /* Sin texto va en `ghost`, nunca en primary deshabilitado: eso deja el
             rotulo en 1.04:1. Es el mismo criterio del boton de envio. */
          variant={texto.trim() ? 'primary' : 'ghost'}
          onClick={enviar}
        />
      </div>
    </>
  );
}
