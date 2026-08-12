/**
 * Redimensiona y convierte una imagen a WebP en el navegador, via canvas.
 *
 * Lo que sale de aca es lo unico que se sube: no se guarda el archivo
 * original de mayor resolucion. Por eso el resultado sirve tanto para la
 * miniatura del chat como para la vista ampliada -- ya viene liviano.
 */

const MAX_DIMENSION = 1280;
const WEBP_QUALITY = 0.82;

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

function scaledSize(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }

  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function compressImageToWebp(file: File): Promise<CompressedImage> {
  const img = await loadImage(file);
  const { width, height } = scaledSize(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY);
  });

  if (!blob) throw new Error('No se pudo convertir la imagen a WebP');

  return { blob, width, height };
}
