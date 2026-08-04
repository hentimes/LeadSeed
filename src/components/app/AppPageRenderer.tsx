import { lazy, Suspense, type ReactNode } from 'react';
import { primaryRoutes, secondaryRoutes } from '../../config/routes';
import type { ColumnDef } from '../ColumnSelector';
import type { Page } from '../../types';
import AppStatusScreen from './AppStatusScreen';
import { PageShell } from '../../design';

const LeadsPage = lazy(() => import('../../pages/LeadsPage'));
const ListsPage = lazy(() => import('../../pages/ListsPage'));
const TemplatesPage = lazy(() => import('../../pages/TemplatesPage'));
const SendPage = lazy(() => import('../../pages/SendPage'));
const SendHistoryPage = lazy(() => import('../../pages/SendHistoryPage'));
const TasksPage = lazy(() => import('../../pages/TasksPage'));
const DashboardPage = lazy(() => import('../../pages/DashboardPage'));
const PipelinePage = lazy(() => import('../../pages/PipelinePage'));
const AgendaPage = lazy(() => import('../../pages/AgendaPage'));
const SettingsPage = lazy(() => import('../../pages/SettingsPage'));
const CommunityPage = lazy(() => import('../../pages/CommunityPage'));
const ChatPage = lazy(() => import('../../pages/ChatPage'));
const AdminLayout = lazy(() => import('../../pages/admin/AdminLayout'));

/**
 * Ancho de contenido por seccion.
 *
 * Antes cada pagina definia el suyo (max-w-2xl, 4xl, 5xl, 6xl o ninguno),
 * por eso el contenido no quedaba alineado al cambiar de seccion. El
 * armazon vive aca, no en cada pagina.
 */
const PAGE_WIDTH: Partial<Record<Page, 'full' | 'md' | 'lg'>> = {
  leads: 'full',
  dashboard: 'full',
  pipeline: 'full',
  admin: 'full',
  chat: 'full',
  agenda: 'md',
  settings: 'md',
  tasks: 'lg',
  lists: 'lg',
  templates: 'lg',
  send: 'lg',
  history: 'lg',
  community: 'lg',
};

/**
 * El chat y la comunidad necesitan una altura fija (ver PageShell.fillHeight)
 * para que solo su panel de mensajes/lista scrollee, en vez de crecer con el
 * contenido como el resto de las paginas.
 */
const PAGE_FILL_HEIGHT: Partial<Record<Page, boolean>> = {
  chat: true,
  community: true,
};

interface HighlightTemplate {
  type: 'whatsapp' | 'email' | 'call';
  id: number;
}

interface AppPageRendererProps {
  page: Page;
  compactMode: boolean;
  darkMode: boolean;
  visibleCols: ColumnDef[];
  highlightTemplate: HighlightTemplate | null;
  isAdmin: boolean;
  hasFeature: (feature: string) => boolean;
  onNavigate: (page: Page) => void;
  onTasksChanged: () => Promise<void>;
  onCompactModeChange: (value: boolean) => void;
  onDarkModeChange: (value: boolean) => void;
  onColsChange: (cols: ColumnDef[]) => void;
  onClearHighlightTemplate: () => void;
  onHighlightTemplate: (template: HighlightTemplate) => void;
  /** Publicacion a abrir al entrar a Comunidad, por una mencion del chat. */
  pendingCommunityPostId?: string | null;
  onOpenCommunityPost: (postId: string) => void;
  onCommunityPostOpened: () => void;
}

const lockIcon = (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppStatusScreen className="h-full p-8" title="Cargando modulo..." />}>
      {children}
    </Suspense>
  );
}

export default function AppPageRenderer({
  page,
  compactMode,
  darkMode,
  visibleCols,
  highlightTemplate,
  isAdmin,
  hasFeature,
  onNavigate,
  onTasksChanged,
  onCompactModeChange,
  onDarkModeChange,
  onColsChange,
  onClearHighlightTemplate,
  onHighlightTemplate,
  pendingCommunityPostId,
  onOpenCommunityPost,
  onCommunityPostOpened,
}: AppPageRendererProps) {
  const routeDef = [...primaryRoutes, ...secondaryRoutes].find((route) => route.page === page);

  if (routeDef?.requiredFeature && !isAdmin && !hasFeature(routeDef.requiredFeature)) {
    return (
      <AppStatusScreen
        tone="warning"
        className="p-8 h-full"
        title="Funcionalidad no disponible"
        icon={lockIcon}
        description={
          <>
            Tu plan actual no incluye acceso a <strong>{routeDef.label}</strong>. Contacta al administrador
            para mejorar tu plan o solicitar una prueba gratuita.
          </>
        }
      />
    );
  }

  let pageContent: ReactNode;

  switch (page) {
    case 'leads':
      pageContent = (
        <LeadsPage
          compactMode={compactMode}
          visibleCols={visibleCols}
          onColsChange={onColsChange}
          onNavigate={onNavigate}
        />
      );
      break;
    case 'lists':
      pageContent = <ListsPage />;
      break;
    case 'templates':
      pageContent = <TemplatesPage highlightTemplate={highlightTemplate} onClearHighlight={onClearHighlightTemplate} />;
      break;
    case 'send':
      pageContent = <SendPage />;
      break;
    case 'history':
      pageContent = (
        <SendHistoryPage
          onNavigate={onNavigate}
          onViewTemplate={(type, id) => {
            onHighlightTemplate({ type, id });
            onNavigate('templates');
          }}
        />
      );
      break;
    case 'tasks':
      pageContent = <TasksPage onTasksChanged={onTasksChanged} />;
      break;
    case 'dashboard':
      pageContent = <DashboardPage onNavigate={onNavigate} />;
      break;
    case 'pipeline':
      pageContent = <PipelinePage />;
      break;
    case 'agenda':
      pageContent = <AgendaPage onNavigate={onNavigate} />;
      break;
    case 'settings':
      pageContent = (
        <SettingsPage
          compactMode={compactMode}
          onCompactModeChange={onCompactModeChange}
          darkMode={darkMode}
          onDarkModeChange={onDarkModeChange}
          visibleCols={visibleCols}
          onColsChange={onColsChange}
        />
      );
      break;
    case 'community':
      pageContent = (
        <CommunityPage
          initialPostId={pendingCommunityPostId}
          onInitialPostConsumed={onCommunityPostOpened}
        />
      );
      break;
    case 'chat':
      pageContent = (
        <ChatPage
          onMentionClick={(mention) => {
            if (mention.kind === 'post') onOpenCommunityPost(mention.id);
          }}
        />
      );
      break;
    case 'admin':
      pageContent = <AdminLayout />;
      break;
    default:
      pageContent = <LeadsPage compactMode={compactMode} visibleCols={visibleCols} />;
  }

  return (
    <PageSuspense>
      <PageShell maxWidth={PAGE_WIDTH[page] || 'lg'} fillHeight={PAGE_FILL_HEIGHT[page]}>
        {pageContent}
      </PageShell>
    </PageSuspense>
  );
}
