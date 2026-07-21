import { Headphones, Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";
import { buildPageSpeech } from "../../utils/pageSpeech";

// Pick the best installed voice for the wanted language; falls back to the
// browser default if none is installed.
const pickVoice = (synth, lang) => {
  const voices = synth.getVoices() || [];
  const prefix = lang.slice(0, 2).toLowerCase();
  return (
    voices.find((voice) => voice.lang?.toLowerCase() === lang.toLowerCase()) ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix)) ||
    null
  );
};

// Site-wide "Listen to this page" control. Uses the browser's built-in
// SpeechSynthesis — no library, no network, works offline. Reads the main
// content of whatever page the visitor is on. Practical accessibility aid
// (GIGW/STQC value text-to-speech) reachable from every page, not just the
// Screen Reader Access page.
const ReadAloudButton = () => {
  const { t, isHindi } = useLanguage();
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const location = useLocation();
  const utterRef = useRef(null);

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  // Chrome loads voices asynchronously; if speak() runs before they exist the
  // first click is silent. Warm the voice list up front so the very first
  // click speaks.
  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    synth.getVoices();
    const onVoices = () => synth.getVoices();
    synth.addEventListener?.("voiceschanged", onVoices);
    return () => synth.removeEventListener?.("voiceschanged", onVoices);
  }, [supported]);

  // Stop reading when the route changes (cleanup fires on pathname change and
  // on unmount) so speech never bleeds across pages.
  useEffect(() => {
    if (!supported) return undefined;
    return () => {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setPaused(false);
    };
  }, [supported, location.pathname]);

  if (!supported) {
    return null;
  }

  const start = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    // Defeats Chrome's "stuck paused" state from an earlier pause.
    synth.resume();

    const main = document.getElementById("main-content");
    const text = buildPageSpeech(main, t);
    if (!text) {
      return;
    }

    const lang = isHindi ? "hi-IN" : "en-IN";
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voice = pickVoice(synth, lang);
    if (voice) {
      utter.voice = voice;
    }
    utter.rate = 1;
    utter.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utter.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };

    utterRef.current = utter;
    synth.speak(utter);
    setSpeaking(true);
    setPaused(false);
  };

  const togglePause = () => {
    const synth = window.speechSynthesis;
    if (paused) {
      synth.resume();
      setPaused(false);
    } else {
      synth.pause();
      setPaused(true);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-[110] flex items-center gap-2">
      {!speaking ? (
        <button
          type="button"
          onClick={start}
          aria-label={t("Listen to this page")}
          title={t("Listen to this page")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#0b6fa4]/20 bg-white/94 px-3.5 text-sm font-bold text-[#0b6fa4] shadow-[0_14px_36px_rgba(18,50,74,0.16)] backdrop-blur-md transition duration-300 hover:border-[#0b6fa4]/45 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#0b6fa4]"
        >
          <Headphones className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">{t("Listen")}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/94 p-1 shadow-[0_14px_36px_rgba(18,50,74,0.16)] backdrop-blur-md">
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? t("Resume") : t("Pause")}
            title={paused ? t("Resume") : t("Pause")}
            className="grid h-9 w-9 place-items-center rounded-lg text-[#0b6fa4] transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
          >
            {paused ? (
              <Play className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Pause className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label={t("Stop")}
            title={t("Stop")}
            className="grid h-9 w-9 place-items-center rounded-lg text-[#d71920] transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d71920]"
          >
            <Square className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
      <span aria-live="polite" className="sr-only">
        {speaking ? (paused ? t("Paused") : t("Reading aloud")) : t("Stopped")}
      </span>
    </div>
  );
};

export default ReadAloudButton;
