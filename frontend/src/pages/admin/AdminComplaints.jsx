import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const CATEGORIES = [
  "Roads & Infrastructure",
  "Water Supply",
  "Electricity",
  "Sanitation & Garbage",
  "Public Health",
  "Street Lighting",
  "Other",
];

const STATUSES = ["Submitted", "Under Review", "In Progress", "Resolved"];
const PRIORITIES = ["high", "medium", "low"];

const STATUS_STYLES = {
  Submitted: "bg-navy/10 text-navy",
  "Under Review": "bg-aihighlight/20 text-aihighlight",
  "In Progress": "bg-saffron/15 text-saffron",
  Resolved: "bg-emerald/15 text-emerald",
};

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700",
  medium: "bg-saffron/15 text-saffron",
  low: "bg-navy/10 text-navy/60",
};

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
      STATUS_STYLES[status] || "bg-navy/10 text-navy"
    }`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    {status}
  </span>
);

const SelectFilter = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full rounded-xl bg-white border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-3 py-2.5 text-sm text-navy"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </label>
);

const DetailModal = ({ ticketId, onClose, onUpdated }) => {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    adminApi
      .getComplaint(ticketId)
      .then((data) => {
        if (cancelled) return;
        setComplaint(data);
        setNewStatus(data.current_status);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this complaint.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitStatus = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const updated = await adminApi.updateStatus(ticketId, { new_status: newStatus, note });
      setComplaint(updated);
      setNote("");
      onUpdated?.(updated);
    } catch {
      setSaveError("Couldn't save this update. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "tween", duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Complaint ${ticketId}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 bg-white border-b border-navy/5 px-6 py-4 flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-navy">{ticketId}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            data-testid="admin-modal-close"
            className="rounded-lg p-1.5 text-navy/40 hover:bg-navy/5 hover:text-navy"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 flex items-center justify-center" role="status">
              <Loader2 className="animate-spin text-navy" size={22} aria-hidden="true" />
              <span className="sr-only">Loading complaint…</span>
            </div>
          ) : error ? (
            <div role="alert" className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} aria-hidden="true" />
              {error}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={complaint.current_status} />
                {complaint.ai_priority && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      PRIORITY_STYLES[complaint.ai_priority] || "bg-navy/10 text-navy"
                    }`}
                  >
                    {complaint.ai_priority} priority
                  </span>
                )}
                <span className="text-[11px] text-navy/40 font-medium">{complaint.category}</span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-navy/70">
                  <User size={14} className="text-navy/30 flex-shrink-0" aria-hidden="true" />
                  {complaint.citizen_name} · {complaint.contact}
                </div>
                <div className="flex items-center gap-2 text-navy/70">
                  <MapPin size={14} className="text-navy/30 flex-shrink-0" aria-hidden="true" />
                  {complaint.location}
                </div>
              </div>

              <p className="mt-4 text-sm text-navy/80 leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>

              {complaint.ai_summary && (
                <div className="mt-4 rounded-xl bg-aihighlight/10 border border-aihighlight/20 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-aihighlight mb-1">
                    AI summary
                  </div>
                  <p className="text-xs text-navy/70">{complaint.ai_summary}</p>
                  {complaint.ai_department && (
                    <p className="text-xs text-navy/50 mt-1">Routed to: {complaint.ai_department}</p>
                  )}
                </div>
              )}

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-navy/60 mb-2">
                  Timeline
                </div>
                <ol className="space-y-2">
                  {(complaint.timeline || []).map((entry, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 size={13} className="text-emerald mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <span className="font-semibold text-navy">{entry.status}</span>
                        {entry.note && <span className="text-navy/60"> — {entry.note}</span>}
                        <div className="text-navy/40 mt-0.5 flex items-center gap-1">
                          <Clock size={10} aria-hidden="true" />
                          {new Date(entry.timestamp).toLocaleString()}
                          {entry.updated_by && <span> · {entry.updated_by}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <form onSubmit={submitStatus} className="mt-6 border-t border-navy/5 pt-6 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                  Update status
                </div>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  aria-label="New status"
                  data-testid="admin-modal-status-select"
                  className="w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-3 py-2.5 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for this update (optional)"
                  rows={2}
                  aria-label="Status update note"
                  data-testid="admin-modal-note"
                  className="w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-3 py-2.5 text-sm resize-none"
                />
                {saveError && (
                  <div role="alert" className="text-xs text-red-700">
                    {saveError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={saving || newStatus === complaint.current_status && !note}
                  aria-busy={saving}
                  data-testid="admin-modal-save"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  Save update
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const PAGE_SIZE = 12;

const AdminComplaints = () => {
  const location = useLocation();
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTicket, setOpenTicket] = useState(location.state?.openTicket || null);

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      ...(status && { status }),
      ...(category && { category }),
      ...(priority && { priority }),
      ...(search && { search }),
    }),
    [page, status, category, priority, search]
  );

  const fetchData = React.useCallback(() => {
    setLoading(true);
    setError("");
    adminApi
      .listComplaints(params)
      .then(setData)
      .catch(() => setError("Couldn't load complaints. Please refresh."))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const resetFilters = () => {
    setStatus("");
    setCategory("");
    setPriority("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-black">Complaints</h1>
        <p className="mt-2 text-sm text-navy/60">
          {data.total} complaint{data.total === 1 ? "" : "s"} total
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, ticket ID, description…"
            aria-label="Search complaints"
            data-testid="admin-complaints-search"
            className="w-full rounded-xl bg-white border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none pl-9 pr-3 py-2.5 text-sm"
          />
        </div>
        <SelectFilter
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUSES}
        />
        <SelectFilter
          label="Category"
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
          options={CATEGORIES}
        />
        <SelectFilter
          label="Priority"
          value={priority}
          onChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
          options={PRIORITIES}
        />
      </div>

      {(status || category || priority || search) && (
        <button
          onClick={resetFilters}
          data-testid="admin-complaints-clear-filters"
          className="mb-4 text-xs font-semibold text-saffron hover:underline"
        >
          Clear filters
        </button>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center" role="status">
          <Loader2 className="animate-spin text-navy" size={24} aria-hidden="true" />
          <span className="sr-only">Loading complaints…</span>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-6 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-navy/15 p-12 text-center text-sm text-navy/40">
          No complaints match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((c) => (
            <button
              key={c.ticket_id}
              onClick={() => setOpenTicket(c.ticket_id)}
              data-testid={`admin-complaint-row-${c.ticket_id}`}
              className="w-full text-left rounded-2xl bg-white border border-navy/5 hover:border-saffron/40 shadow-[0_4px_16px_rgb(0,0,0,0.03)] p-4 sm:p-5 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-navy">{c.ticket_id}</span>
                  <StatusPill status={c.current_status} />
                  {c.ai_priority && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                        PRIORITY_STYLES[c.ai_priority] || "bg-navy/10 text-navy"
                      }`}
                    >
                      {c.ai_priority}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-navy/40">{c.category}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-navy">{c.citizen_name}</div>
              <p className="mt-0.5 text-xs text-navy/50 truncate">{c.description}</p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-navy/40">
                <MapPin size={11} aria-hidden="true" />
                {c.location}
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && data.total > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <span className="text-xs text-navy/50">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              data-testid="admin-complaints-prev-page"
              className="rounded-full p-2 border border-navy/10 text-navy disabled:opacity-30 hover:bg-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              data-testid="admin-complaints-next-page"
              className="rounded-full p-2 border border-navy/10 text-navy disabled:opacity-30 hover:bg-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {openTicket && (
          <DetailModal
            ticketId={openTicket}
            onClose={() => setOpenTicket(null)}
            onUpdated={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminComplaints;
