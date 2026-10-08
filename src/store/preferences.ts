export function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(key) } catch { return null }
}

export function savePreference(key: string, value: string): void {
  // Preferences may be unavailable in private or quota-limited browser contexts.
  try { window.localStorage.setItem(key, value) } catch { /* Keep the in-memory preference. */ }
}
