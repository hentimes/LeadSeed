import { getSettings, saveSettings } from './appSettingsService';
import type { ColumnDef } from '../components/ColumnSelector';
import type { AppSettings } from '../types';

export interface AppPreferences {
  compactMode: boolean;
  darkMode: boolean;
  visibleCols: ColumnDef[];
}

/**
 * Fusiona las columnas guardadas con el catalogo actual.
 *
 * Antes esto iteraba solo sobre las guardadas, asi que toda columna nueva
 * que se agregara al catalogo quedaba invisible para siempre en cuentas
 * existentes. Ahora se respeta el orden y la visibilidad elegidos por el
 * usuario, y se agregan al final las columnas que todavia no conocia.
 */
function mergeVisibleColumns(defaultColumns: ColumnDef[], storedColumns: AppSettings['visibleCols']): ColumnDef[] {
  if (!storedColumns?.length) {
    return defaultColumns;
  }

  const knownKeys = new Set(defaultColumns.map((column) => column.key));
  const storedKeys = new Set(storedColumns.map((column) => column.key));

  const preserved = storedColumns
    // Descarta columnas que ya no existen en el catalogo.
    .filter((column) => knownKeys.has(column.key))
    .map((column) => {
      const defaultColumn = defaultColumns.find((candidate) => candidate.key === column.key)!;
      return { ...defaultColumn, visible: column.visible };
    });

  const added = defaultColumns.filter((column) => !storedKeys.has(column.key));

  return [...preserved, ...added];
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
