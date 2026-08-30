import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, ArrowRight, ListChecks, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { adminApi } from "@/lib/adminApi";
import { useAdminAuth } from "@/context/AdminAuthContext";

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
      <Icon size={16} aria-hidden="true" />
    </div>
    <div className="mt-3 text-2xl font-black text-navy">{value}</div>
    <div className="text-xs text-navy/50 mt-0.5">{label}</div>
  </div>
);

const STATUS_STYLES = {
  Submitted: "bg-navy/10 text-navy",
  "Under Review": "bg-aihighlight/20 text-aihighlight",
  "In Progress": "bg-saffron/15 text-saffron",
  Resolved: "bg-emerald/15 text-emerald",
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

const AdminDashboard = () => {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, listRes] = await Promise.all([
          adminApi.stats(),
          adminApi.listComplaints({ page: 1, page_size: 5 }),
        ]);
        if (!cancelled) {
          setStats(statsRes);
          setRecent(listRes.items);
        }
      } catch {
        if (!cancelled) setError("Couldn't load dashboard data. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status">
        <Loader2 className="animate-spin text-navy" size={24} aria-hidden="true" />
        <span className="sr-only">Loading dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
        <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-6 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      </div>
    );
  }

  const categoryData = Object.entries(stats.by_category).map(([name, count]) => ({ name, count }));

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-black">
          Welcome back, {admin?.name?.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-navy/60">Here's what's happening with citizen complaints.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListChecks} label="Total complaints" value={stats.total} accent="bg-navy/10 text-navy" />
        <StatCard
          icon={Clock}
          label="Submitted"
          value={stats.by_status.Submitted || 0}
          accent="bg-navy/10 text-navy"
        />
        <StatCard
          icon={AlertTriangle}
          label="In progress"
          value={stats.by_status["In Progress"] || 0}
          accent="bg-saffron/15 text-saffron"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats.by_status.Resolved || 0}
          accent="bg-emerald/15 text-emerald"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-7 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-navy/60 mb-4">
            By category
          </div>
          {categoryData.length === 0 ? (
            <div className="text-sm text-navy/40 py-8 text-center">No complaints yet.</div>
          ) : (
            <div className="h-64" role="img" aria-label="Bar chart of complaints by category">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0B132B0D" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#0B132B99" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11, fill: "#0B132B99" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #0B132B1A", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#E05D36" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              Recent complaints
            </div>
            <Link
              to="/admin/complaints"
              className="text-xs font-semibold text-saffron hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-navy/40 py-8 text-center">No complaints yet.</div>
          ) : (
            <ul className="space-y-3">
              {recent.map((c) => (
                <li key={c.ticket_id}>
                  <Link
                    to="/admin/complaints"
                    state={{ openTicket: c.ticket_id }}
                    className="block rounded-xl border border-navy/5 hover:border-saffron/40 p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-navy truncate">
                        {c.ticket_id}
                      </span>
                      <StatusPill status={c.current_status} />
                    </div>
                    <div className="mt-1 text-sm text-navy/80 truncate">
                      {c.citizen_name} · {c.category}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
