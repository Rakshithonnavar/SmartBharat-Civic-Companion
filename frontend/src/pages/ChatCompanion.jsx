import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
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

// Strip markdown for cleaner TTS output
const cleanForSpeech = (txt) =>
  txt
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#+\s?/g, "")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const ChatCompanion = () => {
  const { lang } = useLang();
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
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ---- Speech-to-Text setup ----
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join("");
      setInput(text);
    };
    r.onerror = (e) => {
      setVoiceError(e.error || "voice error");
      setListening(false);
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    return () => {
      try { r.stop(); } catch (e) { /* noop */ }
    };
  }, [lang]);

  const toggleMic = () => {
    setVoiceError("");
    const r = recognitionRef.current;
    if (!r) {
      setVoiceError(
        lang === "hi"
          ? "आपका ब्राउज़र वॉइस इनपुट का समर्थन नहीं करता। कृपया Chrome का उपयोग करें।"
          : "Your browser does not support voice input. Please use Chrome."
      );
      return;
    }
    if (listening) {
      r.stop();
      setListening(false);
    } else {
      try {
        r.lang = lang === "hi" ? "hi-IN" : "en-IN";
        setInput("");
        r.start();
        setListening(true);
      } catch (err) {
        setVoiceError(err.message || "mic error");
      }
    }
  };

  // ---- Text-to-Speech ----
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    u.rate = 1.02;
    u.pitch = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  const toggleTts = () => {
    if (ttsOn) {
      stopSpeaking();
      setTtsOn(false);
    } else {
      setTtsOn(true);
    }
  };

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    stopSpeaking();
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
      if (ttsOn) speak(res.reply);
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
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-black">
            {lang === "hi" ? "एआई नागरिक साथी" : "AI Civic Companion"}
          </h1>
          <p className="text-sm text-navy/60">
            {lang === "hi"
              ? "Google Gemini 2.5 Flash द्वारा संचालित · आवाज़ से बात करें"
              : "Powered by Google Gemini 2.5 Flash · Talk hands-free"}
          </p>
        </div>
        {/* TTS toggle */}
        <button
          data-testid="tts-toggle-btn"
          onClick={toggleTts}
          title={ttsOn ? "Turn voice output off" : "Turn voice output on"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            ttsOn
              ? "bg-emerald text-white border-emerald"
              : "bg-white border-navy/15 text-navy/70 hover:border-saffron hover:text-saffron"
          }`}
        >
          {ttsOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {lang === "hi" ? "पढ़कर सुनाएँ" : "Read aloud"}
        </button>
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
                {m.role === "assistant" && i === messages.length - 1 && !loading && (
                  <button
                    data-testid={`speak-btn-${i}`}
                    onClick={() => (speaking ? stopSpeaking() : speak(m.content))}
                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-navy/15 bg-white px-2 py-1 text-[10px] font-semibold text-navy/70 hover:border-saffron hover:text-saffron transition-colors"
                  >
                    {speaking ? <VolumeX size={10} /> : <Volume2 size={10} />}
                    {speaking
                      ? (lang === "hi" ? "रोकें" : "Stop")
                      : (lang === "hi" ? "सुनें" : "Listen")}
                  </button>
                )}
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

      {voiceError && (
        <div
          data-testid="voice-error"
          className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
        >
          {voiceError}
        </div>
      )}

      {/* Input row with mic */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 flex items-center gap-2 md:gap-3"
      >
        <button
          type="button"
          onClick={toggleMic}
          data-testid="mic-btn"
          title={listening ? "Stop listening" : "Speak your question"}
          className={`flex-shrink-0 inline-flex items-center justify-center h-12 w-12 rounded-full border transition-all ${
            listening
              ? "bg-saffron border-saffron text-white shadow-[0_0_0_6px_rgba(224,93,54,0.15)] animate-pulse"
              : "bg-white border-navy/15 text-navy hover:border-saffron hover:text-saffron"
          }`}
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            listening
              ? lang === "hi"
                ? "सुन रहा हूँ… बोलें"
                : "Listening… speak now"
              : lang === "hi"
              ? "अपना प्रश्न लिखें या माइक दबाएँ…"
              : "Type your question or tap the mic…"
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
          <span className="hidden sm:inline">{lang === "hi" ? "भेजें" : "Send"}</span>
        </button>
      </form>

      <p className="mt-3 text-[11px] text-navy/50 flex items-center gap-1.5">
        <Mic size={11} />
        {lang === "hi"
          ? "टिप: माइक दबाकर हिंदी या अंग्रेज़ी में सीधे बोलें। ब्राउज़र सपोर्ट: Chrome, Edge, Safari।"
          : "Tip: Tap the mic and speak — supports Hindi & English. Best on Chrome / Edge / Safari."}
      </p>
    </div>
  );
};

export default ChatCompanion;
