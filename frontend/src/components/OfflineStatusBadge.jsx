import React from "react";
import { WifiOff, CloudUpload } from "lucide-react";

/**
 * Shows nothing when online with an empty queue (the common case).
 * Otherwise shows either "you're offline" or "sending N saved items".
 */
const OfflineStatusBadge = ({ online, pendingCount, lang }) => {
  if (online && pendingCount === 0) return null;

  const label = online
    ? lang === "hi"
      ? `${pendingCount} आइटम भेजे जा रहे हैं…`
      : `Sending ${pendingCount} saved item${pendingCount > 1 ? "s" : ""}…`
    : pendingCount > 0
    ? lang === "hi"
      ? `ऑफ़लाइन — ${pendingCount} आइटम कनेक्शन आने पर अपने आप भेजे जाएँगे`
      : `Offline — ${pendingCount} item${pendingCount > 1 ? "s" : ""} will send automatically once you're back online`
    : lang === "hi"
    ? "आप ऑफ़लाइन हैं"
    : "You're offline";

  return (
    <div
      data-testid="offline-status-badge"
      className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        online
          ? "bg-saffron/10 text-saffron border border-saffron/20"
          : "bg-red-50 text-red-600 border border-red-100"
      }`}
    >
      {online ? <CloudUpload size={13} /> : <WifiOff size={13} />}
      {label}
    </div>
  );
};

export default OfflineStatusBadge;
