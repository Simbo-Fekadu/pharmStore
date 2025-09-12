import { flushQueue } from "./queue";

let isFlushing = false;

export function setupOfflineSync(getAuthHeaders) {
  async function attemptFlush() {
    if (isFlushing) return;
    if (!navigator.onLine) return;
    isFlushing = true;
    try {
      await flushQueue(getAuthHeaders);
    } finally {
      isFlushing = false;
    }
  }

  window.addEventListener("online", attemptFlush);
  window.addEventListener("focus", attemptFlush);
  // periodic flush every 60s
  setInterval(attemptFlush, 60000);
  attemptFlush();
}
