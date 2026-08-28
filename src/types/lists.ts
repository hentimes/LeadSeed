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

/** Debe coincidir con la restriccion `lead_lists_description_length` (migracion 130). */
export const MAX_LIST_DESCRIPTION = 30;

/**
 * Debe coincidir con la restriccion `lead_lists_name_length` (migracion 129).
 *
 * 25 caracteres es lo que entra en una fila del panel: el nombre comparte la
 * linea con el punto de color, la descripcion y el contador de leads.
 */
export const MAX_LIST_NAME = 25;
