import { BADGE_COLORS, type BadgeTone } from '../types';

export function setBadge(count: number, tone: BadgeTone): void {
  if (count <= 0) {
    void chrome.action.setBadgeText({ text: '' });
    return;
  }

  void chrome.action.setBadgeText({ text: count > 99 ? '99+' : String(count) });
  void chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[tone] });
}

export function clearBadge(): void {
  void chrome.action.setBadgeText({ text: '' });
}
