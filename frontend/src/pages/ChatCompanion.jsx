import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

const QUICK_PROMPTS_EN = [
  "How do I apply for Aadhaar?",
  "What is PM-KISAN scheme?",
  "How to get a ration card?",
  "Track my passport application",
  "Documents needed for driving licence",
];
const QUICK_PROMPTS_HI = [
  "आधार के लिए आवेदन कैसे करें?",
  "पीएम-किसान योजना क्या है?",
  "राशन कार्ड कैसे बनवाएँ?",
  "पासपोर्ट आवेदन ट्रैक करें",
  "ड्राइविंग लाइसेंस के लिए दस्तावेज़",
];

const ChatCompanion = () => {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        lang === "hi"
          ? "नमस्ते! मैं CivicMate हूँ। सरकारी सेवा, योजना, या दस्तावेज़ के बारे में कुछ भी पूछें।"
          : "Namaste! I'm CivicMate. Ask me anything about Indian government services, schemes, or documents.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const nextMsgs = [...messages, { role: "user", content: msg }];
    setMessages(nextMsgs);
    setLoading(true);
    try {
      const res = await api.chat({
        message: msg,
        language: lang,
        history: nextMsgs.slice(-8),
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            lang === "hi"
              ? "क्षमा करें, अभी उत्तर देने में समस्या है।"
              : "Sorry, I couldn't reach the AI right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const prompts = lang === "hi" ? QUICK_PROMPTS_HI : QUICK_PROMPTS_EN;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-navy text-white flex items-center justify-center">
          <Sparkles size={18} className="text-saffron" />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-black">
            {lang === "hi" ? "एआई नागरिक साथी" : "AI Civic Companion"}
          </h1>
          <p className="text-sm text-navy/60">
            {lang === "hi"
              ? "Google Gemini 2.5 Flash द्वारा संचालित"
              : "Powered by Google Gemini 2.5 Flash"}
          </p>
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            data-testid={`quick-prompt-${p.substring(0, 12).replace(/\s+/g, "-")}`}
            className="rounded-full border border-navy/15 bg-white px-3.5 py-1.5 text-xs text-navy/80 hover:border-saffron hover:text-saffron transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div
        data-testid="chat-messages"
        className="rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 min-h-[420px] max-h-[60vh] overflow-y-auto space-y-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                data-testid={`msg-${m.role}-${i}`}
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-navy text-white px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    : "max-w-[85%] rounded-2xl rounded-tl-sm bg-linen border border-navy/5 px-4 py-2.5 text-sm text-navy leading-relaxed whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-linen border border-navy/5 px-4 py-3">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 flex items-center gap-3"
      >
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            lang === "hi"
              ? "अपना प्रश्न यहाँ लिखें…"
              : "Ask about any government service…"
          }
          className="flex-1 rounded-full bg-white border border-navy/15 focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none px-5 py-3.5 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          data-testid="chat-send-btn"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {lang === "hi" ? "भेजें" : "Send"}
        </button>
      </form>
    </div>
  );
};

export default ChatCompanion;
