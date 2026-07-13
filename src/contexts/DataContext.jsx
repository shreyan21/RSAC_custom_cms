import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { getCmsBootstrap, getCmsVersion } from "../data/customCmsClient";
import { setUiLabels } from "../data/uiLabels";
import { DataContext } from "./DataContextCore";

const bootstrapCacheKey = "rsac-custom-cms-bootstrap-v1";
const fontStacks = {
  Inter: '"Inter Variable", Inter, sans-serif',
  "Plus Jakarta Sans": '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", sans-serif',
  "System Sans": 'system-ui, -apple-system, "Segoe UI", sans-serif',
  "System Serif": 'Georgia, "Times New Roman", serif',
  "Noto Sans Devanagari": '"Noto Sans Devanagari Variable", "Noto Sans Devanagari", "Nirmala UI", Mangal, sans-serif',
  "System Devanagari": '"Nirmala UI", Mangal, sans-serif',
};

const readCachedBootstrap = (language) => {
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(bootstrapCacheKey) || "null");
    return cached?.language === language ? cached : null;
  } catch {
    return null;
  }
};

const cacheBootstrap = (value) => {
  try {
    window.sessionStorage.setItem(bootstrapCacheKey, JSON.stringify(value));
  } catch {
    window.sessionStorage.removeItem(bootstrapCacheKey);
  }
};

const decorateBootstrap = (value) => value ? {
  ...value,
  getPolicyBySlug: (slug) => value.policyPages?.find((policy) => policy.slug === slug),
} : null;

export function DataProvider({ children }) {
  const { language } = useLanguage();
  const [data, setData] = useState(() => decorateBootstrap(readCachedBootstrap(language)));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const contentVersionRef = useRef(data?.contentVersion || "");

  const load = useCallback(async ({ background = false } = {}) => {
    if (!background) setIsLoading(true);
    setError("");
    try {
      const next = await getCmsBootstrap(language, { refresh: true });
      cacheBootstrap(next);
      contentVersionRef.current = next.contentVersion || "";
      setData(decorateBootstrap(next));
    } catch (nextError) {
      setError(nextError.name === "AbortError" ? "The content server took too long to respond." : nextError.message);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useEffect(() => {
    const timeout = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load, retryKey]);

  useEffect(() => {
    const refresh = () => load({ background: true });
    const refreshWhenVisible = () => { if (!document.hidden) refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const checkVersion = async () => {
      try {
        const version = await getCmsVersion();
        if (version && contentVersionRef.current && version !== contentVersionRef.current) refresh();
      } catch { /* regular page requests still report API failures */ }
    };
    const interval = window.setInterval(checkVersion, 3000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    setUiLabels(data?.siteSettings?.interfaceLabels);
  }, [data?.siteSettings]);

  useEffect(() => {
    const design = data?.siteSettings?.designSettings || {};
    const root = document.documentElement;
    root.style.setProperty("--rsac-font-family", fontStacks[design.bodyFont] || fontStacks.Inter);
    root.style.setProperty("--rsac-font-display", fontStacks[design.headingFont] || fontStacks["Plus Jakarta Sans"]);
    root.style.setProperty("--rsac-font-hindi", fontStacks[design.hindiFont] || fontStacks["Noto Sans Devanagari"]);
    const size = Math.min(20, Math.max(14, Number(design.baseFontSize) || 16));
    root.style.setProperty("--rsac-base-font-size", `${size}px`);
  }, [data?.siteSettings?.designSettings]);

  const value = useMemo(() => data ? { ...data, isLoading, cmsError: error } : null, [data, error, isLoading]);
  const contentMatchesLanguage = data?.language === language;

  if (!contentMatchesLanguage && error) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-24 text-center text-slate-800" role="alert">
        <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Website content unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <button className="mt-6 rounded bg-[#0b5b8c] px-5 py-2.5 font-semibold text-white" type="button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button>
        </div>
      </main>
    );
  }

  if (!contentMatchesLanguage) {
    return <div className="min-h-screen bg-[#f7fbf8]" aria-busy="true"><span className="sr-only">Loading</span></div>;
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
