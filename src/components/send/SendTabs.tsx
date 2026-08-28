import { ChannelSegmented } from '../channels/ChannelSegmented';
import type { SendChannel } from './channels';

/**
 * Canal del compositor de envio.
 *
 * El componente vive en `channels/ChannelSegmented`, compartido con Plantillas
 * y con el editor de Flujos. Aca solo se le pone el nombre accesible que
 * corresponde a esta pantalla: lo que se elige es por donde sale el mensaje.
 */
export function SendTabs({
  active,
  onChange,
}: {
  active: SendChannel;
  onChange: (channel: SendChannel) => void;
}) {
  return <ChannelSegmented active={active} onChange={onChange} label="Canal de envío" />;
}
