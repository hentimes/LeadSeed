import { parseMentions } from '../../utils/mentionParser';
import type { Mention } from '../../types/mentions';

interface MessageContentProps {
  content: string;
  onMentionClick?: (mention: Mention) => void;
}

export default function MessageContent({ content, onMentionClick }: MessageContentProps) {
  const tokens = parseMentions(content);

  return (
    <>
      {tokens.map((token, index) =>
        token.type === 'text' ? (
          <span key={index}>{token.value}</span>
        ) : (
          <button
            key={index}
            type="button"
            onClick={() => onMentionClick?.(token.mention)}
            className={`inline font-semibold rounded px-1 -mx-0.5 transition-colors ${
              token.mention.kind === 'post'
                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                : 'text-primary hover:bg-primary-soft dark:hover:bg-primary/20'
            }`}
            title={token.mention.kind === 'post' ? 'Ver publicación' : 'Ver perfil'}
          >
            @{token.mention.label}
          </button>
        )
      )}
    </>
  );
}
