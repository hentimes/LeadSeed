import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMentionAutocomplete } from './useMentionAutocomplete';
import { CHAT_COMMAND_SUGGESTIONS } from '../config/chatCommands';

// El directorio en linea consulta Supabase. Aqui interesa el filtrado de
// sugerencias, no de donde salen las personas.
vi.mock('./useOnlineDirectory', () => ({
  useOnlineDirectory: () => ({
    users: [{ id: 'u1', full_name: 'Ana Perez', email: 'ana@example.com', avatar_url: null }],
    loading: false,
  }),
  displayName: () => 'Ana Perez',
  avatarFor: () => 'https://example.com/a.png',
}));

function montar(commands = CHAT_COMMAND_SUGGESTIONS) {
  const estado = { text: '', cursor: 0 };
  const { result, rerender } = renderHook(() =>
    useMentionAutocomplete({
      text: estado.text,
      commands,
      onTextChange: (text, cursor) => {
        estado.text = text;
        estado.cursor = cursor;
      },
    }),
  );

  const escribir = (text: string) => {
    estado.text = text;
    rerender();
    act(() => result.current.syncFromInput(text, text.length));
  };

  return { result, estado, escribir };
}

const etiquetas = (sugerencias: { label: string }[]) => sugerencias.map((s) => s.label);

describe('useMentionAutocomplete con comandos de moderacion', () => {
  it('ofrece todos los comandos al abrir el mensaje con una arroba', () => {
    const { result, escribir } = montar();

    escribir('@');

    expect(etiquetas(result.current.suggestions)).toEqual(
      expect.arrayContaining(['todos', 'silenciar', 'limpiar', 'purgar']),
    );
  });

  it('filtra los comandos por lo que se lleva escrito', () => {
    const { result, escribir } = montar();

    escribir('@li');

    expect(etiquetas(result.current.suggestions)).toContain('limpiar');
    expect(etiquetas(result.current.suggestions)).not.toContain('purgar');
  });

  /*
   * Los cuatro comandos solo se interpretan al principio del mensaje, asi que
   * ofrecerlos en mitad de una frase seria prometer algo que no va a pasar.
   */
  it('no ofrece comandos cuando la arroba va en mitad del mensaje', () => {
    const { result, escribir } = montar();

    escribir('hola @');

    expect(etiquetas(result.current.suggestions)).not.toContain('limpiar');
    expect(etiquetas(result.current.suggestions)).toContain('Ana Perez');
  });

  it('no ofrece comandos a quien no puede moderar', () => {
    const { result, escribir } = montar([]);

    escribir('@');

    expect(etiquetas(result.current.suggestions)).toEqual(['Ana Perez']);
  });

  it('escribe el comando tal cual y lo deja listo para enviar', () => {
    const { result, estado, escribir } = montar();
    escribir('@lim');

    const comando = result.current.suggestions.find((s) => s.label === 'limpiar');
    act(() => result.current.select(comando!));

    expect(estado.text).toBe('@limpiar ');
    // El gatillo compara con el texto recortado, asi que el espacio sobra.
    expect(estado.text.trim()).toBe('@limpiar');
  });

  /*
   * Un comando no apunta a ningun registro: si se guardara como mencion
   * resuelta, al enviar se convertiria en `@[limpiar](user:...)` y dejaria de
   * disparar la accion.
   */
  it('un comando no se serializa como mencion', () => {
    const { result, estado, escribir } = montar();
    escribir('@purgar');

    const comando = result.current.suggestions.find((s) => s.label === 'purgar');
    act(() => result.current.select(comando!));

    expect(result.current.serialize(estado.text)).toBe('@purgar ');
  });
});
