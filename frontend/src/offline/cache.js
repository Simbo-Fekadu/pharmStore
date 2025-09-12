import { withStore } from "./db";

// Cache utilities for read models (medicines, requests)

export async function cacheUpsertMany(storeName, items) {
  if (!Array.isArray(items)) return;
  await withStore(storeName, "readwrite", (store) => {
    for (const item of items) store.put(item);
  });
}

export async function cacheGetAll(storeName) {
  return withStore(storeName, "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function cacheClear(storeName) {
  return withStore(storeName, "readwrite", (store) => store.clear());
}
