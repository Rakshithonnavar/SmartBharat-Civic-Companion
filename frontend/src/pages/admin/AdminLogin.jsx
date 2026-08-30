import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

const AdminLogin = () => {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      const dest = location.state?.from?.pathname || "/admin";
      navigate(dest, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      const dest = location.state?.from?.pathname || "/admin";
      navigate(dest, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 429) {
        setError(detail || "Too many attempts. Please wait and try again.");
      } else if (status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
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
          <h1 className="font-heading text-2xl font-black text-navy">Admin sign in</h1>
          <p className="mt-1 text-sm text-navy/60">
            Manage citizen complaints and municipal responses.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="admin-login-email"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="admin-login-password"
                  className="w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-4 py-2.5 pr-11 text-sm"
                  placeholder="••••••••"
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
            </label>

            {error && (
              <div
                role="alert"
                data-testid="admin-login-error"
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
              data-testid="admin-login-submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Setting this up for the first time?{" "}
          <Link to="/admin/setup" className="text-white/70 hover:text-saffron underline">
            Create the first admin account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
