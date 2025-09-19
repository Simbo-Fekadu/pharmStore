// Determine API base for hybrid Electron/web environment
// Priority: explicit VITE_API_BASE, else same-origin relative
// Electron desktop can override via exposed global (future enhancement)

export function getApiBase() {
  if (import.meta.env.VITE_API_BASE) {
    const base = import.meta.env.VITE_API_BASE.replace(/\/$/, "");
    if (import.meta.env.DEV) console.log("[API] VITE_API_BASE:", base);
    return base;
  }
  // Electron runtime config (config.json) if present
  if (
    window.desktop &&
    window.desktop.config &&
    window.desktop.config.apiBase
  ) {
    const base = window.desktop.config.apiBase.replace(/\/$/, "");
    if (import.meta.env.DEV) console.log("[API] desktop.config.apiBase:", base);
    return base;
  }
  // Development convenience: if running on localhost, default to local backend
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    const base = "http://localhost:3000";
    if (import.meta.env.DEV)
      console.log("[API] inferred localhost base:", base);
    return base;
  }
  // Fallback: same origin
  if (import.meta.env.DEV)
    console.log("[API] fallback: same-origin (" + window.location.origin + ")");
  return "";
}

export function isElectron() {
  return !!(window.desktop && window.desktop.isElectron);
}
