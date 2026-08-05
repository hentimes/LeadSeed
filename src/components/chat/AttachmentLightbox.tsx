import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../utils/icons';

interface AttachmentLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Vista ampliada de una imagen del chat. Muestra la version ya comprimida
 * (no hay un original de mayor resolucion guardado en ningun lado) a su
 * proporcion real -- horizontal o vertical, lo que sea.
 */
export default function AttachmentLightbox({ src, alt, onClose }: AttachmentLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-6"
    >
      <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        title="Cerrar"
      >
        <Icon.Close />
      </button>
    </div>,
    document.body
  );
}
