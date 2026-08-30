import type { Feature, Lead, Plan, PlanFeature, Profile, UserFeatureOverride } from '../../types';
import AdminSupportChat from './AdminSupportChat';
import AdminUserActivity from './AdminUserActivity';
import AdminUserData from './AdminUserData';
import AdminUserHeader from './AdminUserHeader';
import AdminUserLicenses from './AdminUserLicenses';
import { CountBadge } from './CountBadge';
import { Section } from '../../design';

/** Las secciones del acordeon. `null` = todas cerradas. */
export type UserSection = 'licencias' | 'datos' | 'actividad' | null;

const ICONOS = {
  licencias: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 12l2 2 4-4" />
      <path d="M12 3l7 4v5c0 4.5-3 8.3-7 9-4-0.7-7-4.5-7-9V7z" />
    </svg>
  ),
  datos: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  ),
  actividad: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
};

interface Props {
  selectedUser: Profile;
  plan?: Plan;
  plans: Plan[];
  features: Feature[];
  planFeatures: PlanFeature[];
  userOverrides: UserFeatureOverride[];
  profiles: Profile[];
  isAdmin: boolean;
  isOnline: boolean;
  unreadMessages: number;
  newLeadCount: number;
  liveInsertedLead: Lead | null;
  dataRefreshKey: number;
  openSection: UserSection;
  onToggleSection: (section: Exclude<UserSection, null>) => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onUpdatePlan: (planId: string) => void;
  onAssignFeature: (featureId: string, days?: number) => void;
  onRemoveFeature: (featureId: string) => void;
}

/**
 * La ficha del usuario observado.
 *
 * Tenia ocho pestanas en pastillas de colores -azul, rojo, indigo, naranja-
 * que no cabian en el panel y desbordaban en horizontal. Quedan tres secciones
 * desplegables y el chat, que se abre a pantalla completa desde la cabecera.
 *
 * ## Por que el chat no es una seccion mas
 *
 * Es la unica vista con conversacion en curso: necesita todo el alto
 * disponible y que el scroll sea suyo. Metido en un acordeon, cada mensaje
 * nuevo empujaria el resto de la ficha, y volver arriba costaria un scroll
 * largo. Asi que sustituye al acordeon en vez de convivir con el.
 *
 * ## Que ve un helper
 *
 * Solo el chat. Antes veia tambien las licencias, la telemetria, el heatmap y
 * la base de leads de cualquier usuario que abriera desde un ticket.
 */
export default function AdminUserDetail({
  selectedUser,
  plan,
  plans,
  features,
  planFeatures,
  userOverrides,
  profiles,
  isAdmin,
  isOnline,
  unreadMessages,
  newLeadCount,
  liveInsertedLead,
  dataRefreshKey,
  openSection,
  onToggleSection,
  isChatOpen,
  onToggleChat,
  onUpdatePlan,
  onAssignFeature,
  onRemoveFeature,
}: Props) {
  // El helper no tiene ficha que mirar: entra por un ticket y va al chat.
  const soloChat = !isAdmin || isChatOpen;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface">
      <AdminUserHeader
        profile={selectedUser}
        plan={plan}
        isOnline={isOnline}
        unreadMessages={unreadMessages}
        isChatOpen={soloChat}
        onToggleChat={onToggleChat}
      />

      {soloChat ? (
        <div className="min-h-0 flex-1">
          <AdminSupportChat selectedUser={selectedUser} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          <Section
            icon={ICONOS.licencias}
            title="Licencias"
            isOpen={openSection === 'licencias'}
            onToggle={() => onToggleSection('licencias')}
          >
            <AdminUserLicenses
              selectedUser={selectedUser}
              plans={plans}
              features={features}
              planFeatures={planFeatures}
              userOverrides={userOverrides}
              onUpdatePlan={onUpdatePlan}
              onAssignFeature={onAssignFeature}
              onRemoveFeature={onRemoveFeature}
            />
          </Section>

          <Section
            icon={ICONOS.datos}
            title="Datos"
            badge={<CountBadge count={newLeadCount} tone="info" label="leads nuevos sin revisar" />}
            isOpen={openSection === 'datos'}
            onToggle={() => onToggleSection('datos')}
          >
            <AdminUserData
              selectedUser={selectedUser}
              profiles={profiles}
              newLeadCount={newLeadCount}
              liveInsertedLead={liveInsertedLead}
              realtimeRefreshKey={dataRefreshKey}
            />
          </Section>

          <Section
            icon={ICONOS.actividad}
            title="Actividad"
            isOpen={openSection === 'actividad'}
            onToggle={() => onToggleSection('actividad')}
          >
            <AdminUserActivity selectedUser={selectedUser} />
          </Section>
        </div>
      )}
    </div>
  );
}
