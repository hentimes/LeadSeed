import { IconButton } from '../../design';
import { Icon } from '../../utils/icons';
import type { EnrichedLog } from '../../services/historyService';

/** Como se dice y se dibuja cada canal. */
const CANAL: Record<string, { rotulo: string; icono: () => JSX.Element }> = {
  whatsapp: { rotulo: 'WhatsApp', icono: Icon.Messages },
  email: { rotulo: 'Email', icono: Icon.Email },
  call: { rotulo: 'Llamada', icono: Icon.Phone },
};

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * UNA LINEA DEL HISTORIAL
 *
 * ## El canal, por forma y no por color
 *
 * Eran pastillas con fondo de color y las letras "WP"/"EM"/"LLAMADA". El
 * contraste del texto dentro de la pastilla estaba bien -lo medi: 6.49:1 el
 * verde, 7.15 el azul-, pero el problema era otro: como no tienen variante
 * oscura, en modo oscuro esos pasteles dan **15.85:1 contra el fondo**. O sea
 * que la pastilla pesaba mas que el nombre del lead. Ocho filas eran ocho
 * manchas gritando, y el dato que importa quedaba debajo.
 *
 * Ahora es un icono monocromo en `ink-secondary`. Globo, sobre y auricular son
 * tres siluetas muy distintas, asi que se leen igual en escala de grises y con
 * cualquier daltonismo. Contraste 5.96 en claro y 6.79 en oscuro, muy por
 * encima del 3:1 que pide un elemento no textual.
 *
 * ## La lapida
 *
 * Se pidio "cursiva y gris". La cursiva se respeta; el gris **no puede ser
 * `ink-muted`**, y esto lo medi porque no era evidente: da 4.45 en claro y
 * **4.08 en oscuro sobre una fila con hover**, o sea que falla AA justo cuando
 * el cursor esta encima, que es cuando se la esta mirando. Va en
 * `ink-secondary`, que sigue siendo gris y da 5.56 / 6.13 en ese mismo caso.
 *
 * La distancia con una fila viva la hacen el tamano y la cursiva, no la
 * claridad del gris.
 *
 * Y la senal principal no es ninguna de las dos: es **la palabra "eliminado"**.
 * Por eso el truncado se lo come el NOMBRE y nunca el final de la linea.
 */
export function SendHistoryRow({
  log,
  onAbrirMensaje,
  onEliminar,
  onRestaurar,
}: {
  log: EnrichedLog;
  onAbrirMensaje: (log: EnrichedLog) => void;
  onEliminar: (log: EnrichedLog) => void;
  onRestaurar: (log: EnrichedLog) => void;
}) {
  const canal = CANAL[log.templateType];

  if (log.deletedAt) {
    return (
      <div className="flex h-row-dense items-center gap-2 border-b border-line px-2.5 last:border-0">
        <span
          aria-hidden="true"
          className="flex w-3.5 shrink-0 justify-center text-ink-secondary [&_svg]:h-3 [&_svg]:w-3"
        >
          <Icon.Trash />
        </span>

        {/*
          `min-w-0` en el hueco del nombre y NADA de truncate en "eliminado": si
          la linea se acorta, lo que cede es el nombre. La palabra que dice el
          estado tiene que sobrevivir siempre.
        */}
        <p className="flex min-w-0 flex-1 items-baseline gap-1 text-meta italic text-ink-secondary">
          <span className="shrink-0 tabular-nums">{fechaCorta(log.sentAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="min-w-0 truncate">Mensaje enviado a {log.leadName || 'sin nombre'}</span>
          <span className="shrink-0">eliminado</span>
        </p>

        <IconButton
          icon={<Icon.Restore />}
          label={`Restaurar el envío a ${log.leadName || 'sin nombre'}`}
          size="sm"
          onClick={() => onRestaurar(log)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-row-dense items-center gap-2 border-b border-line px-2.5 transition-colors last:border-0 hover:bg-surface-hover">
      <span
        title={canal?.rotulo}
        aria-label={canal?.rotulo}
        className="flex w-3.5 shrink-0 justify-center text-ink-secondary [&_svg]:h-3 [&_svg]:w-3"
      >
        {canal?.icono() ?? null}
      </span>

      <span className="max-w-[42%] shrink-0 truncate text-meta font-medium text-ink">
        {log.leadName || 'Sin nombre'}
      </span>

      {/*
        El enlace al mensaje. Es el nombre de la plantilla, que es lo que el
        usuario ya reconoce, y abre la copia de lo que se envio.

        Cuando no hay plantilla -el chat abierto a mano desde la ficha del
        lead- no se pinta como enlace: seria prometer algo que abrir.
      */}
      {log.templateContenido ? (
        <button
          type="button"
          onClick={() => onAbrirMensaje(log)}
          title={`Ver el mensaje enviado a ${log.leadName}`}
          className="min-w-0 flex-1 truncate text-left text-meta text-primary-ink underline decoration-line-strong underline-offset-2 transition-colors hover:decoration-current"
        >
          {log.templateNombre}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-meta text-ink-secondary">
          {log.templateNombre}
        </span>
      )}

      {/* Programado: el reloj y el color van sobre la FECHA, que es el dato que
          la programacion modifica. Antes era la palabra "Prog." suelta. */}
      {log.scheduledFor && (
        <span aria-hidden="true" className="shrink-0 text-accent [&_svg]:h-2.5 [&_svg]:w-2.5">
          <Icon.Clock />
        </span>
      )}
      <span
        className={`shrink-0 text-micro tabular-nums ${log.scheduledFor ? 'text-accent' : 'text-ink-secondary'}`}
      >
        {fechaCorta(log.sentAt)}
      </span>

      <IconButton
        icon={<Icon.Trash />}
        label={`Eliminar del historial el envío a ${log.leadName || 'sin nombre'}`}
        size="sm"
        variant="ghost-danger"
        onClick={() => onEliminar(log)}
      />
    </div>
  );
}
