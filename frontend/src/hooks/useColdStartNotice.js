import { useEffect, useState } from "react";

/**
 * Returns `true` once `isLoading` has stayed true for longer than `delayMs`.
 * Used to show a "server is waking up" message on Render's free tier,
 * where the first request after ~15min idle can take 30-60s — without
 * this, a long spinner with no explanation looks like the app is broken.
 *
 * Resets to `false` as soon as `isLoading` goes false (request finished,
 * success or error) or when the component unmounts mid-request.
 */
export function useColdStartNotice(isLoading, delayMs = 4000) {
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowNotice(false);
      return;
    }
    const timer = setTimeout(() => setShowNotice(true), delayMs);
    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return showNotice;
}
