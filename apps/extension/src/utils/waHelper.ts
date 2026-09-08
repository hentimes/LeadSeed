import type { Lead } from '../types';
import { getSettings } from '../services/appSettingsService';
import { getPlatform } from '../platform/registry';
import { nombreCorto } from './leadDisplay';

/**
 *   - < 9 dígitos → rechazar
 *   - 9 dígitos → debe empezar con 9 → +569 + últimos 8
 *   - 10 dígitos → rechazar (no es formato chileno válido)
 *   - 11 dígitos → debe empezar con 569 → +569 + últimos 8
 *   - > 11 dígitos → rechazar
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 9 || digits.length > 11) return '';
  if (digits.length === 10) return '';
  if (digits.length === 9 && digits[0] !== '9') return '';
  if (digits.length === 11 && !digits.startsWith('569')) return '';
  return `+569${digits.slice(-8)}`;
}

/**
 * `{nombre}` ES EL NOMBRE CORTO, no el nombre completo.
 *
 * En la base los leads vienen del registro civil o de un padron, asi que el
 * nombre suele ser "Henry Jose Daniel Farias Pacheco". Puesto tal cual en un
 * saludo de WhatsApp, el mensaje arranca con "Hola Henry Jose Daniel Farias
 * Pacheco": nadie escribe asi, y el destinatario lee de inmediato que eso lo
 * mando una maquina, que es justo lo que un mensaje de contacto en frio no se
 * puede permitir.
 *
 * La regla de abreviar -nombre de pila + apellido paterno- ya existia y ya
 * estaba probada en `leadDisplay.nombreCorto`, que es la que usan las tablas de
 * leads y de listas. Se reutiliza para que el nombre con el que se saluda a
 * alguien sea el mismo con el que aparece en pantalla.
 *
 * El nombre completo no se pierde: queda en `{nombrecompleto}`, para el correo
 * formal o el documento donde si hace falta entero.
 */
export function replaceVariables(text: string, lead: Lead): string {
  const completo = lead.name ?? '';
  const corto = nombreCorto(completo);
  return text
    // Antes que `{nombre}` por claridad. No compiten: `\{nombre\}` exige la
    // llave de cierre pegada, asi que nunca muerde `{nombrecompleto}`.
    .replace(/\{nombre[_ ]?completo\}/gi, completo)
    .replace(/\{fullname\}/gi, completo)
    .replace(/\{nombre\}/gi, corto)
    .replace(/\{name\}/gi, corto)
    .replace(/\{telefono\}/gi, lead.phone)
    .replace(/\{phone\}/gi, lead.phone)
    .replace(/\{email\}/gi, lead.email)
    .replace(/\{correo\}/gi, lead.email)
    .replace(/\{empresa\}/gi, lead.company)
    .replace(/\{company\}/gi, lead.company)
    .replace(/\{rut\}/gi, lead.rut)
    .replace(/\{notas\}/gi, lead.notes)
    .replace(/\{notes\}/gi, lead.notes);
}

/**
 * Construye la URL de WhatsApp segun la preferencia del usuario.
 *
 * Es logica de dominio y se queda aca: que URL corresponde a cada preferencia
 * no depende de la plataforma. Lo unico que se delega al puerto es el acto de
 * abrirla.
 */
export function buildWhatsAppUrl(
  phone: string,
  message: string,
  preference: 'web' | 'app',
): string {
  const clean = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);

  // `api.whatsapp.com` es el protocolo universal: lanza la app si esta
  // instalada. `web.whatsapp.com` fuerza el cliente web.
  const host = preference === 'app' ? 'api.whatsapp.com' : 'web.whatsapp.com';

  return `https://${host}/send?phone=${clean}&text=${encoded}`;
}

export async function openWhatsApp(phone: string, message: string = ''): Promise<void> {
  const settings = await getSettings();
  const pref = settings.whatsappClientPreference || 'web';

  // Con preferencia `web` y un proceso de fondo disponible, se delega en el:
  // reutiliza una pestaña de WhatsApp Web ya abierta en vez de abrir una nueva
  // por cada lead, que es lo que pasaria con `openExternal`.
  if (pref === 'web' && getPlatform().messageBus.isAvailable()) {
    await getPlatform().messageBus.send({ type: 'OPEN_WHATSAPP_WEB', payload: { phone, message } });
    return;
  }

  getPlatform().deeplink.openExternal(buildWhatsAppUrl(phone, message, pref));
}

/**
 * Sustituye `{motivo}` por el texto elegido en el envio.
 *
 * A diferencia del resto de variables, esta no sale del lead: sale de un
 * catalogo y es la misma para todos los destinatarios de un envio. Si no se
 * eligio ninguno, el token se deja intacto, que es lo que ya hace
 * `replaceVariables` con cualquier variable que no sabe resolver.
 */
export function applyReason(text: string, motivo?: string): string {
  return motivo ? text.replace(/\{motivo\}/gi, motivo) : text;
}

/** Un destinatario con el texto ya resuelto para el. */
export interface LeadMessage {
  lead: Lead;
  message: string;
}

/**
 * Resuelve el texto una vez por destinatario.
 *
 * Existe para que el mensaje que se abre y el que se guarda en el historial
 * sean **el mismo objeto**, no dos resoluciones paralelas del mismo texto. Si
 * cada uno lo resolviera por su cuenta, bastaria con que uno cambiara para que
 * el historial empezara a mentir sin que nada fallara.
 */
export function buildLeadMessages(
  leads: Lead[],
  template: string,
  motivo?: string
): LeadMessage[] {
  // El motivo se resuelve antes que las variables del lead y es igual para
  // todos: se elige una vez por envio, no por destinatario.
  const base = applyReason(template, motivo);
  return leads.map((lead) => ({ lead, message: replaceVariables(base, lead) }));
}

/**
 * Abre WhatsApp con textos ya resueltos, de a uno y esperando a cada uno.
 *
 * El bucle no esperaba, y `abrirWhatsAppWeb` del proceso de fondo **reutiliza
 * siempre la misma pestana**: con seis destinatarios salian seis peticiones a
 * la vez que se pisaban en esa unica pestana y solo sobrevivia la ultima en
 * cargar. El historial, en cambio, ya habia registrado los seis como enviados.
 *
 * Esperar arregla la carrera, pero no convierte esto en un envio masivo: cada
 * mensaje sigue necesitando que una persona pulse enviar dentro de WhatsApp.
 * Para varios destinatarios se usa la cola guiada de `useWhatsAppQueue`, que
 * abre el siguiente cuando el anterior ya se envio.
 */
export async function openWhatsAppMessages(mensajes: LeadMessage[]): Promise<void> {
  for (const { lead, message } of mensajes) {
    await openWhatsApp(lead.phone, message);
  }
}

export async function openWhatsAppForLeads(leads: Lead[], template: string): Promise<void> {
  await openWhatsAppMessages(buildLeadMessages(leads, template));
}
