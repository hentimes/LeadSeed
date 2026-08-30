import { parseMentions } from '../../utils/mentionParser';
import type { Mention } from '../../types/mentions';

interface MessageContentProps {
  content: string;
  onMentionClick?: (mention: Mention) => void;
  /**
   * Sobre la burbuja propia el fondo es morado solido: el morado de las
   * menciones desaparece y el ambar de las publicaciones pierde contraste. Ahi
   * la mencion se marca con subrayado y blanco, que es lo unico que se lee.
   */
  onOwnBubble?: boolean;
}

export default function MessageContent({
  content,
  onMentionClick,
  onOwnBubble = false,
}: MessageContentProps) {
  const tokens = parseMentions(content);

  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === 'text') return <span key={index}>{token.value}</span>;

        const esPublicacion = token.mention.kind === 'post';

        const estilo = onOwnBubble
          ? 'text-ink-inverse underline decoration-ink-inverse/50 underline-offset-2 hover:decoration-ink-inverse'
          : esPublicacion
            ? 'text-accent hover:bg-accent-soft'
            : 'text-primary hover:bg-primary-soft';

        return (
          <button
            key={index}
            type="button"
            onClick={() => onMentionClick?.(token.mention)}
            className={`-mx-0.5 inline rounded px-1 font-semibold transition-colors ${estilo}`}
            title={esPublicacion ? 'Ver publicación' : 'Ver perfil'}
          >
            @{token.mention.label}
          </button>
        );
      })}
    </>
  );
}
