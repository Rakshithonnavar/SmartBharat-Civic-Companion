import React, { createContext, useContext, useState, useMemo } from "react";

const LanguageContext = createContext(null);

const dict = {
  en: {
    brand: "Smart Bharat",
    tagline: "Your AI companion for everyday civic life.",
    nav: {
      home: "Home",
      chat: "AI Companion",
      complaints: "Complaints",
      services: "Find Schemes",
      documents: "Documents",
    },
    hero: {
      eyebrow: "GenAI · Powered by Google Gemini",
      title1: "Navigate India's",
      title2: "government services",
      title3: "without the paperwork maze.",
      subtitle:
        "Ask any civic question, file complaints in seconds, discover schemes tailored to you, and get exact document checklists — all in one intelligent workspace.",
      ctaPrimary: "Talk to CivicMate",
      ctaSecondary: "File a complaint",
    },
    features: {
      chat: {
        title: "AI Civic Companion",
        desc: "Ask anything about Aadhaar, PAN, ration cards, subsidies. Answers in your language.",
      },
      complaints: {
        title: "Smart Complaint Tracker",
        desc: "AI-triaged tickets routed to the right department with full status timeline.",
      },
      services: {
        title: "Personalised Scheme Finder",
        desc: "Enter your profile — get schemes you're eligible for, ranked by fit.",
      },
      documents: {
        title: "Document Guidance",
        desc: "For any service — get the exact document checklist, steps, and where to apply.",
      },
    },
    stats: {
      title: "Built for scale, designed for citizens",
      resolved: "Complaints resolved",
      helped: "Citizens assisted",
      services: "Schemes indexed",
      languages: "Languages",
    },
    lang: {
      en: "EN",
      hi: "हिं",
    },
    footer: "Made for DEVENGERS PromptWars 2026",
  },
  hi: {
    brand: "स्मार्ट भारत",
    tagline: "आपका दैनिक नागरिक जीवन का एआई साथी।",
    nav: {
      home: "होम",
      chat: "एआई साथी",
      complaints: "शिकायत",
      services: "योजनाएँ",
      documents: "दस्तावेज़",
    },
    hero: {
      eyebrow: "जनरेटिव एआई · Google Gemini द्वारा संचालित",
      title1: "भारत की सरकारी सेवाओं तक",
      title2: "बिना कागज़ी झंझट के",
      title3: "आसान पहुँच।",
      subtitle:
        "किसी भी नागरिक प्रश्न का उत्तर पाएँ, कुछ ही सेकंड में शिकायत दर्ज करें, आपके लिए बनी योजनाएँ खोजें और ज़रूरी दस्तावेज़ों की सूची पाएँ — सब एक ही जगह।",
      ctaPrimary: "CivicMate से बात करें",
      ctaSecondary: "शिकायत दर्ज करें",
    },
    features: {
      chat: {
        title: "एआई नागरिक साथी",
        desc: "आधार, पैन, राशन कार्ड, सब्सिडी — कुछ भी पूछें। आपकी भाषा में उत्तर।",
      },
      complaints: {
        title: "स्मार्ट शिकायत ट्रैकर",
        desc: "एआई द्वारा वर्गीकृत शिकायतें सही विभाग तक और पूरी स्थिति टाइमलाइन।",
      },
      services: {
        title: "व्यक्तिगत योजना खोजक",
        desc: "अपनी जानकारी दें — आपके लिए उपयुक्त योजनाएँ प्राथमिकता के अनुसार।",
      },
      documents: {
        title: "दस्तावेज़ मार्गदर्शन",
        desc: "किसी भी सेवा के लिए — सटीक दस्तावेज़ सूची, प्रक्रिया और आवेदन स्थान।",
      },
    },
    stats: {
      title: "स्केल के लिए बनाया गया, नागरिकों के लिए डिज़ाइन किया गया",
      resolved: "शिकायतें हल",
      helped: "नागरिकों की सहायता",
      services: "योजनाएँ शामिल",
      languages: "भाषाएँ",
    },
    lang: { en: "EN", hi: "हिं" },
    footer: "DEVENGERS PromptWars 2026 के लिए बनाया गया",
  },
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState("en");
  const value = useMemo(
    () => ({ lang, setLang, t: dict[lang], toggle: () => setLang((l) => (l === "en" ? "hi" : "en")) }),
    [lang]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
};
