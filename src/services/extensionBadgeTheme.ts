import { BADGE_COLORS, type BadgeTone } from '../types';

/**
 * Badge de la extension.
 *
 * Chrome expone un unico badge con un unico color, pero hay tres fuentes que
 * quieren usarlo: leads nuevos, mensajes y avisos criticos. La version previa
 * exponia setBadge(count, tone) directo sobre chrome.action, asi que la ultima
 * fuente en escribir pisaba a las demas: si llegaba un mensaje despues de tres
 * leads, el contador de leads desaparecia.
 *
 * Aca se lleva un contador por tono y se decide que mostrar:
 *
 *   - El numero es el total de pendientes. Ocultar los de menor prioridad
 *     haria que el usuario no se entere de que existen.
 *   - El color es el del tono mas urgente que tenga pendientes, porque es el
 *     unico dato de tipo que entra en un badge.
 *
 * El estado se persiste porque el service worker se apaga constantemente y al
 * revivir tiene que poder repintar sin volver a consultar cada fuente.
 */

/** De mas urgente a menos. Define que color gana cuando conviven varios. */
const TONE_PRIORITY: BadgeTone[] = ['critical', 'newLeads', 'messages'];

const STORAGE_KEY = 'badgeCounts';

type BadgeCounts = Partial<Record<BadgeTone, number>>;

// Las fuentes escriben desde callbacks de Realtime que pueden solaparse. Sin
// serializar, dos lecturas concurrentes leerian el mismo estado previo y una
// de las dos actualizaciones se perderia.
let queue: Promise<void> = Promise.resolve();

async function readCounts(): Promise<BadgeCounts> {
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    return (stored[STORAGE_KEY] as BadgeCounts) || {};
  } catch {
    return {};
  }
}

function render(counts: BadgeCounts): void {
  const total = TONE_PRIORITY.reduce((sum, tone) => sum + (counts[tone] || 0), 0);

  if (total <= 0) {
    void chrome.action.setBadgeText({ text: '' });
    return;
  }

  const dominant = TONE_PRIORITY.find((tone) => (counts[tone] || 0) > 0) || 'newLeads';

  void chrome.action.setBadgeText({ text: total > 99 ? '99+' : String(total) });
  void chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[dominant] });
}

/** Fija el contador de un tono sin tocar los demas. */
export function setBadgeCount(tone: BadgeTone, count: number): Promise<void> {
  queue = queue.then(async () => {
    const counts = await readCounts();
    const next = { ...counts, [tone]: Math.max(0, count) };
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    render(next);
  });
  return queue;
}

/** Suma al contador de un tono. Para fuentes que solo saben del evento nuevo. */
export function incrementBadgeCount(tone: BadgeTone, by = 1): Promise<void> {
  queue = queue.then(async () => {
    const counts = await readCounts();
    const next = { ...counts, [tone]: Math.max(0, (counts[tone] || 0) + by) };
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    render(next);
  });
  return queue;
}

/** Repinta desde lo persistido. Se usa al revivir el service worker. */
export function restoreBadge(): Promise<void> {
  queue = queue.then(async () => {
    render(await readCounts());
  });
  return queue;
}

/** Apaga todo. Se llama cuando el usuario abre la extension. */
export function clearBadge(): Promise<void> {
  queue = queue.then(async () => {
    await chrome.storage.local.set({ [STORAGE_KEY]: {} });
    render({});
  });
  return queue;
}
