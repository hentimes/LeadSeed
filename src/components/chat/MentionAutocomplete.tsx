import { Avatar } from '../../design';
import type { MentionSuggestion } from '../../types/mentions';

interface MentionAutocompleteProps {
  suggestions: MentionSuggestion[];
  highlighted: number;
  onHighlight: (index: number) => void;
  onSelect: (suggestion: MentionSuggestion) => void;
}

/**
 * Sugerencias del `@`.
 *
 * El encabezado existe porque nada indicaba que el `@` tambien busca
 * publicaciones y, para el staff, comandos de moderacion: se descubria de
 * casualidad.
 *
 * `role="listbox"` con `aria-selected`: sin eso, moverse con las flechas no se
 * anuncia y la lista se lee como un monton de botones sueltos.
 */
export default function MentionAutocomplete({
  suggestions,
  highlighted,
  onHighlight,
  onSelect,
}: MentionAutocompleteProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-line bg-surface shadow-float">
      <p className="border-b border-line-soft px-3 py-1 text-micro font-bold uppercase tracking-wider text-ink-muted">
        Personas · Publicaciones · Comandos
      </p>

      <div role="listbox" aria-label="Sugerencias de mención" className="max-h-52 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.kind}:${suggestion.id}`}
            type="button"
            role="option"
            aria-selected={index === highlighted}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onSelect(suggestion)}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
              index === highlighted ? 'bg-primary-soft' : 'hover:bg-surface-hover'
            }`}
          >
            {suggestion.kind === 'user' && (
              <Avatar name={suggestion.label} src={suggestion.avatarUrl} size="md" />
            )}

            {suggestion.kind === 'post' && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-meta font-bold text-accent">
                #
              </span>
            )}

            {suggestion.kind === 'command' && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-meta font-bold text-primary">
                @
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-meta font-semibold text-ink">
                {suggestion.kind === 'command' ? `@${suggestion.label}` : suggestion.label}
              </span>
              {suggestion.hint && (
                <span className="block truncate text-micro text-ink-muted">{suggestion.hint}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
