import { useEffect, useState } from 'react';
import { validateAttachmentSize } from '../services/chatAttachmentsService';

/**
 * Archivo adjunto elegido pero aun no enviado, con su previsualizacion.
 *
 * Extraido de `ChatRoom.tsx`, que con 1097 lineas concentraba el mayor riesgo
 * de mantenibilidad del repositorio. Es una unidad coherente: tres estados que
 * solo tienen sentido juntos, mas la gestion del `object URL`, que es la parte
 * facil de romper.
 *
 * Se saca completo y no a medias precisamente por eso: la URL de la
 * previsualizacion hay que revocarla en tres momentos distintos (al limpiar, al
 * reemplazar por otro archivo y al desmontar), y repartir esa responsabilidad
 * entre el hook y su consumidor es como se filtra memoria.
 */
export interface PendingAttachment {
  file: File | null;
  previewUrl: string | null;
  /** Mensaje de validacion, o cadena vacia si el archivo es aceptable. */
  error: string;
  select(file: File | undefined): void;
  clear(): void;
}

export function usePendingAttachment(): PendingAttachment {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const clear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError('');
  };

  const select = (candidato: File | undefined) => {
    if (!candidato) return;

    const problema = validateAttachmentSize(candidato);
    if (problema) {
      // El archivo anterior se conserva: rechazar uno nuevo por tamaño no debe
      // hacer perder el que ya estaba listo para enviar.
      setError(problema);
      return;
    }

    setError('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(candidato);
    // Solo las imagenes tienen previsualizacion; para el resto basta el nombre.
    setPreviewUrl(candidato.type.startsWith('image/') ? URL.createObjectURL(candidato) : null);
  };

  useEffect(() => {
    // Tambien al desmontar, no solo al reemplazar: si el usuario cierra la sala
    // con un adjunto elegido, la URL quedaria reteniendo el archivo en memoria.
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return { file, previewUrl, error, select, clear };
}

/**
 * Huella de un adjunto para el control anti-spam.
 *
 * Cuando el mensaje va sin texto, el guard necesita algo no vacio que evaluar.
 * Se usa nombre y tamaño y no un valor fijo, para no confundir dos fotos
 * distintas enviadas seguidas con un duplicado.
 *
 * El prefijo era un emoji de clip, prohibido por el protocolo 10.1.a: era un
 * centinela escrito en codigo, no contenido que eligiera un usuario. Se
 * sustituye por una marca ASCII; el valor solo se compara consigo mismo, asi
 * que el cambio no altera el comportamiento del guard.
 */
export function buildAttachmentFingerprint(file: File): string {
  return `file:${file.name}:${file.size}`;
}
