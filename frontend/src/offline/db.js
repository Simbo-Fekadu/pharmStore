// Simple IndexedDB helper for offline cache & mutation queue
// Versioned schema allows future evolution without data loss.

const DB_NAME = "pharmstore_offline";
const DB_VERSION = 1;

// Object stores:
// cache_medicines: key = _id, value = medicine object
// cache_requests: key = _id, value = request object
// mutation_queue: key = auto-increment, value = { id, method, url, body, ts }

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache_medicines")) {
        db.createObjectStore("cache_medicines", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("cache_requests")) {
        db.createObjectStore("cache_requests", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("mutation_queue")) {
        db.createObjectStore("mutation_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function withStore(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}
