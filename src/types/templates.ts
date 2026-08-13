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

/**
 * Cualquiera de las tres plantillas.
 *
 * `TemplatesPage` muestra los tres canales en la misma pantalla y su estado es
 * heterogeneo por pestaña. Tenerlo escrito como union es lo que evita el
 * `any[]` que habia antes: `asunto` e `isHtml` existen solo en las de correo,
 * y el compilador obliga a comprobarlo antes de leerlos.
 */
export type AnyTemplate = WhatsAppTemplate | EmailTemplate | CallTemplate;

/** Lista de categorias de cualquiera de los tres canales. Los tres coinciden. */
export type AnyTemplateList = WhatsAppTemplateList | EmailTemplateList | CallTemplateList;

/**
 * Lo que el editor de plantillas necesita para editar una, sea del canal que
 * sea. Es un subconjunto deliberado: no arrastra `leadIds`, `leadListIds` ni
 * `createdAt`, que el editor no toca.
 *
 * `id` es numerico aqui aunque en las plantillas sea `string | number`: el
 * editor solo trabaja con las que ya vienen de la base, que tienen id numerico.
 */
export interface EditableTemplate {
  id?: number;
  nombre: string;
  contenido: string;
  asunto?: string;
  isHtml?: boolean;
  templateListIds?: number[];
}
