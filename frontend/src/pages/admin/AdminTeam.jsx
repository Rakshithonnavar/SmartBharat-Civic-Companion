import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, UserPlus, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const EMPTY = { name: "", email: "", password: "" };

const AdminTeam = () => {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(null);
    try {
      const created = await adminApi.signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setSuccess(created);
      setForm(EMPTY);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setError("An account with this email already exists.");
      else if (status === 422)
        setError("Check the details — password needs 8+ characters with a mix of letters and numbers.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-12 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-black">Team</h1>
        <p className="mt-2 text-sm text-navy/60">Add another municipal officer as an admin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form
          onSubmit={submit}
          className="lg:col-span-7 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 space-y-4"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              Full name
            </span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="admin-team-name"
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              Email
            </span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="admin-team-email"
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              Temporary password
            </span>
            <input
              type="text"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              data-testid="admin-team-password"
              placeholder="Share this with them securely"
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm font-mono"
            />
            <span className="mt-1 block text-[11px] text-navy/40">
              8+ characters, with a mix of letters and numbers. Share it with them outside this app.
            </span>
          </label>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700"
            >
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            data-testid="admin-team-submit"
            className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus size={16} aria-hidden="true" />
            )}
            Add admin
          </button>
        </form>

        <div aria-live="polite" className="lg:col-span-5">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-emerald/10 border border-emerald/25 p-6"
            >
              <div className="flex items-center gap-2 text-emerald font-semibold text-sm">
                <CheckCircle2 size={16} aria-hidden="true" />
                Admin added
              </div>
              <p className="mt-2 text-sm text-navy/70">
                <b>{success.name}</b> ({success.email}) can now sign in with the password you set.
              </p>
            </motion.div>
          ) : (
            <div className="rounded-2xl bg-white border border-dashed border-navy/15 p-8 text-center text-sm text-navy/50">
              <ShieldAlert size={20} className="mx-auto mb-3 text-navy/30" aria-hidden="true" />
              New admin accounts get full access to citizen complaint data — only add people you
              trust.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTeam;
