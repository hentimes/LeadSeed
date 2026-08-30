import { Button, Modal } from '../../design';
import type { EnrichedLog } from '../../services/historyService';
import { formatearFechaHora } from '../../utils/date';

/**
 * EL MENSAJE QUE SE ENVIO
 *
 * Modal chico, de una sola cosa: mostrar el texto. Sin acciones, sin edicion,
 * sin navegacion a la plantilla.
 *
 * ## Por que existe
 *
 * El historial pintaba el nombre de la plantilla como un enlace subrayado, o
 * sea la cosa mas clicable de la fila, y al tocarlo **no pasaba nada**. El
 * motivo era concreto y estaba a la vista: `openTemplate` hacia
 * `Number(log.templateId)` y cortaba con `Number.isFinite`, pero `template_id`
 * es un uuid. `Number('a3f2-...')` da `NaN`, `isFinite(NaN)` da false, y la
 * funcion volvia sin hacer nada. En todos los casos, siempre.
 *
 * Ahora ese enlace hace lo unico que alguien esperaria: abre el mensaje.
 *
 * ## Lo que se muestra es la COPIA, no la plantilla
 *
 * `content` se escribe en el momento del envio (migracion 106), con las
 * variables ya sustituidas y con la edicion temporal que se haya hecho al
 * enviar. Por eso sobrevive a que la plantilla se edite o se borre despues, que
 * es justo lo que se pidio.
 *
 * Los envios anteriores a esa migracion no tienen copia. Ahi se dice que no se
 * guardo, en vez de mostrar la plantilla viva haciendola pasar por el mensaje:
 * seria afirmar algo que no se sabe.
 */
export function SendHistoryMessageModal({
  log,
  onClose,
}: {
  log: EnrichedLog;
  onClose: () => void;
}) {
  const hayTexto = Boolean(log.templateContenido);

  return (
    <Modal onClose={onClose} maxWidth="320px" label={`Mensaje enviado a ${log.leadName}`}>
      <div className="flex flex-col gap-2 p-3">
        <div>
          <p className="truncate text-body font-semibold text-ink">
            {log.leadName || 'Sin nombre'}
          </p>
          {/*
            La fecha y la plantilla en una linea de servicio. La plantilla se
            nombra pero NO es un enlace: desde un modal que existe para leer un
            texto, mandar al usuario a otra seccion es perder el sitio donde
            estaba.
          */}
          <p className="truncate text-micro text-ink-secondary">
            {formatearFechaHora(log.sentAt)} · {log.templateNombre}
          </p>
        </div>

        {hayTexto ? (
          /*
            `max-h` con scroll propio y `overscroll-contain`: un mensaje largo no
            puede estirar el modal fuera de la pantalla, y al llegar al final del
            texto el scroll no debe seguir moviendo lo de atras.
          */
          <div className="max-h-[46vh] overflow-y-auto overscroll-contain rounded-md bg-surface-sunken p-2.5">
            {log.isHtml ? (
              /*
                Los correos son HTML y se pintan como HTML, igual que ya hace la
                ficha del lead (`LeadDetailHistory`). `break-words` porque un
                correo maquetado a 600px no cabe en 336 y sin esto desborda en
                silencio: los scrollbars estan ocultos en todo el producto.
              */
              <div
                className="text-meta text-ink [&_*]:max-w-full [&_img]:h-auto break-words"
                dangerouslySetInnerHTML={{ __html: log.templateContenido }}
              />
            ) : (
              <p className="whitespace-pre-wrap break-words text-meta text-ink">
                {log.templateContenido}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md bg-surface-sunken px-2.5 py-4 text-center">
            <p className="text-meta text-ink-secondary">
              Este envío no guardó una copia del mensaje.
            </p>
            <p className="mt-1 text-micro text-ink-secondary">
              Se registró antes de que la aplicación empezara a guardarlas.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
