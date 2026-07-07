import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileCheck2, Loader2, MapPin, Clock, Sparkles, CheckCircle2, Lightbulb } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

const COMMON = [
  "Aadhaar Card",
  "PAN Card",
  "Passport",
  "Driving Licence",
  "Voter ID",
  "Ration Card",
  "Birth Certificate",
  "Income Certificate",
];

const DocumentGuidance = () => {
  const { lang } = useLang();
  const [service, setService] = useState("Passport");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const fetchGuidance = async (svc) => {
    const value = (svc ?? service).trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await api.documents({ service: value, language: lang });
      setData(res);
    } catch (e) {
      setError(lang === "hi" ? "एआई से जुड़ नहीं सका।" : "Could not fetch guidance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-saffron/15 text-saffron flex items-center justify-center">
          <FileCheck2 size={18} />
        </div>
        <div>
          <h1 className="font-heading text-4xl font-black">
            {lang === "hi" ? "दस्तावेज़ मार्गदर्शन" : "Document Guidance"}
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            {lang === "hi"
              ? "किसी भी सेवा के लिए दस्तावेज़ सूची और प्रक्रिया।"
              : "Get an exact document checklist, process steps, and where to apply — for any service."}
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchGuidance();
        }}
        className="flex flex-col md:flex-row gap-3 mb-6"
      >
        <input
          data-testid="doc-service-input"
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder={lang === "hi" ? "जैसे: पासपोर्ट, ड्राइविंग लाइसेंस…" : "e.g., Passport, Driving Licence…"}
          className="flex-1 rounded-full bg-white border border-navy/15 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-5 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !service.trim()}
          data-testid="doc-fetch-btn"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {lang === "hi" ? "मार्गदर्शन पाएँ" : "Get guidance"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-8">
        {COMMON.map((c) => (
          <button
            key={c}
            onClick={() => {
              setService(c);
              fetchGuidance(c);
            }}
            data-testid={`doc-chip-${c.replace(/\s+/g, "-")}`}
            className="rounded-full border border-navy/15 bg-white px-3.5 py-1.5 text-xs text-navy/80 hover:border-saffron hover:text-saffron transition-colors"
          >
            {c}
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 mb-4" data-testid="doc-error">{error}</div>}

      {loading && (
        <div className="rounded-2xl bg-white border border-dashed border-navy/15 p-10 text-center text-sm text-navy/50">
          <Loader2 size={22} className="mx-auto mb-3 animate-spin text-saffron" />
          {lang === "hi" ? "एआई आपके लिए चेकलिस्ट तैयार कर रहा है…" : "Gemini is preparing your checklist…"}
        </div>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="doc-result"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          <div className="lg:col-span-7 rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <h2 className="font-heading text-2xl font-bold">{data.service}</h2>
            <div className="mt-1 text-xs uppercase tracking-widest text-navy/50">
              {lang === "hi" ? "आवश्यक दस्तावेज़" : "Required documents"}
            </div>
            <ul className="mt-4 space-y-2.5">
              {data.required_documents?.map((d, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 size={16} className="mt-0.5 text-emerald flex-shrink-0" />
                  <span className="text-navy/85">{d}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-navy/5 pt-4">
              <div className="text-xs uppercase tracking-widest text-navy/50 mb-2">
                {lang === "hi" ? "प्रक्रिया चरण" : "Process steps"}
              </div>
              <ol className="space-y-2">
                {data.process_steps?.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-navy/85">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-navy text-white p-5">
              <div className="text-[10px] uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                <MapPin size={12} /> {lang === "hi" ? "आवेदन कहाँ करें" : "Where to apply"}
              </div>
              <div className="mt-2 text-sm text-white/95">{data.where_to_apply}</div>
            </div>
            <div className="rounded-2xl bg-emerald/10 border border-emerald/20 p-5">
              <div className="text-[10px] uppercase tracking-widest text-emerald flex items-center gap-1.5">
                <Clock size={12} /> {lang === "hi" ? "अनुमानित समय" : "Estimated time"}
              </div>
              <div className="mt-2 text-sm font-semibold text-navy">
                {data.estimated_time}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-saffron/30 p-5">
              <div className="text-[10px] uppercase tracking-widest text-saffron flex items-center gap-1.5">
                <Lightbulb size={12} /> {lang === "hi" ? "सुझाव" : "Tips"}
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-navy/80">
                {data.tips?.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-saffron">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DocumentGuidance;
