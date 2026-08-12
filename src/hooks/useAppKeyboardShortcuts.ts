import { useEffect } from 'react';
import type { Page } from '../types';

interface UseAppKeyboardShortcutsOptions {
  onNavigate: (page: Page) => void;
}

export function useAppKeyboardShortcuts({ onNavigate }: UseAppKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        onNavigate('leads');
        setTimeout(() => {
          // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
          const input = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement | null;
          input?.focus();
        }, 100);
        return;
      }

      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      switch (event.key) {
        case '1':
          event.preventDefault();
          onNavigate('leads');
          break;
        case '2':
          event.preventDefault();
          onNavigate('send');
          break;
        case '3':
          event.preventDefault();
          onNavigate('tasks');
          break;
        case '4':
          event.preventDefault();
          onNavigate('history');
          break;
        case '5':
          event.preventDefault();
          onNavigate('settings');
          break;
        default:
          break;
      }
    };

    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    window.addEventListener('keydown', handler);
    // eslint-disable-next-line no-restricted-globals -- DEUDA BLOQUE 5: usa el DOM directamente, sin puerto. Ver roadmap 13.6.
    return () => window.removeEventListener('keydown', handler);
  }, [onNavigate]);
}
