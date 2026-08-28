/**
 * Redimensiona y recomprime una imagen en el navegador, via canvas.
 *
 * Lo que sale de aca es lo unico que se sube: no se guarda el archivo original
 * de mayor resolucion. Por eso el resultado sirve tanto para la miniatura como
 * para la vista ampliada -- ya viene liviano.
 *
 * ## Las tres palancas para que pese menos
 *
 * 1. **El tamano.** Es la que mas rinde y la que mas se subestima: el peso
 *    escala con el AREA, no con el ancho. Bajar de 1920 a 1280 px no quita un
 *    33% del peso, quita un 56%.
 * 2. **El formato.** AVIF pesa entre un 30% y un 50% menos que WebP a la misma
 *    calidad percibida. No todos los navegadores lo saben CODIFICAR aunque lo
 *    sepan mostrar, asi que se prueba y se comprueba (ver `intentarCodificar`).
 * 3. **La calidad.** Es la ultima que se toca, porque es la unica que se nota.
 *
 * ## Cuanta resolucion hace falta de verdad
 *
 * Esto es una extension que vive en el panel lateral de Chrome. El contenedor
 * de imagen mas ancho que existe son 548px CSS (ventana maxima 628, menos 48
 * del rail, menos los rellenos). A 2x de densidad eso son 1096px reales.
 *
 * Por eso el tope es 1280 y no 1920: 1280 cubre 2x con margen, y 1920 seria
 * 2,25 veces el peso para pixeles que ninguna pantalla llega a mostrar. Las
 * densidades de 3x son de telefono, y esto no corre en telefono.
 */

/** Tope por lado. Ver el calculo de arriba. */
const MAX_DIMENSION = 1280;
const CALIDAD_INICIAL = 0.82;

/**
 * Calidades a probar cuando el resultado se pasa del presupuesto de bytes.
 *
 * Se baja de a poco y se para en 0.55: por debajo de eso los artefactos se ven
 * en las capturas de pantalla con texto, que es lo que la gente pega en un foro
 * de trabajo.
 */
export const ESCALERA_DE_CALIDAD = [0.75, 0.68, 0.6, 0.55];

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface CompressOptions {
  /** Tope por lado, en pixeles. */
  maxDimension?: number;
  /** Calidad del primer intento, entre 0 y 1. */
  quality?: number;
  /**
   * Peso maximo deseado. Si el primer intento se pasa, se reintenta bajando la
   * calidad. Es un objetivo, no una garantia: si ni con la calidad mas baja
   * entra, se devuelve el mejor intento en vez de fallar.
   */
  targetBytes?: number;
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

/**
 * Tamano final respetando la proporcion. Nunca agranda: una imagen chica se
 * deja como esta, porque escalarla hacia arriba solo suma peso.
 */
export function scaledSize(
  width: number,
  height: number,
  maxDimension = MAX_DIMENSION
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/**
 * Codifica el lienzo y **comprueba que salio en el formato pedido**.
 *
 * La comprobacion no es paranoia: cuando `toBlob` recibe un tipo que no sabe
 * codificar, la especificacion dice que caiga a PNG en silencio. Un PNG de una
 * foto de 1280px pesa varias veces mas que el WebP que se queria. Sin mirar
 * `blob.type`, pedir AVIF en un navegador que no lo codifica haria las imagenes
 * MAS pesadas, que es justo lo contrario de lo que se busca.
 */
async function intentarCodificar(
  canvas: HTMLCanvasElement,
  tipo: string,
  calidad: number
): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, tipo, calidad);
  });

  if (!blob || blob.type !== tipo) return null;
  return blob;
}

/**
 * Elige el candidato mas liviano entre AVIF y WebP.
 *
 * Se comparan de verdad en vez de confiar en que AVIF siempre gana: con
 * imagenes muy chicas o de pocos colores, la cabecera de AVIF puede costar mas
 * de lo que ahorra.
 */
async function codificarMasLiviano(
  canvas: HTMLCanvasElement,
  calidad: number
): Promise<Blob | null> {
  const [avif, webp] = await Promise.all([
    intentarCodificar(canvas, 'image/avif', calidad),
    intentarCodificar(canvas, 'image/webp', calidad),
  ]);

  if (avif && webp) return avif.size <= webp.size ? avif : webp;
  return avif ?? webp;
}

/**
 * Comprime la imagen al formato mas liviano que soporte el navegador.
 *
 * El nombre conserva "Webp" porque es lo que devuelve en la mayoria de los
 * navegadores de hoy y porque lo llaman varios sitios; el tipo real del
 * resultado esta en `blob.type` y es lo que hay que usar al subirlo.
 */
export async function compressImageToWebp(
  file: File,
  options: CompressOptions = {}
): Promise<CompressedImage> {
  const { maxDimension = MAX_DIMENSION, quality = CALIDAD_INICIAL, targetBytes } = options;

  const img = await loadImage(file);
  const { width, height } = scaledSize(img.naturalWidth, img.naturalHeight, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(img, 0, 0, width, height);

  let mejor = await codificarMasLiviano(canvas, quality);
  if (!mejor) throw new Error('No se pudo convertir la imagen');

  /*
   * Solo se reintenta si hay presupuesto Y el primer intento se paso. Sin
   * presupuesto -que es como lo usa el chat- esto no se ejecuta nunca y el
   * comportamiento es el mismo de siempre.
   */
  if (targetBytes && mejor.size > targetBytes) {
    for (const calidad of ESCALERA_DE_CALIDAD) {
      if (calidad >= quality) continue;

      const intento = await codificarMasLiviano(canvas, calidad);
      if (!intento) continue;

      mejor = intento;
      if (intento.size <= targetBytes) break;
    }
  }

  return { blob: mejor, width, height };
}
