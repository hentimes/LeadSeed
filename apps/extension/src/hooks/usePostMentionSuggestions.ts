import { useEffect, useState } from 'react';
import { searchPosts } from '../services/communityForumService';
import type { MentionSuggestion } from '../types/mentions';

const DEBOUNCE_MS = 250;
const MIN_TERM_LENGTH = 2;

/** Publicaciones del foro que coinciden con el `@termino` en curso. */
export function usePostMentionSuggestions(term: string): MentionSuggestion[] {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);

  useEffect(() => {
    if (term.trim().length < MIN_TERM_LENGTH) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const posts = await searchPosts(term);
      if (cancelled) return;

      setSuggestions(
        posts.map((post) => ({
          kind: 'post',
          id: post.id,
          label: post.title,
          hint: 'Publicación de la comunidad',
        }))
      );
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  return suggestions;
}
