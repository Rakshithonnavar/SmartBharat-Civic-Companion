import { useCallback, useEffect, useRef, useState } from "react";
import { getDraft, saveDraft, deleteDraft } from "@/lib/offlineDb";

/**
 * Drop-in replacement for useState that auto-saves the value to
 * IndexedDB (debounced) and restores it on mount. Used so a user
 * filling a form doesn't lose their input if the tab closes, the
 * page refreshes, or the connection drops mid-typing.
 *
 * Usage: const [form, setForm, { restored, clearDraft }] = useOfflineForm("key", initialValue);
 *
 * Fails soft: if IndexedDB is unavailable, the form still works as a
 * normal useState — it just won't persist across reloads.
 */
export function useOfflineForm(formKey, initialValue, debounceMs = 500) {
  const [value, setValue] = useState(initialValue);
  const [restored, setRestored] = useState(false);
  const loadedRef = useRef(false);

  // Restore any saved draft on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await getDraft(formKey);
        if (!cancelled && draft !== undefined && draft !== null) {
          setValue(draft);
          setRestored(true);
        }
      } catch {
        // IndexedDB unavailable — proceed with initialValue, no persistence
      } finally {
        loadedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  // Debounced auto-save whenever value changes (skip the very first
  // render so we don't immediately overwrite a draft we haven't loaded yet)
  useEffect(() => {
    if (!loadedRef.current) return;
    const timer = setTimeout(() => {
      saveDraft(formKey, value).catch(() => {
        // best-effort — a failed save just means no offline safety net this time
      });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [formKey, value, debounceMs]);

  const clearDraft = useCallback(() => {
    deleteDraft(formKey).catch(() => {});
    setRestored(false);
  }, [formKey]);

  return [value, setValue, { restored, clearDraft }];
}
