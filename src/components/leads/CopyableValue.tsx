import { useState } from 'react';

/**
 * Muestra un valor con un boton de copiar que aparece al pasar el mouse.
 *
 * El icono se superpone al final de la celda en vez de ocupar espacio
 * propio, para no descuadrar la grilla ni robarle ancho al contenido.
 */
export default function CopyableValue({ value, children }: { value: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  if (!value) return <>{children}</>;

  const copy = (event: React.MouseEvent) => {
    event.stopPropagation();
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <span className="group/copy relative flex items-center min-w-0">
      <span className="truncate min-w-0">{children}</span>

      <button
        type="button"
        onClick={copy}
        title={copied ? 'Copiado' : 'Copiar'}
        className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-[3px] bg-white shadow-[-6px_0_6px_-2px_rgba(255,255,255,0.95)] transition-opacity ${
          copied ? 'opacity-100 text-emerald-600' : 'opacity-0 group-hover/copy:opacity-100 text-[#5B6475] hover:text-[#6C4CF6]'
        }`}
      >
        {copied ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </span>
  );
}
