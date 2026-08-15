// Minimal IndexedDB wrapper — no external dependency, keeps the bundle
// light and avoids the kind of peer-dependency conflicts this repo has
// already hit with npm packages. Two object stores:
//   - "drafts"  : form/input auto-save, keyed by a form name
//   - "pending" : queued submissions that failed due to being offline,
//                 keyed by a generated id, tagged with a namespace so
//                 multiple pages can share one store safely
//
// Every public function fails soft: if IndexedDB is unavailable
// (very old browser, some private-browsing modes), callers should
// catch and simply skip persistence rather than break the form.

const DB_NAME = "smartbharat_offline";
const DB_VERSION = 1;
const STORE_DRAFTS = "drafts";
const STORE_PENDING = "pending";

export function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported in this browser"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS);
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function runTx(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result;
        try {
          const req = fn(store);
          req.onsuccess = () => {
            result = req.result;
          };
          req.onerror = () => reject(req.error);
        } catch (err) {
          reject(err);
          return;
        }
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ---- Drafts ----
export function saveDraft(key, value) {
  return runTx(STORE_DRAFTS, "readwrite", (store) => store.put(value, key));
}

export function getDraft(key) {
  return runTx(STORE_DRAFTS, "readonly", (store) => store.get(key));
}

export function deleteDraft(key) {
  return runTx(STORE_DRAFTS, "readwrite", (store) => store.delete(key));
}

// ---- Pending offline submissions ----
export function addPending(namespace, item) {
  return runTx(STORE_PENDING, "readwrite", (store) => store.put({ ...item, namespace }));
}

export function removePending(id) {
  return runTx(STORE_PENDING, "readwrite", (store) => store.delete(id));
}

export async function getAllPending(namespace) {
  const all = (await runTx(STORE_PENDING, "readonly", (store) => store.getAll())) || [];
  return all.filter((i) => i.namespace === namespace).sort((a, b) => a.createdAt - b.createdAt);
}
