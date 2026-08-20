import type { Lead } from '../types';
import { normalizePhone } from './waHelper';

/**
 * Si un lead se puede contactar por un canal.
 *
 * Existe porque el envio masivo listaba **todos** los leads sin mirar el canal:
 * se podia marcar para WhatsApp a alguien sin telefono, o para correo a alguien
 * sin correo. La fila lo insinuaba -ponia "Sin telefono" debajo del nombre- pero
 * la casilla se dejaba marcar igual, y el envio salia con destinatarios que no
 * podian recibir nada.
 *
 * El modal de inscripcion a flujos ya filtraba asi desde el principio. Esto
 * lleva el mismo criterio al resto.
 */

/** Los canales por los que se envia. Las llamadas usan el telefono, como WhatsApp. */
export type CanalContacto = 'whatsapp' | 'call' | 'email';

/**
 * Telefono utilizable.
 *
 * Se apoya en `normalizePhone`, que ya tiene las reglas del pais -nueve digitos
 * empezando en 9, u once empezando en 569- y devuelve cadena vacia cuando el
 * numero no encaja. Reimplementar la comprobacion aqui seria tener dos
 * definiciones de "telefono valido" que se separarian a la primera correccion.
 */
export function tieneTelefonoValido(lead: Pick<Lead, 'phone'>): boolean {
  return normalizePhone(lead.phone ?? '') !== '';
}

/**
 * Correo utilizable.
 *
 * Comprobacion deliberadamente corta: algo, arroba, algo, punto, algo, sin
 * espacios. No se persigue el RFC 5322 -que admite comillas, comentarios y
 * direcciones IP entre corchetes- porque aqui el objetivo no es certificar que
 * la direccion exista, sino no intentar un envio a "juan" o a "juan@".
 * Un correo bien formado que no exista lo rechaza el proveedor, y eso ya se
 * registra en el historial.
 */
export function tieneCorreoValido(lead: Pick<Lead, 'email'>): boolean {
  const correo = (lead.email ?? '').trim();
  if (/\s/.test(correo)) return false;
  return /^[^@]+@[^@.]+(\.[^@.]+)+$/.test(correo);
}

/** Si el lead puede recibir por ese canal. */
export function puedeRecibirPor(lead: Pick<Lead, 'phone' | 'email'>, canal: CanalContacto): boolean {
  return canal === 'email' ? tieneCorreoValido(lead) : tieneTelefonoValido(lead);
}

/** Como se llama el dato que falta, para explicarselo a quien mira. */
export const DATO_DEL_CANAL: Record<CanalContacto, string> = {
  whatsapp: 'teléfono',
  call: 'teléfono',
  email: 'correo',
};
