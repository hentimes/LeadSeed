import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildAttachmentFingerprint, usePendingAttachment } from './usePendingAttachment';

vi.mock('../services/chatAttachmentsService', () => ({
  validateAttachmentSize: (file: File) =>
    file.size > 5_000_000 ? 'El archivo supera el limite permitido.' : '',
}));

/** `happy-dom` no implementa las URL de objeto; se sustituyen para poder contar. */
let creadas: string[] = [];
let revocadas: string[] = [];

beforeEach(() => {
  creadas = [];
  revocadas = [];
  let n = 0;
  globalThis.URL.createObjectURL = vi.fn(() => {
    n += 1;
    const url = `blob:falsa/${n}`;
    creadas.push(url);
    return url;
  });
  globalThis.URL.revokeObjectURL = vi.fn((url: string) => {
    revocadas.push(url);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function archivo(nombre: string, tipo: string, tamano = 1000): File {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: tamano });
  return f;
}

describe('usePendingAttachment', () => {
  test('arranca sin archivo ni error', () => {
    const { result } = renderHook(() => usePendingAttachment());

    expect(result.current.file).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.error).toBe('');
  });

  test('acepta un archivo valido', () => {
    const { result } = renderHook(() => usePendingAttachment());

    act(() => result.current.select(archivo('doc.pdf', 'application/pdf')));

    expect(result.current.file?.name).toBe('doc.pdf');
    expect(result.current.error).toBe('');
  });

  test('genera previsualizacion solo para imagenes', () => {
    const { result } = renderHook(() => usePendingAttachment());

    act(() => result.current.select(archivo('foto.png', 'image/png')));
    expect(result.current.previewUrl).toBe('blob:falsa/1');

    act(() => result.current.clear());
    act(() => result.current.select(archivo('doc.pdf', 'application/pdf')));
    expect(result.current.previewUrl).toBeNull();
  });

  test('rechaza un archivo demasiado grande y conserva el anterior', () => {
    // Rechazar uno nuevo no debe hacer perder el que ya estaba listo.
    const { result } = renderHook(() => usePendingAttachment());

    act(() => result.current.select(archivo('bueno.pdf', 'application/pdf')));
    act(() => result.current.select(archivo('enorme.pdf', 'application/pdf', 9_000_000)));

    expect(result.current.error).toContain('limite');
    expect(result.current.file?.name).toBe('bueno.pdf');
  });

  test('ignora una seleccion vacia, que es lo que da cancelar el dialogo', () => {
    const { result } = renderHook(() => usePendingAttachment());

    act(() => result.current.select(archivo('foto.png', 'image/png')));
    act(() => result.current.select(undefined));

    expect(result.current.file?.name).toBe('foto.png');
  });

  describe('gestion de la URL de objeto', () => {
    test('revoca la anterior al reemplazar una imagen por otra', () => {
      const { result } = renderHook(() => usePendingAttachment());

      act(() => result.current.select(archivo('a.png', 'image/png')));
      act(() => result.current.select(archivo('b.png', 'image/png')));

      expect(revocadas).toContain('blob:falsa/1');
      expect(result.current.previewUrl).toBe('blob:falsa/2');
    });

    test('revoca al limpiar', () => {
      const { result } = renderHook(() => usePendingAttachment());

      act(() => result.current.select(archivo('a.png', 'image/png')));
      act(() => result.current.clear());

      expect(revocadas).toContain('blob:falsa/1');
      expect(result.current.file).toBeNull();
    });

    test('revoca al desmontar, que es el caso que mas se olvida', () => {
      const { result, unmount } = renderHook(() => usePendingAttachment());

      act(() => result.current.select(archivo('a.png', 'image/png')));
      unmount();

      expect(revocadas).toContain('blob:falsa/1');
    });

    test('no queda ninguna URL creada sin revocar', () => {
      const { result, unmount } = renderHook(() => usePendingAttachment());

      act(() => result.current.select(archivo('a.png', 'image/png')));
      act(() => result.current.select(archivo('b.png', 'image/png')));
      act(() => result.current.select(archivo('c.png', 'image/png')));
      unmount();

      // Se comprueba que ninguna quede viva, no que los conteos coincidan:
      // cada URL se revoca dos veces, una en `select` al reemplazarla y otra en
      // la limpieza del efecto. Es redundante pero inofensivo, porque revocar
      // una URL ya revocada es una operacion nula. Quitar cualquiera de las dos
      // llamadas si abriria un hueco: sin la de `select` no se libera al
      // reemplazar, y sin la del efecto no se libera al desmontar.
      for (const url of creadas) {
        expect(revocadas, `sin revocar: ${url}`).toContain(url);
      }
    });
  });

  test('limpiar tambien borra el error', () => {
    const { result } = renderHook(() => usePendingAttachment());

    act(() => result.current.select(archivo('enorme.pdf', 'application/pdf', 9_000_000)));
    act(() => result.current.clear());

    expect(result.current.error).toBe('');
  });
});

describe('buildAttachmentFingerprint', () => {
  test('distingue dos archivos con distinto nombre', () => {
    expect(buildAttachmentFingerprint(archivo('a.png', 'image/png'))).not.toBe(
      buildAttachmentFingerprint(archivo('b.png', 'image/png')),
    );
  });

  test('distingue dos archivos con igual nombre y distinto tamaño', () => {
    // El caso que motiva la huella: dos fotos seguidas no deben verse como
    // duplicado para el control anti-spam.
    expect(buildAttachmentFingerprint(archivo('foto.png', 'image/png', 100))).not.toBe(
      buildAttachmentFingerprint(archivo('foto.png', 'image/png', 200)),
    );
  });

  test('es estable para el mismo archivo', () => {
    const f = archivo('foto.png', 'image/png');
    expect(buildAttachmentFingerprint(f)).toBe(buildAttachmentFingerprint(f));
  });

  test('no contiene emojis: el protocolo 10.1.a los prohibe en codigo', () => {
    const huella = buildAttachmentFingerprint(archivo('foto.png', 'image/png'));

    expect(huella).toMatch(/^[\x20-\x7E]+$/);
    expect(huella).toContain('file:');
  });
});
