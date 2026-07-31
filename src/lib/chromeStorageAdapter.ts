/**
 * Custom storage adapter for Supabase that uses chrome.storage.local
 * instead of localStorage. This is required because Manifest V3 Service Workers
 * do not have access to localStorage.
 *
 * This adapter uses Promises to interact with chrome.storage.local,
 * which Supabase fully supports.
 */

function isChromeStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && !!chrome?.storage?.local;
}

export const chromeStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (isChromeStorageAvailable()) {
      const data = await chrome.storage.local.get(key);
      return data[key] ?? null;
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [key]: value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isChromeStorageAvailable()) {
      await chrome.storage.local.remove(key);
    } else {
      localStorage.removeItem(key);
    }
  },
};
