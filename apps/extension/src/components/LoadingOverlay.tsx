import { createPortal } from 'react-dom';

interface Props {
  message?: string;
  isFullScreen?: boolean;
}

export default function LoadingOverlay({ message = 'Cargando...', isFullScreen = false }: Props) {
  const containerClasses = isFullScreen
    ? "fixed inset-0 z-[100] flex items-center justify-center bg-surface/80 backdrop-blur-sm"
    : "flex flex-col items-center justify-center w-full min-h-[40vh] p-8";

  const content = (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-primary"></div>
        <p className="text-sm font-medium text-ink-secondary">{message}</p>
      </div>
    </div>
  );

  if (isFullScreen) {
    return createPortal(content, document.body);
  }

  return content;
}
