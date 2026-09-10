/**
 * TRADUCIR LOS RECHAZOS AL INSCRIBIR.
 *
 * La base rechaza una inscripcion por tres motivos que no son fallos: el lead
 * ya ocupa ese canal, pidio no recibir mas mensajes, o su numero no esta en
 * WhatsApp. Los tres llegan como excepciones de Postgres, con el identificador
 * del lead dentro y sin una tilde.
 *
 * Sin traducir, quien inscribe lee algo como
 *
 *   el lead 3f2a91c4-...-8b21 pidio no recibir mas mensajes
 *
 * que dice la verdad y no sirve para nada: el identificador no le dice a quien
 * se refiere, y el tono es el de una aplicacion rota.
 *
 * ## Por que un modulo aparte
 *
 * Porque las dos vias de inscripcion -de a uno y desde un paso- tienen que
 * traducir lo mismo, y porque asi se puede probar sin base de datos. Aqui no
 * hay red ni cliente de Supabase: entra un error, sale un texto.
 */

/** El SQLSTATE propio con el que la 185 marca "este lead esta marcado". */
const CODIGO_LEAD_MARCADO = 'LS001';

function codigoDe(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code ?? '')
    : '';
}

function textoDe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message ?? '');
  }
  return String(error ?? '');
}

/**
 * El mensaje que hay que mostrar, o `null` si el error no es de los conocidos.
 *
 * Devuelve `null` en vez de un texto generico a proposito: quien llama tiene
 * que poder distinguir "esto lo se explicar" de "esto es un fallo de verdad" y
 * dejar subir el segundo.
 */
export function mensajeDeRechazoAlInscribir(error: unknown): string | null {
  const codigo = codigoDe(error);
  const texto = textoDe(error);

  // El indice unico parcial de la 108. Llega como 23505 o como el nombre del
  // indice dentro del texto, segun por donde pase.
  if (codigo === '23505' || /una_activa_por_canal|duplicate key/i.test(texto)) {
    return 'Este lead ya está en otro flujo del mismo canal. Sácalo de ese primero.';
  }

  const marcado = codigo === CODIGO_LEAD_MARCADO || /^(no_contactar|sin_whatsapp):/.test(texto);
  if (!marcado) return null;

  // Los dos casos se distinguen por el texto y no por el codigo: comparten el
  // SQLSTATE justamente para que el bucle de la tanda pueda contarlos juntos
  // sin leer nada. Aqui, con un lead solo, leerlo no cuesta nada.
  if (/no.?contactar|no recibir mas mensajes/i.test(texto)) {
    return 'Este lead pidió no recibir más mensajes. Está en la lista "No contactar".';
  }

  return 'El número de este lead no está en WhatsApp. Está en la lista "Sin WhatsApp".';
}
