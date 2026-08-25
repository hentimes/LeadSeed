export interface LeadList {
  id?: number;
  name: string;
  color: string;
  createdAt: string;
  /**
   * Descripcion corta, maximo 25 caracteres. Solo se muestra en la pagina de
   * Listas: es para acordarse de que va cada una, no un campo de notas. El
   * limite tambien esta en la base de datos (migracion 117).
   */
  description?: string;
}

/** Debe coincidir con la restriccion `lead_lists_description_length`. */
export const MAX_LIST_DESCRIPTION = 25;
