import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

const AdminSetup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminApi.signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setDone(true);
      setTimeout(() => navigate("/admin/login", { replace: true }), 1800);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 401 || status === 403) {
        setClosed(true);
      } else if (status === 409) {
        setError("An account with this email already exists.");
      } else if (status === 422) {
        setError(
          "Check the details — password needs 8+ characters with a mix of letters and numbers."
        );
      } else {
        setError(typeof detail === "string" ? detail : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-saffron"
          >
            <Sparkles size={18} />
          </span>
          <span className="font-heading font-black text-xl text-white tracking-tight">
            Smart Bharat
          </span>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {closed ? (
            <div className="text-center py-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-navy/5 flex items-center justify-center mb-4">
                <AlertCircle size={20} className="text-navy/40" aria-hidden="true" />
              </div>
              <h1 className="font-heading text-xl font-black text-navy">Setup already complete</h1>
              <p className="mt-2 text-sm text-navy/60">
                An admin account already exists for Smart Bharat. Ask an existing admin to add you
                from their dashboard, or sign in below if that's you.
              </p>
              <Link
                to="/admin/login"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-saffron transition-colors"
              >
                Go to sign in
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4" role="status">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={22} className="text-emerald" aria-hidden="true" />
              </div>
              <h1 className="font-heading text-xl font-black text-navy">Account created</h1>
              <p className="mt-2 text-sm text-navy/60">Taking you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-2xl font-black text-navy">
                Create the first admin account
              </h1>
              <p className="mt-1 text-sm text-navy/60">
                This one-time setup only works while no admin account exists yet.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                    Full name
                  </span>
                  <input
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="admin-setup-name"
                    className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
                    placeholder="Rakshith Onnavar"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="admin-setup-email"
                    className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 text-sm"
                    placeholder="you@municipality.gov.in"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                    Password
                  </span>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="admin-setup-password"
                      className="w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 pr-11 text-sm"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="mt-1 block text-[11px] text-navy/40">
                    8+ characters, with a mix of letters and numbers.
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    data-testid="admin-setup-error"
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
                  data-testid="admin-setup-submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  Create account
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Already have an account?{" "}
          <Link to="/admin/login" className="text-white/70 hover:text-saffron underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminSetup;
