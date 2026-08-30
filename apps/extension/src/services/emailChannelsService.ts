import {
  createResendChannel,
  deleteEmailChannel,
  listEmailChannels as listEmailChannelRows,
  updateEmailChannel,
  type CreateResendChannelInput,
  type UpdateEmailChannelInput,
} from '../repositories/emailChannelsRepository';
import type { EmailChannelSummary } from '../types';

/**
 * Capa de servicio de canales de correo.
 *
 * Existia el repositorio pero no el servicio, asi que la UI llamaba al
 * repositorio directo, saltandose una capa. Este modulo cierra esa
 * frontera: la UI habla con servicios, no con la base.
 */

export async function listChannels(): Promise<EmailChannelSummary[]> {
  return listEmailChannelRows();
}

/** Solo los canales utilizables para enviar. */
export async function listActiveChannels(): Promise<EmailChannelSummary[]> {
  const channels = await listEmailChannelRows();
  return channels.filter((channel) => channel.isActive);
}

export async function createChannel(input: CreateResendChannelInput): Promise<EmailChannelSummary> {
  return createResendChannel(input);
}

export async function updateChannel(input: UpdateEmailChannelInput): Promise<EmailChannelSummary> {
  return updateEmailChannel(input);
}

export async function removeChannel(id: string): Promise<void> {
  return deleteEmailChannel(id);
}
