import React, { useState } from "react";
import { motion } from "framer-motion";
import { Compass, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Haryana",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha",
  "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Other",
];

const ServiceFinder = () => {
  const { lang } = useLang();
  const [form, setForm] = useState({
    age: 30,
    occupation: "Farmer",
    state: "Maharashtra",
    income: "Below ₹2 lakh/year",
    needs: "",
  });
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setServices([]);
    try {
      const res = await api.recommend({ ...form, language: lang });
      setServices(res.services || []);
    } catch (e) {
      setError(
        lang === "hi"
          ? "एआई से जुड़ नहीं सका। फिर से प्रयास करें।"
          : "Could not reach the AI. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald/15 text-emerald flex items-center justify-center">
          <Compass size={18} />
        </div>
        <div>
          <h1 className="font-heading text-4xl font-black">
            {lang === "hi" ? "व्यक्तिगत योजना खोजक" : "Personalised Scheme Finder"}
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            {lang === "hi"
              ? "अपनी जानकारी दें और उपयुक्त सरकारी योजनाएँ पाएँ।"
              : "Tell us who you are — get schemes ranked for you by Gemini."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form
          onSubmit={submit}
          className="lg:col-span-4 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-4 h-fit"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              {lang === "hi" ? "आयु" : "Age"}
            </span>
            <input
              data-testid="input-age"
              type="number"
              min={1}
              max={120}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: parseInt(e.target.value || "0") })}
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron outline-none px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              {lang === "hi" ? "व्यवसाय" : "Occupation"}
            </span>
            <input
              data-testid="input-occupation"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              placeholder="Farmer, Student, Small Business…"
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron outline-none px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              {lang === "hi" ? "राज्य" : "State"}
            </span>
            <select
              data-testid="input-state"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron outline-none px-4 py-2.5 text-sm"
            >
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              {lang === "hi" ? "आय (वैकल्पिक)" : "Annual income (optional)"}
            </span>
            <input
              data-testid="input-income"
              value={form.income}
              onChange={(e) => setForm({ ...form, income: e.target.value })}
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron outline-none px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-navy/60">
              {lang === "hi" ? "आवश्यकताएँ (वैकल्पिक)" : "Needs (optional)"}
            </span>
            <textarea
              data-testid="input-needs"
              rows={3}
              value={form.needs}
              onChange={(e) => setForm({ ...form, needs: e.target.value })}
              placeholder={lang === "hi" ? "जैसे: घर, शिक्षा…" : "e.g., housing, education, health…"}
              className="mt-1.5 w-full rounded-xl bg-linen border border-navy/10 focus:border-saffron outline-none px-4 py-2.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            data-testid="find-schemes-btn"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {lang === "hi" ? "योजनाएँ खोजें" : "Find my schemes"}
          </button>
        </form>

        <div className="lg:col-span-8">
          {error && (
            <div className="mb-4 text-sm text-red-600" data-testid="services-error">
              {error}
            </div>
          )}
          {loading && (
            <div className="rounded-2xl bg-white border border-dashed border-navy/15 p-10 text-center text-sm text-navy/50">
              <Loader2 size={22} className="mx-auto mb-3 animate-spin text-saffron" />
              {lang === "hi"
                ? "एआई आपके लिए सर्वोत्तम योजनाएँ चुन रहा है…"
                : "Gemini is curating the best schemes for you…"}
            </div>
          )}
          {!loading && services.length === 0 && !error && (
            <div className="rounded-2xl bg-white border border-dashed border-navy/15 p-10 text-center text-sm text-navy/50">
              <Compass size={22} className="mx-auto mb-3 text-navy/30" />
              {lang === "hi"
                ? "अपनी जानकारी भरें और परिणाम यहाँ दिखाई देंगे।"
                : "Fill your profile — matched schemes will appear here."}
            </div>
          )}
          {services.length > 0 && (
            <div
              data-testid="services-grid"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {services.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl bg-white border border-navy/5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald bg-emerald/10 rounded-full px-2 py-1">
                      {s.category}
                    </span>
                  </div>
                  <h3 className="mt-3 font-heading text-xl font-bold text-navy">
                    {s.name}
                  </h3>
                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <div className="uppercase tracking-widest text-navy/50 font-semibold mb-0.5">
                        {lang === "hi" ? "पात्रता" : "Eligibility"}
                      </div>
                      <div className="text-navy/80">{s.eligibility}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-widest text-navy/50 font-semibold mb-0.5">
                        {lang === "hi" ? "लाभ" : "Benefits"}
                      </div>
                      <div className="text-navy/80">{s.benefits}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-widest text-navy/50 font-semibold mb-0.5">
                        {lang === "hi" ? "आवेदन प्रक्रिया" : "How to apply"}
                      </div>
                      <div className="text-navy/80">{s.how_to_apply}</div>
                    </div>
                  </div>
                  {s.portal && (
                    <a
                      href={s.portal.startsWith("http") ? s.portal : `https://${s.portal}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-saffron hover:underline"
                    >
                      {s.portal} <ExternalLink size={12} />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceFinder;
