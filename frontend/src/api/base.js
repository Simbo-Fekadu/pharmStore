// Determine API base for hybrid Electron/web environment
// Priority: explicit VITE_API_BASE, else same-origin relative
// Electron desktop can override via exposed global (future enhancement)

export function getApiBase() {
  if (import.meta.env.VITE_API_BASE)
    return import.meta.env.VITE_API_BASE.replace(/\/$/, "");
  // Fallback: same origin
  return "";
}

export function isElectron() {
  return !!(window.desktop && window.desktop.isElectron);
}
