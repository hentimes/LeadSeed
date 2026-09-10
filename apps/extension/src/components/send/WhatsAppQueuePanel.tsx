import { Badge, Button, Panel } from '../../design';
import type { WhatsAppQueueState } from '../../hooks/useWhatsAppQueue';
import { SalidaDeCola } from './SalidaDeCola';
import type { AccionesDeSalida } from '../../types';

interface Props {
  cola: WhatsAppQueueState;
  /**
   * Marcar al de turno sin mandarle nada: que no tiene WhatsApp, o que pidio
   * no recibir mas mensajes.
   *
   * Es opcional porque las dos necesitan una inscripcion de flujo a la que
   * colgar la salida, y el envio masivo de "Enviar" no tiene ninguna: ahi un
   * destinatario es solo un lead. Ver `useFlowBatchDispatch`.
   */
  acciones?: AccionesDeSalida;
}

/**
 * Barra de la cola de envio.
 *
 * Dice en todo momento a quien le toca y cuantos faltan. Sin esto el envio a
 * varios destinatarios era ciego: se abria un chat, no habia forma de saber
 * cual de los elegidos era ni cuantos quedaban, y los demas no se abrian nunca.
 */
export default function WhatsAppQueuePanel({ cola, acciones }: Props) {
  if (!cola.activa || !cola.actual) return null;

  const posicion = cola.indice + 1;
  const esUltimo = !cola.siguiente;

  return (
    <Panel tone={cola.error ? 'danger' : 'primary'}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge tone={cola.error ? 'danger' : 'primary'}>
            {posicion} de {cola.total}
          </Badge>
          <p className="min-w-0 flex-1 truncate text-micro font-semibold text-ink" title={cola.actual.lead.name}>
            {cola.actual.lead.name}
          </p>
        </div>

        <p className="text-micro text-ink-secondary" role="status">
          {cola.error
            ? cola.error
            : cola.abriendo
              ? 'Abriendo el chat...'
              : 'Envía el mensaje en WhatsApp y vuelve aquí para seguir.'}
        </p>

        {cola.siguiente && !cola.error && (
          <p className="truncate text-micro text-ink-muted">
            Sigue: {cola.siguiente.lead.name}
          </p>
        )}

        <div className="flex gap-2">
          {cola.error ? (
            <Button size="sm" variant="primary" onClick={() => void cola.reintentar()} disabled={cola.abriendo}>
              Reintentar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void cola.avanzar()}
              disabled={cola.abriendo}
            >
              {esUltimo ? 'Terminar envío' : 'Siguiente lead'}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={cola.terminar}>
            {esUltimo ? 'Cerrar' : 'Cancelar el resto'}
          </Button>
        </div>

        {/*
          `key` por lead: el formulario de la nota guarda su propio estado, y sin
          esto lo escrito para uno seguiria en pantalla cuando se abre el chat
          del siguiente.
        */}
        {acciones && (
          <SalidaDeCola
            key={cola.actual.lead.id ?? cola.indice}
            nombre={cola.actual.lead.name}
            bloqueado={cola.abriendo}
            onSinWhatsApp={acciones.onSinWhatsApp}
            onNoContactar={acciones.onNoContactar}
          />
        )}
      </div>
    </Panel>
  );
}
