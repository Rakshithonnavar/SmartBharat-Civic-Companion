import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MessageSquare, ClipboardList, Compass, FileCheck2, Sparkles } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

const featureIcon = {
  chat: MessageSquare,
  complaints: ClipboardList,
  services: Compass,
  documents: FileCheck2,
};

const featureLinks = {
  chat: "/chat",
  complaints: "/complaints",
  services: "/services",
  documents: "/documents",
};

const Stat = ({ value, label }) => (
  <div>
    <div className="font-mono text-4xl md:text-5xl font-bold text-white tabular-nums">
      {value}
    </div>
    <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/60">
      {label}
    </div>
  </div>
);

const Home = () => {
  const { t, lang } = useLang();
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    citizens_helped: 1240,
    services_indexed: 180,
  });

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="grain-bg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-navy/70">
              <Sparkles size={12} className="text-saffron" />
              {t.hero.eyebrow}
            </div>

            <h1 className="mt-6 font-heading text-5xl md:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight">
              <span className="block">{t.hero.title1}</span>
              <span className="block">
                <span className="text-saffron">{t.hero.title2}</span>
              </span>
              <span className="block">{t.hero.title3}</span>
            </h1>

            <p className="mt-6 max-w-xl text-base md:text-lg text-navy/70 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/chat"
                data-testid="hero-cta-chat"
                className="group inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white hover:bg-saffron transition-colors"
              >
                {t.hero.ctaPrimary}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/complaints"
                data-testid="hero-cta-complaint"
                className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-white px-6 py-3.5 text-sm font-semibold text-navy hover:border-navy transition-colors"
              >
                {t.hero.ctaSecondary}
              </Link>
            </div>
          </motion.div>

          {/* Bento preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5 grid grid-cols-6 gap-4"
          >
            <div className="col-span-6 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-navy/50">
                  CivicMate · Live
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald animate-pulse" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-linen border border-navy/5 px-4 py-2.5 text-sm">
                  {lang === "hi"
                    ? "मुझे आधार अपडेट कैसे करना चाहिए?"
                    : "How do I update my Aadhaar address?"}
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-navy px-4 py-2.5 text-sm text-white">
                  {lang === "hi"
                    ? "आप uidai.gov.in पर लॉगिन करके एड्रेस अपडेट कर सकते हैं…"
                    : "Log in to uidai.gov.in with your Aadhaar + OTP, choose Update Address, upload proof (utility bill / rent agreement)…"}
                </div>
              </div>
            </div>

            <div className="col-span-3 rounded-2xl bg-navy text-white p-5">
              <div className="text-[11px] uppercase tracking-widest text-white/50">
                Ticket
              </div>
              <div className="mt-2 font-mono text-lg font-bold">
                SB-A9F2C817
              </div>
              <div className="mt-3 text-xs text-white/70">
                Water pipeline burst — Sector 21
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-saffron px-2.5 py-1 text-[10px] font-bold uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                In Progress
              </div>
            </div>

            <div className="col-span-3 rounded-2xl bg-emerald/10 border border-emerald/20 p-5">
              <div className="text-[11px] uppercase tracking-widest text-emerald">
                Eligible scheme
              </div>
              <div className="mt-2 font-heading font-bold text-navy">
                PM-KISAN
              </div>
              <div className="mt-2 text-xs text-navy/70 leading-relaxed">
                ₹6,000/year direct benefit for small farmers. 3-doc application.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURE BENTO */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {Object.entries(t.features).map(([key, f], i) => {
            const Icon = featureIcon[key];
            const spans = {
              chat: "md:col-span-7",
              complaints: "md:col-span-5",
              services: "md:col-span-5",
              documents: "md:col-span-7",
            };
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`${spans[key]} rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group`}
              >
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-navy/5 text-navy flex items-center justify-center group-hover:bg-saffron group-hover:text-white transition-colors">
                    <Icon size={18} />
                  </div>
                  <Link
                    to={featureLinks[key]}
                    data-testid={`feature-link-${key}`}
                    className="text-xs font-semibold uppercase tracking-widest text-navy/60 hover:text-saffron inline-flex items-center gap-1"
                  >
                    Open <ArrowRight size={12} />
                  </Link>
                </div>
                <h3 className="mt-6 font-heading text-2xl font-bold text-navy">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-navy/70 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* STATS */}
      <section className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold max-w-2xl">
            {t.stats.title}
          </h2>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat value={stats.resolved} label={t.stats.resolved} />
            <Stat value={stats.citizens_helped.toLocaleString()} label={t.stats.helped} />
            <Stat value={stats.services_indexed} label={t.stats.services} />
            <Stat value="2" label={t.stats.languages} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
