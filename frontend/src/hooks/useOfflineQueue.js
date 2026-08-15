import { useCallback, useEffect, useRef, useState } from "react";
import { addPending, removePending, getAllPending, genId } from "@/lib/offlineDb";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const RETRY_INTERVAL_MS = 5000;

/**
 * Queues a payload in IndexedDB when a submission fails because the
 * device is offline, and automatically retries it — immediately when
 * the browser reports it's back online, and every 5s afterwards as a
 * fallback for flaky connections that don't fire a clean "online" event.
 *
 * IMPORTANT: only call `enqueue()` for genuine connectivity failures
 * (see lib/networkError.js). A 429/500 response means the server WAS
 * reached and responded — retrying that in a loop is not what this is
 * for and would make rate-limit errors worse, not better.
 *
 * Usage:
 *   const { pendingCount, online, enqueue } = useOfflineQueue(
 *     "complaint_submit",
 *     (payload) => api.submitComplaint(payload),
 *     { onSuccess: (result, payload, meta) => { ... } }
 *   );
 */
export function useOfflineQueue(namespace, submitFn, { onSuccess } = {}) {
  const [pending, setPending] = useState([]);
  const online = useOnlineStatus();
  const submitFnRef = useRef(submitFn);
  const onSuccessRef = useRef(onSuccess);
  const flushingRef = useRef(false);
  submitFnRef.current = submitFn;
  onSuccessRef.current = onSuccess;

  const refresh = useCallback(async () => {
    try {
      const items = await getAllPending(namespace);
      setPending(items);
    } catch {
      // IndexedDB unavailable — queue simply won't track anything
    }
  }, [namespace]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enqueue = useCallback(
    async (payload, meta) => {
      const id = genId();
      await addPending(namespace, { id, payload, meta: meta || null, createdAt: Date.now() });
      await refresh();
      return id;
    },
    [namespace, refresh]
  );

  const flush = useCallback(async () => {
    if (flushingRef.current) return; // avoid overlapping runs from timer + online event firing together
    flushingRef.current = true;
    try {
      let items;
      try {
        items = await getAllPending(namespace);
      } catch {
        return;
      }
      for (const item of items) {
        try {
          const result = await submitFnRef.current(item.payload);
          await removePending(item.id);
          onSuccessRef.current?.(result, item.payload, item.meta);
        } catch {
          // Still failing — could be offline again or a transient server
          // error. Stop here and let the next retry tick pick up where
          // we left off, rather than burning through retries in a burst.
          break;
        }
      }
      await refresh();
    } finally {
      flushingRef.current = false;
    }
  }, [namespace, refresh]);

  // Retry as soon as the browser reports connectivity restored
  useEffect(() => {
    if (online) flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Fallback poll every 5s while anything is queued (covers flaky
  // connections that don't cleanly fire the browser's online event)
  useEffect(() => {
    if (pending.length === 0) return;
    const interval = setInterval(() => {
      if (navigator.onLine) flush();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pending.length, flush]);

  return { pending, pendingCount: pending.length, online, enqueue, flush };
}
