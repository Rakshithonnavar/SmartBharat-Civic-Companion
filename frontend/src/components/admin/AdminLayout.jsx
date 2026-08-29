import React, { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquareWarning,
  Users,
  LogOut,
  Menu,
  X,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/complaints", label: "Complaints", icon: MessageSquareWarning },
  { to: "/admin/team", label: "Team", icon: Users },
];

const SidebarContent = ({ onNavigate }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? "bg-saffron text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 group">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-saffron"
          >
            <Sparkles size={16} />
          </span>
          <span className="font-heading font-black text-lg tracking-tight text-white">
            Smart Bharat
          </span>
        </Link>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-white/40 font-mono">
          Admin Console
        </div>
      </div>

      <nav aria-label="Admin" className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} onClick={onNavigate}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="px-4 py-2 mb-2">
          <div className="text-sm font-semibold text-white truncate">{admin?.name}</div>
          <div className="text-xs text-white/50 truncate">{admin?.email}</div>
        </div>
        <a
          href="/"
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ExternalLink size={16} aria-hidden="true" />
          View public site
        </a>
        <button
          onClick={handleLogout}
          data-testid="admin-logout-btn"
          className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );
};

const AdminLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-linen text-navy flex">
      {/* Desktop sidebar — fixed, always visible at md+ */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-navy sticky top-0 h-screen flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar — slide-over drawer with backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-navy z-50 md:hidden"
            >
              <div className="flex justify-end p-3">
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  data-testid="admin-mobile-close-btn"
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </React.Fragment>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-navy flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            data-testid="admin-mobile-menu-btn"
            className="rounded-lg p-2 text-white/80 hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          <span className="font-heading font-black text-white text-sm tracking-tight">
            Smart Bharat Admin
          </span>
          <span className="w-9" aria-hidden="true" />
        </header>

        <main id="admin-main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
