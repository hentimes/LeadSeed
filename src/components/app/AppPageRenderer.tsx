import { lazy, Suspense, type ReactNode } from 'react';
import { primaryRoutes, secondaryRoutes } from '../../config/routes';
import type { ColumnDef } from '../../types';
import type { Page } from '../../types';
import AppStatusScreen from './AppStatusScreen';
import { PageShell } from '../../design';
import PageTabs from '../layout/PageTabs';
import { grupoDePagina } from '../../config/pageTabGroups';

const LeadsPage = lazy(() => import('../../pages/LeadsPage'));
const ListsPage = lazy(() => import('../../pages/ListsPage'));
const TemplatesPage = lazy(() => import('../../pages/TemplatesPage'));
const SendPage = lazy(() => import('../../pages/SendPage'));
const FlowsPage = lazy(() => import('../../pages/FlowsPage'));
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
  flows: 'lg',
  send: 'lg',
  history: 'lg',
  community: 'lg',
};

/**
 * Encabezado de pagina, cuando lo hay.
 *
 * La mayoria de las secciones no lleva: la barra superior ya dice en cual
 * estas, y repetirlo dentro solo gasta alto en un panel angosto. Plantillas es
 * la excepcion porque su descripcion aporta algo que el nombre no dice.
 *
 * Hasta el 2026-08-13 esto lo resolvia `components/ui/PageHeader.tsx`, un
 * segundo encabezado con su propia escala (24px en negrita) que convivia con
 * el del sistema (17px). Plantillas era la unica pagina que lo usaba, o sea la
 * unica con un titulo grande en toda la extension. Se elimino ese componente y
 * el encabezado pasa por PageShell, que es el que ya envuelve a todas.
 */
/**
 * Vacio a proposito desde el `2026-08-16`.
 *
 * Plantillas era su unica entrada, y repetia lo que la barra superior ya dice
 * ("Plantillas de Mensaje"): dos titulos para la misma pagina, 44px de alto en
 * una columna donde solo caben tres plantillas. El mecanismo se conserva para
 * la pagina que algun dia necesite un encabezado propio; `hasHeader` en
 * PageShell ya contempla que no haya ninguno.
 */
const PAGE_HEADER: Partial<Record<Page, { title: string; description?: string }>> = {};

/**
 * El chat y la comunidad necesitan una altura fija (ver PageShell.fillHeight)
 * para que solo su panel de mensajes/lista scrollee, en vez de crecer con el
 * contenido como el resto de las paginas.
 */
const PAGE_FILL_HEIGHT: Partial<Record<Page, boolean>> = {
  chat: true,
  community: true,
  /*
   * Admin se suma el 2026-08-24. Es un master-detail: la lista y el detalle
   * scrollean cada uno por su cuenta, y para eso el contenedor tiene que medir
   * lo que hay disponible. Sin esto, el `h-full` que ya escribia AdminLayout se
   * resolvia contra un padre de alto automatico -o sea, no hacia nada- y la
   * pagina crecia hacia abajo hasta donde llegara la lista de usuarios.
   */
  admin: true,
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
    case 'flows':
      pageContent = <FlowsPage />;
      break;
    case 'send':
      pageContent = <SendPage onNavigate={onNavigate} />;
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

  /*
   * La barra del grupo se pinta aca y no en cada pagina.
   *
   * Este componente ya decide el ancho, el encabezado y la altura de cada
   * seccion; poner la barra en las tres paginas del grupo serian tres copias
   * y tres oportunidades de que se desalineen. Va dentro del `PageShell` para
   * que herede su ancho maximo y su relleno.
   */
  const grupo = grupoDePagina(page);

  return (
    <PageSuspense>
      <PageShell
        maxWidth={PAGE_WIDTH[page] || 'lg'}
        fillHeight={PAGE_FILL_HEIGHT[page]}
        title={PAGE_HEADER[page]?.title}
        description={PAGE_HEADER[page]?.description}
      >
        {grupo && (
          <PageTabs
            group={grupo}
            currentPage={page}
            onNavigate={onNavigate}
            hasFeature={hasFeature}
          />
        )}
        {pageContent}
      </PageShell>
    </PageSuspense>
  );
}
