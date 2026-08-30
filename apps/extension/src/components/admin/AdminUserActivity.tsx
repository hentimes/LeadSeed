import type { Profile } from '../../types';
import AdminUserTelemetry from './AdminUserTelemetry';
import AdminUserHeatmap from './AdminUserHeatmap';
import AdminUserHelperStats from './AdminUserHelperStats';

/**
 * "Que hace este usuario": las tres lecturas que antes eran tres pestanas.
 *
 * Telemetria, mapa de interacciones y desempeno como helper no tienen ninguna
 * accion, no se editan y caben las tres en un scroll corto. Darle a cada una
 * un destino de navegacion propio era gastar tres huecos de la barra -en una
 * barra donde no cabian ni cuatro- para contenido que se lee de una pasada.
 */
export default function AdminUserActivity({ selectedUser }: { selectedUser: Profile }) {
  const esHelper = selectedUser.is_helper || selectedUser.role === 'admin';

  return (
    <div className="space-y-4">
      <AdminUserTelemetry selectedUser={selectedUser} />
      <AdminUserHeatmap selectedUser={selectedUser} />
      {esHelper && <AdminUserHelperStats selectedUser={selectedUser} />}
    </div>
  );
}
