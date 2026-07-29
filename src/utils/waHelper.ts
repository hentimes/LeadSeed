import type { Lead } from '../types';

/**
 * Normaliza un número de teléfono chileno a formato +569XXXXXXXX.
 * Reglas:
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

export function openWhatsApp(phone: string, message: string = ''): void {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'OPEN_WHATSAPP_WEB',
      payload: { phone, message }
    }).catch(console.error);
  } else {
    const clean = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    window.open(`https://web.whatsapp.com/send?phone=${clean}&text=${encoded}`, '_blank');
  }
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
