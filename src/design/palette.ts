/**
 * PUENTE DE TOKENS PARA CONTEXTOS QUE NO ACEPTAN CSS
 *
 * SVG, canvas y las librerias de graficos (Recharts) necesitan un color
 * literal en una prop: no se les puede pasar una clase de Tailwind. Para
 * que igual exista una sola fuente de verdad, aca se LEEN los tokens de
 * tokens.css en tiempo de ejecucion.
 *
 * Los valores literales son solo respaldo por si se evalua antes de que
 * el CSS este montado; deben coincidir con tokens.css.
 */

const FALLBACK: Record<string, string> = {
  '--ls-primary': '#6c4cf6',
  '--ls-primary-hover': '#5b3ce0',
  '--ls-primary-deep': '#4a2bb5',
  '--ls-primary-light': '#8f85ff',
  '--ls-primary-soft': '#f2eeff',
  '--ls-primary-soft-strong': '#e0d4ff',
  '--ls-text': '#161a24',
  '--ls-text-secondary': '#5b6475',
  '--ls-text-muted': '#697387',
  '--ls-surface': '#ffffff',
  '--ls-border': '#e6eaf0',
  '--ls-success': '#22c55e',
  '--ls-warning': '#f59e0b',
  '--ls-danger': '#ef4444',
  '--ls-info': '#3b82f6',
};

const cache = new Map<string, string>();

/** Lee un token de color. Memoizado: getComputedStyle es costoso. */
export function token(name: keyof typeof FALLBACK | string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  let value = FALLBACK[name] || '#6c4cf6';
  if (typeof window !== 'undefined' && document.documentElement) {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (computed) value = computed;
  }

  cache.set(name, value);
  return value;
}

/** Limpia la cache; necesario si se alterna claro/oscuro. */
export function resetPaletteCache(): void {
  cache.clear();
}

/** Atajos para los colores mas usados en graficos. */
export const chartColors = {
  get primary() {
    return token('--ls-primary');
  },
  get primaryLight() {
    return token('--ls-primary-light');
  },
  get primaryDeep() {
    return token('--ls-primary-deep');
  },
  get soft() {
    return token('--ls-primary-soft');
  },
  get ink() {
    return token('--ls-text');
  },
  get inkSecondary() {
    return token('--ls-text-secondary');
  },
  get inkMuted() {
    return token('--ls-text-muted');
  },
  get border() {
    return token('--ls-border');
  },
  get surface() {
    return token('--ls-surface');
  },
  get success() {
    return token('--ls-success');
  },
  get warning() {
    return token('--ls-warning');
  },
  get danger() {
    return token('--ls-danger');
  },
  get info() {
    return token('--ls-info');
  },
};

/** Serie categorica para graficos con varias series. */
export const chartSeries = (): string[] => [
  token('--ls-primary'),
  token('--ls-info'),
  token('--ls-success'),
  token('--ls-warning'),
  token('--ls-primary-light'),
  token('--ls-danger'),
];
