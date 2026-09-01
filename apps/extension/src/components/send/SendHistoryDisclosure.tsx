import { useState } from 'react';
import type { SendLog } from '../../types';
import { Icon } from '../../utils/icons';
import { formatearFecha } from '../../utils/date';
import { Button, Modal } from '../../design';

/**
 * Historial de envios de la plantilla seleccionada.
 *
 * Compartido por WhatsApp y Email, que tenian el mismo bloque repetido.
 *
 * ## Por que en ventana y no desplegado en la pagina
 *
 * Era un `<details>` con la lista dentro, limitada a `max-h-40`. Esa lista no
 * para de crecer -una plantilla en uso lleva decenas de envios- y crecia justo
 * encima del compositor, empujando el mensaje y los destinatarios hacia abajo
 * en la pantalla donde se esta trabajando. En una ventana cabe entera, se lee
 * de un vistazo y se cierra sin dejar rastro en el layout.
 */
export function SendHistoryDisclosure({ log, templateName }: { log: SendLog[]; templateName?: string }) {
  const [abierto, setAbierto] = useState(false);

  if (log.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        icon={<Icon.History />}
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
      >
        Historial de esta plantilla ({log.length})
      </Button>

      {abierto && (
        <Modal onClose={() => setAbierto(false)} maxWidth="420px" label="Historial de esta plantilla">
          <div className="flex max-h-[80vh] flex-col">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-section-title font-semibold text-ink">Historial de envíos</h2>
              <p className="mt-0.5 truncate text-micro text-ink-muted">
                {templateName ? `${templateName} · ` : ''}
                {log.length} {log.length === 1 ? 'envío' : 'envíos'}
              </p>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 border-b border-line px-4 py-2 last:border-0"
                >
                  <span className="shrink-0 text-state-success">
                    <Icon.Check />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-micro text-ink">{entry.leadName}</span>
                  <span className="shrink-0 text-micro tabular-nums text-ink-muted">
                    {formatearFecha(entry.sentAt)}
                  </span>
                </div>
              ))}
            </div>

            <footer className="flex justify-end border-t border-line px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => setAbierto(false)}>
                Cerrar
              </Button>
            </footer>
          </div>
        </Modal>
      )}
    </>
  );
}
