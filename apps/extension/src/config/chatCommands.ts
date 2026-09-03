import type { MentionSuggestion } from '../types/mentions';

/**
 * Comandos de moderacion del chat.
 *
 * Los cuatro existian desde antes, pero no se veian en ninguna parte: habia
 * que saberselos de memoria o encontrarlos en el marcador de posicion, que
 * ademas solo mencionaba uno. Listarlos al escribir `@` es lo mismo que ya
 * hace el chat con las personas.
 *
 * Los cuatro se interpretan solo al principio del mensaje, asi que el
 * autocompletado no los ofrece cuando el `@` va en mitad de una frase.
 * `ChatRoom` es quien los ejecuta; aqui solo se describen.
 */
export interface ChatCommandDef {
  /** Sin la arroba: es la palabra que dispara el comando. */
  name: string;
  hint: string;
}

export const CHAT_COMMANDS: ChatCommandDef[] = [
  { name: 'todos', hint: 'Enviar el mensaje como anuncio a toda la sala' },
  { name: 'silenciar', hint: 'Congelar la sala durante un tiempo' },
  { name: 'limpiar', hint: 'Borrar los mensajes, salvo fijados, destacados y guardados' },
  { name: 'purgar', hint: 'Borrar todo el historial de la sala' },
];

/**
 * Se calcula una sola vez: el hook de autocompletado la recibe como
 * dependencia y un array nuevo en cada render lo recalcularia siempre.
 */
export const CHAT_COMMAND_SUGGESTIONS: MentionSuggestion[] = CHAT_COMMANDS.map(
  ({ name, hint }) => ({ kind: 'command', id: name, label: name, hint }),
);
