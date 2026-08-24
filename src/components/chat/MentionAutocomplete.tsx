import type { MentionSuggestion } from '../../types/mentions';

interface MentionAutocompleteProps {
  suggestions: MentionSuggestion[];
  highlighted: number;
  onHighlight: (index: number) => void;
  onSelect: (suggestion: MentionSuggestion) => void;
}

export default function MentionAutocomplete({
  suggestions,
  highlighted,
  onHighlight,
  onSelect,
}: MentionAutocompleteProps) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-30 max-h-56 overflow-y-auto rounded-2xl border border-line dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.kind}:${suggestion.id}`}
          type="button"
          onMouseEnter={() => onHighlight(index)}
          onClick={() => onSelect(suggestion)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            index === highlighted ? 'bg-primary-soft dark:bg-primary/20' : 'hover:bg-surface-muted dark:hover:bg-gray-700'
          }`}
        >
          {suggestion.kind === 'user' && (
            <img
              src={suggestion.avatarUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          )}
          {suggestion.kind === 'post' && (
            <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
              #
            </span>
          )}
          {suggestion.kind === 'command' && (
            <span className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
              @
            </span>
          )}

          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-ink dark:text-gray-100 truncate">
              {suggestion.kind === 'command' ? `@${suggestion.label}` : suggestion.label}
            </span>
            {suggestion.hint && (
              <span className="block text-[11px] text-ink-muted truncate">{suggestion.hint}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
