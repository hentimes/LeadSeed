import { getSettings, saveSettings } from '../db/database';
import type { ColumnDef } from '../components/ColumnSelector';
import type { AppSettings } from '../types';

export interface AppPreferences {
  compactMode: boolean;
  darkMode: boolean;
  visibleCols: ColumnDef[];
}

function mergeVisibleColumns(defaultColumns: ColumnDef[], storedColumns: AppSettings['visibleCols']): ColumnDef[] {
  if (!storedColumns?.length) {
    return defaultColumns;
  }

  return storedColumns.map((column) => {
    const defaultColumn = defaultColumns.find((candidate) => candidate.key === column.key);
    return defaultColumn ? { ...defaultColumn, visible: column.visible } : column;
  });
}

export async function loadAppPreferences(defaultColumns: ColumnDef[]): Promise<AppPreferences> {
  const settings = await getSettings();

  try {
    const synced = await chrome.storage.sync.get(['compactMode', 'visibleCols', 'exportFormat']);

    if (synced.compactMode !== undefined) {
      settings.compactMode = synced.compactMode;
    }

    if (synced.visibleCols?.length) {
      settings.visibleCols = synced.visibleCols;
    }

    if (synced.exportFormat) {
      settings.exportFormat = synced.exportFormat;
    }
  } catch {
    // chrome.storage no disponible en desarrollo web.
  }

  return {
    compactMode: settings.compactMode ?? true,
    darkMode: settings.darkMode ?? false,
    visibleCols: mergeVisibleColumns(defaultColumns, settings.visibleCols),
  };
}

export function syncSettingsToChromeStorage(updates: Record<string, unknown>): void {
  try {
    chrome.storage.sync.set(updates);
  } catch {
    // chrome.storage no disponible en desarrollo web.
  }
}

export async function updateStoredSettings(
  updates: Partial<Pick<AppSettings, 'compactMode' | 'darkMode' | 'visibleCols'>>
): Promise<void> {
  const settings = await getSettings();
  await saveSettings({ ...settings, ...updates });
}
