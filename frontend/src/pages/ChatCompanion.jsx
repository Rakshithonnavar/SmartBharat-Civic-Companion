import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, Mic, MicOff, Volume2, VolumeX, Clock3 } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { useColdStartNotice } from "@/hooks/useColdStartNotice";
import { useOfflineForm } from "@/hooks/useOfflineForm";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { isOfflineError } from "@/lib/networkError";
import { genId } from "@/lib/offlineDb";
import OfflineStatusBadge from "@/components/OfflineStatusBadge";

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
      id: "welcome",
      role: "assistant",
      content:
        lang === "hi"
          ? "नमस्ते! मैं CivicMate हूँ। सरकारी सेवा, योजना, या दस्तावेज़ के बारे में कुछ भी पूछें।"
          : "Namaste! I'm CivicMate. Ask me anything about Indian government services, schemes, or documents.",
    },
  ]);
  const [input, setInput] = useOfflineForm("chat_input_draft", "");
  const [loading, setLoading] = useState(false);
  const showColdStart = useColdStartNotice(loading);
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const { pendingCount, online, enqueue } = useOfflineQueue(
    "chat_messages",
    (payload) => api.chat(payload),
    {
      onSuccess: (result, payload, meta) => {
        setMessages((m) => {
          const withSent = m.map((msg) =>
            msg.id === meta?.messageId ? { ...msg, status: "sent" } : msg
          );
          return [
            ...withSent,
            { id: genId(), role: "assistant", content: result.reply },
          ];
        });
        if (ttsOn) speak(result.reply);
      },
    }
  );

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
  }, [lang, setInput]);

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
    const messageId = genId();
    const nextMsgs = [...messages, { id: messageId, role: "user", content: msg, status: "sent" }];
    setMessages(nextMsgs);
    setLoading(true);
    // Strip our local id/status fields before sending — backend only expects role/content
    const history = nextMsgs.slice(-8).map(({ role, content }) => ({ role, content }));
    const payload = { message: msg, language: lang, history };
    try {
      const res = await api.chat(payload);
      setMessages((m) => [...m, { id: genId(), role: "assistant", content: res.reply }]);
      if (ttsOn) speak(res.reply);
    } catch (e) {
      if (isOfflineError(e)) {
        setMessages((m) =>
          m.map((mm) => (mm.id === messageId ? { ...mm, status: "pending" } : mm))
        );
        try {
          await enqueue(payload, { messageId });
        } catch {
          setMessages((m) =>
            m.map((mm) => (mm.id === messageId ? { ...mm, status: "failed" } : mm))
          );
        }
      } else {
        setMessages((m) => [
          ...m,
          {
            id: genId(),
            role: "assistant",
            content:
              lang === "hi"
                ? "क्षमा करें, अभी उत्तर देने में समस्या है।"
                : "Sorry, I couldn't reach the AI right now. Please try again.",
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const prompts = lang === "hi" ? QUICK_PROMPTS_HI : QUICK_PROMPTS_EN;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div aria-hidden="true" className="h-10 w-10 rounded-xl bg-navy text-white flex items-center justify-center">
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
          aria-pressed={ttsOn}
          title={ttsOn ? "Turn voice output off" : "Turn voice output on"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            ttsOn
              ? "bg-emerald text-white border-emerald"
              : "bg-white border-navy/15 text-navy/70 hover:border-saffron hover:text-saffron"
          }`}
        >
          {ttsOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
          {lang === "hi" ? "पढ़कर सुनाएँ" : "Read aloud"}
        </button>
      </div>

      <OfflineStatusBadge online={online} pendingCount={pendingCount} lang={lang} />

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
        role="log"
        aria-live="polite"
        aria-label={lang === "hi" ? "बातचीत" : "Conversation"}
        className="rounded-2xl bg-white border border-navy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 min-h-[420px] max-h-[60vh] overflow-y-auto space-y-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={m.id || i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
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
              {m.role === "user" && m.status === "pending" && (
                <div
                  data-testid={`msg-pending-${i}`}
                  className="mt-1 flex items-center gap-1 text-[10px] text-navy/40"
                >
                  <Clock3 size={10} />
                  {lang === "hi" ? "ऑफ़लाइन — कनेक्शन आने पर भेजा जाएगा" : "Offline — will send once you're back online"}
                </div>
              )}
              {m.role === "user" && m.status === "failed" && (
                <div
                  data-testid={`msg-failed-${i}`}
                  className="mt-1 text-[10px] text-red-500"
                >
                  {lang === "hi" ? "सेव नहीं हो सका" : "Could not be saved"}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex flex-col items-start gap-1.5">
            <div className="rounded-2xl rounded-tl-sm bg-linen border border-navy/5 px-4 py-3">
              <span className="sr-only">
                {lang === "hi" ? "CivicMate टाइप कर रहा है…" : "CivicMate is typing…"}
              </span>
              <span aria-hidden="true" className="dot" />
              <span aria-hidden="true" className="dot" />
              <span aria-hidden="true" className="dot" />
            </div>
            {showColdStart && (
              <div className="text-xs text-navy/50 px-1" data-testid="cold-start-notice">
                {lang === "hi"
                  ? "सर्वर को जगाया जा रहा है, पहली बार में एक मिनट तक लग सकता है…"
                  : "Waking up the server — this can take up to a minute on first use…"}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {voiceError && (
        <div
          data-testid="voice-error"
          role="alert"
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
          aria-pressed={listening}
          aria-label={listening ? (lang === "hi" ? "सुनना बंद करें" : "Stop listening") : (lang === "hi" ? "बोलकर पूछें" : "Speak your question")}
          title={listening ? "Stop listening" : "Speak your question"}
          className={`flex-shrink-0 inline-flex items-center justify-center h-12 w-12 rounded-full border transition-all ${
            listening
              ? "bg-saffron border-saffron text-white shadow-[0_0_0_6px_rgba(224,93,54,0.15)] animate-pulse"
              : "bg-white border-navy/15 text-navy hover:border-saffron hover:text-saffron"
          }`}
        >
          {listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
        </button>
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={lang === "hi" ? "अपना संदेश लिखें" : "Type your message"}
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
          aria-busy={loading}
          aria-label={lang === "hi" ? "भेजें" : "Send"}
          className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3.5 text-sm font-semibold text-white hover:bg-saffron disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          <span className="hidden sm:inline" aria-hidden="true">{lang === "hi" ? "भेजें" : "Send"}</span>
        </button>
      </form>

      <p className="mt-3 text-[11px] text-navy/50 flex items-center gap-1.5">
        <Mic size={11} aria-hidden="true" />
        {lang === "hi"
          ? "टिप: माइक दबाकर हिंदी या अंग्रेज़ी में सीधे बोलें। ब्राउज़र सपोर्ट: Chrome, Edge, Safari।"
          : "Tip: Tap the mic and speak — supports Hindi & English. Best on Chrome / Edge / Safari."}
      </p>
    </div>
  );
};

export default ChatCompanion;
