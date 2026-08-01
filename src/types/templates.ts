export interface WhatsAppTemplate {
  id?: string | number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  contenido: string;
  leadIds: string[];            // leads asignados directamente
  leadListIds: number[];        // listas de leads asignadas
  createdAt: string;
}

export interface WhatsAppTemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface EmailTemplate {
  id?: string | number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  asunto: string;
  contenido: string;
  isHtml: boolean;
  leadIds: string[];            // leads asignados directamente
  leadListIds: number[];        // listas de leads asignadas
  createdAt: string;
}

export interface EmailTemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface CallTemplate {
  id?: string | number;
  templateListIds: number[];   // N:M - múltiples categorías
  nombre: string;
  contenido: string;            // el script de la llamada
  leadIds: string[];            // leads asignados directamente
  leadListIds: number[];        // listas de leads asignadas
  createdAt: string;
}

export interface CallTemplateList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
}
