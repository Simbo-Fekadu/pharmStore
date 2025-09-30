// Simplified: always use local backend without verbose console output
export function getApiBase() {
  return "http://localhost:3000"; // user requested fixed localhost backend
}

export function isElectron() {
  return !!(window.desktop && window.desktop.isElectron);
}
