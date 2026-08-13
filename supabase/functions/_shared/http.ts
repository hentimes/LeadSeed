/**
 * `fetch` con limite de tiempo.
 *
 * Sin esto, una llamada a Resend o a Google que nunca responde deja la Edge
 * Function colgada hasta que la mata la plataforma. Eso no es solo latencia:
 * durante ese rato la invocacion sigue ocupando recursos, y el usuario que
 * envio el formulario o guardo la cita no recibe ni exito ni error, se queda
 * mirando un spinner. Un fallo rapido y explicito es mejor que una espera
 * indefinida.
 *
 * El timeout se aplica a la respuesta de cabeceras, no a la descarga completa
 * del cuerpo. Para estas APIs, que devuelven JSON pequeño, la diferencia no
 * importa; si algun dia se usa para descargar un adjunto grande, hay que
 * revisarlo.
 *
 * Se respeta un `signal` que venga del llamador: si ya hay uno, se abortan los
 * dos motivos a la vez y no se pisa el suyo.
 */

/**
 * 15 segundos. Resend y Google responden en menos de dos en condiciones
 * normales, asi que este margen solo se alcanza cuando algo va realmente mal.
 * Queda por debajo del limite de ejecucion de una Edge Function a proposito:
 * la idea es fallar nosotros, con un mensaje util, antes de que nos corten.
 */
export const EXTERNAL_CALL_TIMEOUT_MS = 15_000

export class ExternalCallTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`La llamada a ${new URL(url).host} supero los ${timeoutMs} ms sin responder`)
    this.name = 'ExternalCallTimeoutError'
  }
}

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs: number = EXTERNAL_CALL_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  // Si el llamador ya traia su propio signal, se encadena: cancelar por
  // cualquiera de los dos motivos tiene que funcionar.
  const upstream = init.signal
  const onUpstreamAbort = () => controller.abort()
  upstream?.addEventListener('abort', onUpstreamAbort)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    // `AbortError` no distingue quien aborto. Si el llamador no aborto, fue el
    // reloj, y conviene decirlo con un mensaje que se entienda en un log.
    if (error instanceof DOMException && error.name === 'AbortError' && !upstream?.aborted) {
      throw new ExternalCallTimeoutError(input, timeoutMs)
    }
    throw error
  } finally {
    clearTimeout(timer)
    upstream?.removeEventListener('abort', onUpstreamAbort)
  }
}
