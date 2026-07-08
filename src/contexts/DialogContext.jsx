import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ExternalLink,
  Languages,
  ShieldCheck,
  SquareArrowOutUpRight,
  X,
} from "lucide-react";
import { DialogContext } from "./DialogContextCore";
import { useLanguage } from "../hooks/useLanguage";

// True when an href points to a different origin over http(s). Internal
// router links, in-page anchors, mailto:, and tel: are left untouched.
const isExternalHref = (href) => {
  if (!href) return false;
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
};

const hostOf = (href) => {
  try {
    return new URL(href, window.location.href).host;
  } catch {
    return href;
  }
};

export function DialogProvider({ children }) {
  const { isHindi, setLanguage, language } = useLanguage();
  const [externalTarget, setExternalTarget] = useState(null); // { url, label, target }
  const [pendingLang, setPendingLang] = useState(null); // "hi" | null
  const [doc, setDoc] = useState(null); // { url, title }

  const requestLanguageChange = useCallback(
    (lang) => {
      if (lang === language) return;
      // Only the switch *to* Hindi shows the disclaimer; returning to English
      // is instant.
      if (lang === "hi") {
        setPendingLang("hi");
      } else {
        setLanguage(lang);
      }
    },
    [language, setLanguage]
  );

  const openDocument = useCallback((payload) => {
    if (!payload?.url) return;
    setDoc(payload);
  }, []);

  // Global capture-phase interceptor for outbound links. Any external anchor
  // (PM Gati Shakti, geo-portals, partner sites, etc.) routes through the
  // leaving-site disclaimer unless it opts out with data-no-disclaimer.
  useEffect(() => {
    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.dataset.noDisclaimer !== undefined) return;

      const href = anchor.getAttribute("href");
      if (!isExternalHref(href)) return;

      event.preventDefault();
      event.stopPropagation();
      setExternalTarget({
        url: anchor.href,
        label: (anchor.getAttribute("aria-label") || anchor.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 120),
        target: anchor.target || "_blank",
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  const closeAll = useCallback(() => {
    setExternalTarget(null);
    setPendingLang(null);
    setDoc(null);
  }, []);

  // Escape closes whichever dialog is open.
  useEffect(() => {
    if (!externalTarget && !pendingLang && !doc) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [externalTarget, pendingLang, doc, closeAll]);

  const confirmExternal = () => {
    if (externalTarget) {
      window.open(
        externalTarget.url,
        externalTarget.target || "_blank",
        "noopener,noreferrer"
      );
    }
    setExternalTarget(null);
  };

  const confirmLanguage = () => {
    if (pendingLang) setLanguage(pendingLang);
    setPendingLang(null);
  };

  const value = useMemo(
    () => ({ requestLanguageChange, openDocument }),
    [requestLanguageChange, openDocument]
  );

  const txt = isHindi
    ? {
        leaveTitle: "आप यह वेबसाइट छोड़ रहे हैं",
        leaveBody:
          "आप एक बाहरी वेबसाइट खोलने जा रहे हैं जो आरएसएसी-यूपी द्वारा संचालित नहीं है। इसकी सामग्री, गोपनीयता नीति और उपलब्धता संबंधित बाहरी संस्था की ज़िम्मेदारी है।",
        leaveDest: "गंतव्य",
        leaveConfirm: "जारी रखें",
        cancel: "रद्द करें",
        close: "बंद करें",
        langTitle: "वेबसाइट हिंदी में बदलें",
        langBody:
          "आप इस वेबसाइट को हिंदी में देखने जा रहे हैं। मुख्य नेविगेशन और सामग्री का अनुवाद किया गया है; कुछ आधिकारिक दस्तावेज़ और अभिलेख अब भी अंग्रेज़ी में दिख सकते हैं।",
        langConfirm: "हिंदी में बदलें",
        langCancel: "अंग्रेज़ी में रहें",
        openNewTab: "नई विंडो में खोलें",
        viewerNote: "यह दस्तावेज़ इसी वेबसाइट के भीतर खोला गया है।",
      }
    : {
        leaveTitle: "You are leaving this website",
        leaveBody:
          "You are about to open an external website that is not maintained by RSAC-UP. Its content, privacy practices, and availability are the responsibility of the external provider.",
        leaveDest: "Destination",
        leaveConfirm: "Continue",
        cancel: "Cancel",
        close: "Close",
        langTitle: "Switch website to Hindi",
        langBody:
          "You are about to view this website in Hindi (हिंदी). Core navigation and content are translated; some official documents and records may still appear in English.",
        langConfirm: "Switch to Hindi",
        langCancel: "Stay in English",
        openNewTab: "Open in new tab",
        viewerNote: "This document is opened within this website.",
      };

  const overlay = (node) =>
    createPortal(
      <div
        data-lenis-prevent
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#041220]/62 p-4 backdrop-blur-sm sm:p-6"
      >
        {node}
      </div>,
      document.body
    );

  return (
    <DialogContext.Provider value={value}>
      {children}

      {externalTarget &&
        overlay(
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rsac-leave-title"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_34px_100px_rgba(4,18,32,0.34)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
            />
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="rsac-leave-title"
                    className="text-xl font-extrabold text-[#102f46]"
                  >
                    {txt.leaveTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {txt.leaveBody}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-[#f8fbfd] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {txt.leaveDest}
                </p>
                <p className="mt-1 flex items-center gap-2 break-all text-sm font-bold text-[#0b6fa4]">
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {hostOf(externalTarget.url)}
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setExternalTarget(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                >
                  {txt.cancel}
                </button>
                <button
                  type="button"
                  onClick={confirmExternal}
                  className="geo-btn-saffron inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f97316]"
                >
                  {txt.leaveConfirm}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}

      {pendingLang &&
        overlay(
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rsac-lang-title"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_34px_100px_rgba(4,18,32,0.34)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff9933_0%,#ffffff_48%,#138808_100%)]"
            />
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-[#0f6f42]">
                  <Languages className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="rsac-lang-title"
                    lang="hi"
                    className="text-xl font-extrabold text-[#102f46]"
                  >
                    {txt.langTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {txt.langBody}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingLang(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                >
                  {txt.langCancel}
                </button>
                <button
                  type="button"
                  lang="hi"
                  onClick={confirmLanguage}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0f6f42] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0b5f38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42]"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {txt.langConfirm}
                </button>
              </div>
            </div>
          </div>
        )}

      {doc &&
        overlay(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={doc.title || "Document"}
            className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_34px_100px_rgba(4,18,32,0.34)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#f7fbfe] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold text-[#102f46]">
                  {doc.title || "Document"}
                </h2>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {txt.viewerNote}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-no-disclaimer
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#0b6fa4] transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                >
                  <SquareArrowOutUpRight className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{txt.openNewTab}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setDoc(null)}
                  aria-label={txt.close}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-[#12324a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6fa4]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <iframe
              src={doc.url}
              title={doc.title || "Document"}
              className="h-full w-full flex-1 bg-slate-100"
            />
          </div>
        )}
    </DialogContext.Provider>
  );
}
