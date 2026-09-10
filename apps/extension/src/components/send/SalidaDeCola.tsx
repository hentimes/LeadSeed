import { useState } from 'react';
import { Button, Input } from '../../design';
import { getPlatform } from '../../platform/registry';
import { LARGO_MAXIMO_NOTA_DE_SALIDA } from '../../types';

export interface AccionesDeSalida {
  /** El numero abierto no esta en WhatsApp. */
  onSinWhatsApp: () => Promise<void>;
  /** Pidio no recibir mas mensajes. La nota es el detalle, puede ir vacia. */
  onNoContactar: (nota: string) => Promise<void>;
}

interface Props extends AccionesDeSalida {
  /** Nombre de a quien le toca, para poder preguntar por el en el dialogo. */
  nombre: string;
  /** Mientras se abre un chat no se puede marcar nada. */
  bloqueado: boolean;
}

/**
 * LAS DOS SALIDAS DE UNA RONDA DE ENVIO.
 *
 * ## Por que viven aqui y no en la lista
 *
 * Las dos cosas se descubren con el chat abierto delante y no antes: que el
 * numero no tiene WhatsApp lo dice WhatsApp Web en un dialogo suyo, y que la
 * persona no quiere mas mensajes lo dice ella misma en la conversacion. En una
 * ronda de cuarenta y ocho, cerrarla para ir a buscar el lead en otra pantalla
 * significa no marcarlo nunca.
 *
 * ## Por que una pregunta y la otra no
 *
 * "No tiene WhatsApp" pregunta antes: deshace un registro de envio y marca al
 * lead para siempre, y desde la extension no hay como devolverlo. Un clic de
 * mas en el 5% de los casos es barato comparado con eso.
 *
 * "No quiere mas mensajes" no pregunta, porque su formulario ya es la pausa: no
 * se puede confirmar sin haber mirado lo que se escribe.
 *
 * ## Por que la nota se puede dejar vacia
 *
 * Porque obligar a escribir algo produce puntos y equis. El campo esta para
 * quien tiene algo que decir; la fecha y el motivo se guardan igual.
 */
export function SalidaDeCola({ nombre, bloqueado, onSinWhatsApp, onNoContactar }: Props) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [nota, setNota] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const marcarSinWhatsApp = async () => {
    const confirmado = await getPlatform().dialogs.confirm(
      'Este mensaje deja de contar: sale del cupo de hoy y del historial. El lead sale de sus flujos de WhatsApp y va a la lista "Sin WhatsApp". Su correo y sus llamadas no se tocan.',
      {
        title: `¿El número de ${nombre} no está en WhatsApp?`,
        confirmLabel: 'Marcar y seguir',
      },
    );
    if (!confirmado) return;

    setOcupado(true);
    try {
      await onSinWhatsApp();
    } finally {
      setOcupado(false);
    }
  };

  const sacar = async () => {
    setOcupado(true);
    try {
      await onNoContactar(nota);
    } finally {
      setOcupado(false);
    }
  };

  if (escribiendo) {
    return (
      <div className="flex flex-col gap-2 border-t border-line-soft pt-2">
        <label className="text-micro text-ink-secondary" htmlFor="nota-de-salida">
          ¿Qué pasó? Queda guardado con el lead.
        </label>
        <Input
          id="nota-de-salida"
          value={nota}
          maxLength={LARGO_MAXIMO_NOTA_DE_SALIDA}
          placeholder="Opcional. Por ejemplo: pidió que lo llame en marzo"
          onChange={(e) => setNota(e.target.value)}
          disabled={ocupado}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="danger" onClick={() => void sacar()} disabled={ocupado}>
            Sacar del flujo
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setEscribiendo(false); setNota(''); }}
            disabled={ocupado}
          >
            Cancelar
          </Button>
          {/* El contador solo aparece cuando queda poco: antes de eso es ruido. */}
          {nota.length > LARGO_MAXIMO_NOTA_DE_SALIDA - 15 && (
            <span className="ml-auto text-micro text-ink-muted">
              {LARGO_MAXIMO_NOTA_DE_SALIDA - nota.length}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft pt-2">
      <button
        type="button"
        onClick={() => void marcarSinWhatsApp()}
        disabled={bloqueado || ocupado}
        className="text-micro text-ink-secondary underline underline-offset-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        No tiene WhatsApp
      </button>
      <button
        type="button"
        onClick={() => setEscribiendo(true)}
        disabled={bloqueado || ocupado}
        className="text-micro text-ink-secondary underline underline-offset-2 hover:text-state-danger-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        No quiere más mensajes
      </button>
    </div>
  );
}
