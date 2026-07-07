import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { Languages, Sparkles } from "lucide-react";

const Header = () => {
  const { t, lang, toggle } = useLang();

  const navClass = ({ isActive }) =>
    `text-sm tracking-tight transition-colors ${
      isActive
        ? "text-navy font-bold"
        : "text-navy/60 hover:text-saffron"
    }`;

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 bg-linen/80 backdrop-blur-xl border-b border-navy/5"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" data-testid="brand-link" className="flex items-center gap-2 group">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-navy text-white">
            <Sparkles size={16} className="text-saffron" />
          </span>
          <span className="font-heading font-black text-lg tracking-tight">
            {t.brand}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={navClass} data-testid="nav-home">
            {t.nav.home}
          </NavLink>
          <NavLink to="/chat" className={navClass} data-testid="nav-chat">
            {t.nav.chat}
          </NavLink>
          <NavLink to="/complaints" className={navClass} data-testid="nav-complaints">
            {t.nav.complaints}
          </NavLink>
          <NavLink to="/services" className={navClass} data-testid="nav-services">
            {t.nav.services}
          </NavLink>
          <NavLink to="/documents" className={navClass} data-testid="nav-documents">
            {t.nav.documents}
          </NavLink>
        </nav>

        <button
          data-testid="lang-toggle-btn"
          onClick={toggle}
          className="flex items-center gap-2 rounded-full border border-navy/15 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-saffron hover:text-saffron transition-colors"
        >
          <Languages size={14} />
          <span className="tabular-nums">
            {lang === "en" ? "EN → हिं" : "हिं → EN"}
          </span>
        </button>
      </div>
    </header>
  );
};

const Footer = () => {
  const { t } = useLang();
  return (
    <footer className="mt-24 border-t border-navy/10 bg-navy text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-saffron" />
            <span className="font-heading font-black text-xl">{t.brand}</span>
          </div>
          <p className="mt-2 text-sm text-white/60 max-w-md">{t.tagline}</p>
        </div>
        <div className="text-xs text-white/50 font-mono uppercase tracking-widest">
          {t.footer}
        </div>
      </div>
    </footer>
  );
};

const Layout = ({ children }) => (
  <div className="min-h-screen bg-linen text-navy flex flex-col">
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default Layout;
