import type { Lead } from '../types';
import { STATE } from '../config/colors';

/**
 * LISTAS AUTOMATICAS
 *
 * Listas que no se arman a mano: su contenido lo decide una regla y se
 * actualizan solas.
 *
 * ## Que se saco, y por que no rompe nada
 *
 * Habia 17, repartidas en cuatro grupos: Sistema, Sistema de Salud, Isapres y
 * Edad. Quedan las tres de Sistema; las otras catorce se retiraron a pedido.
 *
 * Las tres que se van dependian de `metadata.raw_payload` -`sistema_actual`,
 * `isapre_especifica`, `rango_edad`-, o sea de la forma que traia una carga
 * concreta. No son propiedades del modelo de lead: son campos sueltos de un
 * origen de datos, y una lista que se apoya en eso queda vacia en cuanto la
 * carga cambia de forma, sin que nada lo avise.
 *
 * Quitarlas es seguro para quien ya las tuviera encendidas: `ListsPage` resuelve
 * cada id activo contra este catalogo y descarta los que no encuentra
 * (`filter(Boolean)`). Un id guardado que ya no existe simplemente deja de
 * pintarse; no hay error ni lista rota. Lo unico que queda es el id huerfano en
 * los ajustes, que no molesta a nadie.
 */
export const SMART_LIST_DEFS = [
  { id: 'smart_nuevos', name: 'Nuevos', color: '#10b981', category: 'Sistema' },
  { id: 'smart_sin_gestion', name: 'Sin Gestión', color: STATE.warning, category: 'Sistema' },
  { id: 'smart_eliminados', name: 'Eliminados', color: STATE.danger, category: 'Sistema' },
];

export function getSmartListLeads(smartListId: string, activeLeads: Lead[], deletedLeads: Lead[]): Lead[] {
  switch (smartListId) {
    case 'smart_nuevos':
      return activeLeads.filter(l => l.status === 'nuevo');

    case 'smart_sin_gestion': {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      return activeLeads.filter(l =>
        (l.status === 'nuevo' || l.status === 'contactado') &&
        new Date(l.updatedAt) < fiveDaysAgo
      );
    }

    case 'smart_eliminados':
      return deletedLeads;

    /*
     * Un id que ya no existe -por ejemplo uno de los grupos retirados que
     * quedara guardado en los ajustes- cae aca y devuelve vacio en vez de
     * fallar. `ListsPage` ademas ni siquiera llega a pedirlo, porque descarta
     * los ids sin definicion antes.
     */
    default:
      return [];
  }
}
