import { Icon } from '../../utils/icons';

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
}

/**
 * El icono crece un 15% al marcar y vuelve. Es la unica animacion de la
 * seccion que responde a una accion del usuario, y por eso se deja: confirma
 * que el toque llego antes de que vuelva la respuesta del servidor. La regla
 * global de `prefers-reduced-motion` la anula sola.
 */
export default function LikeButton({ liked, count, onToggle }: LikeButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={liked}
      title={liked ? 'Quitar me gusta' : 'Me gusta'}
      aria-label={liked ? `Quitar me gusta, ${count}` : `Me gusta, ${count}`}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-semibold transition-colors ${
        liked ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
      }`}
    >
      <span
        className={`transition-transform [&_svg]:!h-3.5 [&_svg]:!w-3.5 ${liked ? 'scale-110' : ''}`}
      >
        <Icon.ThumbUp />
      </span>
      {count}
    </button>
  );
}
