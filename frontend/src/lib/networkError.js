// Distinguishes "the request never reached the server" (offline, DNS
// failure, dropped connection) from "the server responded with an
// error" (429 rate limit, 500, validation error, etc.).
//
// Only the former should go into the offline retry queue — retrying a
// 429 or 500 in a tight loop would make things worse, not better, and
// those already have their own user-facing messaging from the backend.
export function isOfflineError(error) {
  if (!error) return false;
  if (error.response) return false; // server responded — not a connectivity issue
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return error.code === "ERR_NETWORK" || error.message === "Network Error";
}
