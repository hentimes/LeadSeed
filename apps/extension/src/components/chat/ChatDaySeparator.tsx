/**
 * Marca de cambio de dia en la lista de mensajes.
 *
 * Antes no habia ninguna: un mensaje de las 09:14 se veia igual fuera de hoy o
 * de hace tres semanas, y al subir por el historial no habia forma de saber
 * donde estabas.
 *
 * Es `sticky` para que, mientras se recorre un dia largo, la fecha siga visible
 * arriba en vez de perderse al primer scroll.
 */
export default function ChatDaySeparator({ label }: { label: string }) {
  if (!label) return null;

  return (
    <div className="sticky top-0 z-10 flex justify-center py-1.5">
      <span className="rounded-full border border-line bg-surface/90 px-2.5 py-0.5 text-micro font-semibold uppercase tracking-wider text-ink-muted backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}
