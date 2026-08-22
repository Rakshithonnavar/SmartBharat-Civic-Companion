import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, Loader2, Search, Sparkles, CloudUpload } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { useColdStartNotice } from "@/hooks/useColdStartNotice";
import { useOfflineForm } from "@/hooks/useOfflineForm";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { isOfflineError } from "@/lib/networkError";
import OfflineStatusBadge from "@/components/OfflineStatusBadge";

const STATUSES = ["Submitted", "Under Review", "In Progress", "Resolved"];

const CATEGORIES = [
  "Roads & Infrastructure",
  "Water Supply",
  "Electricity",
  "Sanitation & Garbage",
  "Public Health",
  "Street Lighting",
  "Other",
];

const EMPTY_COMPLAINT = {
  citizen_name: "",
  contact: "",
  category: CATEGORIES[0],
  location: "",
  description: "",
};

const StatusPill = ({ status }) => {
  const map = {
    Submitted: "bg-navy/10 text-navy",
    "Under Review": "bg-aihighlight/20 text-aihighlight",
    "In Progress": "bg-saffron/15 text-saffron",
    Resolved: "bg-emerald/15 text-emerald",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] || "bg-navy/10 text-navy"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

const Timeline = ({ current, entries }) => {
  return (
    <ol aria-label={current ? `Complaint status: ${current}` : "Complaint status timeline"} className="mt-4 space-y-4">
      {STATUSES.map((s, idx) => {
        const idxCurrent = STATUSES.indexOf(current);
        const done = idx < idxCurrent;
        const active = idx === idxCurrent;
        const entry = entries?.find((e) => e.status === s);
        return (
          <li key={s} aria-current={active ? "step" : undefined} className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center border ${
                done
                  ? "bg-emerald border-emerald text-white"
                  : active
                  ? "bg-saffron border-saffron text-white"
                  : "bg-white border-navy/20 text-navy/40"
              }`}
            >
              {done ? (
                <CheckCircle2 size={14} />
              ) : active ? (
                <Clock size={12} />
              ) : (
                <span className="text-[10px] font-bold">{idx + 1}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy">{s}</div>
              {entry?.note && (
                <div className="text-xs text-navy/60 mt-0.5">{entry.note}</div>
              )}
              {entry?.timestamp && (
                <div className="text-[10px] font-mono text-navy/40 mt-0.5">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const ComplaintTracker = () => {
  const { lang } = useLang();
  const [tab, setTab] = useState("submit"); // submit | track
  const [form, setForm, { restored: draftRestored, clearDraft }] = useOfflineForm(
    "complaint_form",
    EMPTY_COMPLAINT
  );
  const [submitting, setSubmitting] = useState(false);
  const showColdStart = useColdStartNotice(submitting);
  const [submitted, setSubmitted] = useState(null);
  const [queued, setQueued] = useState(false);

  const { pendingCount, online, enqueue } = useOfflineQueue(
    "complaint_submit",
    (payload) => api.submitComplaint(payload),
    {
      onSuccess: (result) => {
        setSubmitted(result);
        setQueued(false);
      },
    }
  );

  const [trackId, setTrackId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitted(null);
    setQueued(false);
    const payload = { ...form, language: lang };
    try {
      const res = await api.submitComplaint(payload);
      setSubmitted(res);
      clearDraft();
      setForm(EMPTY_COMPLAINT);
    } catch (err) {
      if (isOfflineError(err)) {
        try {
          await enqueue(payload);
          setQueued(true);
          clearDraft();
          setForm(EMPTY_COMPLAINT);
        } catch {
          alert(
            lang === "hi"
              ? "ऑफ़लाइन सेव भी विफल — कृपया पुनः प्रयास करें।"
              : "Could not save this offline either — please try again."
          );
        }
      } else {
        alert(
          lang === "hi" ? "सबमिट विफल — कृपया पुनः प्रयास करें।" : "Failed to submit — please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const track = async (e) => {
    e.preventDefault();
    setTracking(true);
    setTrackError("");
    setTrackResult(null);
    try {
      const res = await api.trackComplaint(trackId.trim().toUpperCase());
      setTrackResult(res);
    } catch (e) {
      setTrackError(
        lang === "hi"
          ? "यह टिकट नहीं मिला। कृपया आईडी जाँचें।"
          : "Ticket not found. Please check your ID."
      );
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-black">
          {lang === "hi" ? "स्मार्ट शिकायत ट्रैकर" : "Smart Complaint Tracker"}
        </h1>
        <p className="mt-2 text-sm text-navy/60 max-w-2xl">
          {lang === "hi"
            ? "एआई आपकी शिकायत को सही विभाग में भेजता है और आप पूरी टाइमलाइन देख सकते हैं।"
            : "AI triages your complaint, routes it to the right department, and gives you a live status timeline."}
        </p>
        <OfflineStatusBadge online={online} pendingCount={pendingCount} lang={lang} />
      </div>

      <div role="tablist" aria-label={lang === "hi" ? "शिकायत टैब" : "Complaint tabs"} className="inline-flex rounded-full bg-white border border-navy/10 p-1 mb-8">
        <button
          data-testid="tab-submit"
          role="tab"
          id="tab-submit"
          aria-selected={tab === "submit"}
          aria-controls="tabpanel-submit"
          onClick={() => setTab("submit")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
            tab === "submit" ? "bg-navy text-white" : "text-navy/60 hover:text-navy"
          }`}
        >
          {lang === "hi" ? "नई शिकायत" : "New Complaint"}
        </button>
        <button
          data-testid="tab-track"
          role="tab"
          id="tab-track"
          aria-selected={tab === "track"}
          aria-controls="tabpanel-track"
          onClick={() => setTab("track")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
            tab === "track" ? "bg-navy text-white" : "text-navy/60 hover:text-navy"
          }`}
        >
          {lang === "hi" ? "ट्रैक करें" : "Track Ticket"}
        </button>
      </div>

      {tab === "submit" && (
        <div id="tabpanel-submit" role="tabpanel" aria-labelledby="tab-submit" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={submit}
            className="lg:col-span-7 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-5"
          >
            {draftRestored && (form.citizen_name || form.description) && (
              <div
                data-testid="draft-restored-notice"
                className="flex items-center justify-between rounded-xl bg-linen border border-navy/10 px-4 py-2.5 text-xs text-navy/60"
              >
                <span>
                  {lang === "hi" ? "आपका सहेजा गया ड्राफ्ट पुनर्स्थापित किया गया।" : "Restored your saved draft."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearDraft();
                    setForm(EMPTY_COMPLAINT);
                  }}
                  className="font-semibold text-saffron hover:underline"
                >
                  {lang === "hi" ? "साफ़ करें" : "Clear"}
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                  {lang === "hi" ? "नाम" : "Full name"}
                </span>
                <input
                  data-testid="input-name"
                  required
                  value={form.citizen_name}
                  onChange={(e) => setForm({ ...form, citizen_name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                  {lang === "hi" ? "फ़ोन / ईमेल" : "Phone / Email"}
                </span>
                <input
                  data-testid="input-contact"
                  required
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                  {lang === "hi" ? "श्रेणी" : "Category"}
                </span>
                <select
                  data-testid="input-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                  {lang === "hi" ? "स्थान / पता" : "Location / Address"}
                </span>
                <input
                  data-testid="input-location"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                {lang === "hi" ? "विवरण" : "Description"}
              </span>
              <textarea
                data-testid="input-description"
                required
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={
                  lang === "hi"
                    ? "समस्या का विवरण दें…"
                    : "Describe the issue in detail…"
                }
                className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              data-testid="submit-complaint-btn"
              className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-60 transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
              {lang === "hi" ? "एआई से दर्ज करें" : "Submit with AI triage"}
            </button>
            {showColdStart && (
              <p role="status" className="text-xs text-navy/40" data-testid="cold-start-notice">
                {lang === "hi"
                  ? "सर्वर को जगाया जा रहा है, पहली बार में एक मिनट तक लग सकता है…"
                  : "Waking up the server — this can take up to a minute on first use…"}
              </p>
            )}
          </form>

          <div aria-live="polite" className="lg:col-span-5">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="submit-success"
                className="rounded-2xl bg-navy text-white p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-widest text-white/50">
                    Ticket ID
                  </div>
                  <StatusPill status={submitted.current_status} />
                </div>
                <div className="mt-2 font-mono text-2xl font-bold">
                  {submitted.ticket_id}
                </div>
                <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 text-sm">
                  <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
                    AI Summary
                  </div>
                  <p className="text-white/90">{submitted.ai_summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded-full bg-saffron/20 text-saffron px-2 py-1 font-bold uppercase">
                      Priority: {submitted.ai_priority}
                    </span>
                    <span className="rounded-full bg-emerald/20 text-emerald px-2 py-1 font-bold uppercase">
                      {submitted.ai_department}
                    </span>
                  </div>
                </div>
                <div className="mt-5 text-xs text-white/60">
                  {lang === "hi"
                    ? "इस टिकट आईडी को सुरक्षित रखें। ट्रैक टैब में उपयोग करें।"
                    : "Save this ticket ID — use the Track tab to view live status."}
                </div>
              </motion.div>
            ) : queued ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="submit-queued"
                className="rounded-2xl bg-saffron/10 border border-saffron/25 p-6"
              >
                <div className="flex items-center gap-2 text-saffron font-semibold text-sm">
                  <CloudUpload size={16} />
                  {lang === "hi" ? "ऑफ़लाइन सेव किया गया" : "Saved offline"}
                </div>
                <p className="mt-2 text-sm text-navy/70">
                  {lang === "hi"
                    ? "आपकी शिकायत आपके डिवाइस पर सुरक्षित है और कनेक्शन आने पर अपने आप भेज दी जाएगी। इसी टैब पर वापस आकर टिकट आईडी देखें।"
                    : "Your complaint is saved on this device and will submit automatically once you're back online. Come back to this tab to see the ticket ID once it goes through."}
                </p>
              </motion.div>
            ) : (
              <div className="rounded-2xl bg-white border border-dashed border-navy/15 p-8 text-center text-sm text-navy/50">
                <AlertCircle size={20} className="mx-auto mb-3 text-navy/30" />
                {lang === "hi"
                  ? "फ़ॉर्म भरें और एआई आपकी शिकायत का सारांश तैयार करेगा।"
                  : "Submit the form to see your AI-generated ticket summary, priority, and department routing."}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "track" && (
        <div id="tabpanel-track" role="tabpanel" aria-labelledby="tab-track" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={track}
            className="lg:col-span-5 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8"
          >
            <label htmlFor="input-track-id" className="block text-xs font-semibold uppercase tracking-widest text-navy/60 mb-2">
              {lang === "hi" ? "टिकट आईडी" : "Ticket ID"}
            </label>
            <div className="flex gap-2">
              <input
                id="input-track-id"
                data-testid="input-track-id"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder="SB-XXXXXXXX"
                className="flex-1 rounded-xl bg-linen border border-navy/10 focus:border-saffron outline-none px-4 py-2.5 text-sm font-mono uppercase"
              />
              <button
                type="submit"
                disabled={tracking || !trackId.trim()}
                data-testid="track-btn"
                aria-busy={tracking}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-50 transition-colors"
              >
                {tracking ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Search size={14} aria-hidden="true" />}
                {lang === "hi" ? "खोजें" : "Track"}
              </button>
            </div>
            {trackError && (
              <div role="alert" className="mt-3 text-xs text-red-600" data-testid="track-error">{trackError}</div>
            )}
          </form>

          <div className="lg:col-span-7">
            {trackResult ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="track-result"
                className="rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-navy/50">Ticket</div>
                    <div className="font-mono text-xl font-bold">{trackResult.ticket_id}</div>
                  </div>
                  <StatusPill status={trackResult.current_status} />
                </div>
                <div className="mt-4 text-sm text-navy/80">
                  <span className="font-semibold">{trackResult.category}</span> · {trackResult.location}
                </div>
                <div className="mt-1 text-sm text-navy/60">{trackResult.description}</div>
                {trackResult.ai_summary && (
                  <div className="mt-4 rounded-xl bg-linen border border-navy/5 p-4 text-sm">
                    <div className="text-[10px] uppercase tracking-widest text-navy/50 mb-1">AI Triage</div>
                    <div>{trackResult.ai_summary}</div>
                    <div className="mt-2 text-xs text-navy/60">
                      Priority <b className="text-saffron">{trackResult.ai_priority}</b> · Routed to{" "}
                      <b>{trackResult.ai_department}</b>
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  <div className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                    {lang === "hi" ? "टाइमलाइन" : "Timeline"}
                  </div>
                  <Timeline current={trackResult.current_status} entries={trackResult.timeline} />
                </div>
              </motion.div>
            ) : (
              <div className="rounded-2xl bg-white border border-dashed border-navy/15 p-10 text-center text-sm text-navy/50">
                <Search size={20} className="mx-auto mb-3 text-navy/30" />
                {lang === "hi"
                  ? "अपनी टिकट आईडी दर्ज करें और लाइव स्थिति देखें।"
                  : "Enter your ticket ID to view live status timeline."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintTracker;
