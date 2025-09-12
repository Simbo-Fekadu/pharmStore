import { withStore } from "./db";
import { getApiBase } from "../api/base";

// Queue structure item: { id (auto), method, url, body, ts }

export async function enqueueMutation(method, url, body) {
  const ts = Date.now();
  return withStore("mutation_queue", "readwrite", (store) => {
    store.add({ method, url, body, ts });
  });
}

export async function listQueue() {
  return withStore("mutation_queue", "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function clearItem(id) {
  return withStore("mutation_queue", "readwrite", (store) => store.delete(id));
}

export async function flushQueue(getAuthHeaders) {
  const base = getApiBase();
  const items = await listQueue();
  for (const item of items.sort((a, b) => a.ts - b.ts)) {
    try {
      const res = await fetch(base + item.url, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          ...(getAuthHeaders ? getAuthHeaders() : {}),
        },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (res.ok) {
        await clearItem(item.id);
      }
    } catch (err) {
      // Stop on first network failure to retry later
      break;
    }
  }
}
