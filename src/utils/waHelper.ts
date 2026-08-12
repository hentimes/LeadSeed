import type { Lead } from '../types';
import { getSettings } from '../services/appSettingsService';
// eslint-disable-next-line no-restricted-imports -- DEUDA BLOQUE 5: importa la implementacion de plataforma en vez de recibirla inyectada. Ver roadmap 13.6.
import { webDeeplink, webMessageBus } from '../platform/web';

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

export function replaceVariables(text: string, lead: Lead): string {
  return text
    .replace(/\{nombre\}/gi, lead.name)
    .replace(/\{name\}/gi, lead.name)
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
  if (pref === 'web' && webMessageBus.isAvailable()) {
    await webMessageBus.send({ type: 'OPEN_WHATSAPP_WEB', payload: { phone, message } });
    return;
  }

  webDeeplink.openExternal(buildWhatsAppUrl(phone, message, pref));
}

export function openWhatsAppForLeads(
  leads: Lead[],
  template: string
): void {
  for (const lead of leads) {
    const msg = replaceVariables(template, lead);
    openWhatsApp(lead.phone, msg);
  }
}
