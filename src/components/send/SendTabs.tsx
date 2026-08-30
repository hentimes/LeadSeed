import type { ReactNode } from 'react';
import { ChannelSegmented } from '../channels/ChannelSegmented';
import type { SendChannel } from './channels';

/**
 * Canal del compositor de envio.
 *
 * El componente vive en `channels/ChannelSegmented`, compartido con Plantillas
 * y con el editor de Flujos. Aca solo se le pone el nombre accesible que
 * corresponde a esta pantalla: lo que se elige es por donde sale el mensaje.
 *
 * ## La ranura de la derecha
 *
 * `trailing` es para acciones de ESTA pantalla que van al final de la fila de
 * canales. Hoy la ocupa el Historial.
 *
 * Vive aqui y no en `ChannelSegmented` a proposito: ese componente lo comparten
 * Plantillas y el editor de Flujos, y una ranura ahi acabaria con cada
 * consumidor colgandole cosas distintas a una fila que existe para que el canal
 * se vea igual en los tres sitios.
 */
export function SendTabs({
  active,
  onChange,
  trailing,
}: {
  active: SendChannel;
  onChange: (channel: SendChannel) => void;
  trailing?: ReactNode;
}) {
  if (!trailing) {
    return <ChannelSegmented active={active} onChange={onChange} label="Canal de envío" />;
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ChannelSegmented active={active} onChange={onChange} label="Canal de envío" />
      {trailing}
    </div>
  );
}
