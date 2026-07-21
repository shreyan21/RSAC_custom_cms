import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import {
  clearCmsCache,
  getCmsBootstrap,
  getCmsVersion,
  subscribeCmsUpdates,
} from "../data/customCmsClient";
import { setUiLabels } from "../data/uiLabels";
import { DataContext } from "./DataContextCore";

const bootstrapCacheKey = "rsac-custom-cms-bootstrap-v1";
const previewMessageType = "rsac-cms-preview:update";
const cmsAdminOrigin = (() => {
  try {
    return new URL(import.meta.env.VITE_CMS_ADMIN_URL || "http://localhost:5174").origin;
  } catch {
    return "";
  }
})();
const readPreviewToken = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return String(params.get("cms-preview") || "").trim();
};
const fontStacks = {
  Inter: '"Inter Variable", Inter, "Noto Sans Devanagari Variable", "Noto Sans Devanagari", "Nirmala UI", sans-serif',
  "Plus Jakarta Sans": '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Noto Sans Devanagari Variable", "Noto Sans Devanagari", "Nirmala UI", sans-serif',
  "System Sans": 'system-ui, -apple-system, "Segoe UI", "Nirmala UI", Mangal, sans-serif',
  "System Serif": 'Georgia, "Times New Roman", "Noto Sans Devanagari Variable", "Nirmala UI", serif',
  "Noto Sans Devanagari": '"Noto Sans Devanagari Variable", "Noto Sans Devanagari", "Nirmala UI", Mangal, sans-serif',
  "System Devanagari": '"Nirmala UI", Mangal, sans-serif',
};

const readCachedBootstrap = (language) => {
  try {
    const localizedKey = `${bootstrapCacheKey}:${language}`;
    const cached = JSON.parse(
      window.sessionStorage.getItem(localizedKey) ||
      window.sessionStorage.getItem(bootstrapCacheKey) ||
      "null"
    );
    return cached?.language === language ? cached : null;
  } catch {
    return null;
  }
};

const cacheBootstrap = (value) => {
  try {
    window.sessionStorage.setItem(`${bootstrapCacheKey}:${value.language}`, JSON.stringify(value));
  } catch {
    window.sessionStorage.removeItem(`${bootstrapCacheKey}:${value.language}`);
  }
};

const scheduleBootstrapCache = (value) => {
  const write = () => cacheBootstrap(value);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(write, { timeout: 2000 });
  } else {
    window.setTimeout(write, 0);
  }
};

const decorateBootstrap = (value) => value ? {
  ...value,
  getPolicyBySlug: (slug) => value.policyPages?.find((policy) => policy.slug === slug),
} : null;

export function DataProvider({ children }) {
  const { language, t } = useLanguage();
  const [previewToken] = useState(readPreviewToken);
  const [data, setData] = useState(() =>
    decorateBootstrap(previewToken ? null : readCachedBootstrap(language))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const contentVersionRef = useRef(data?.contentVersion || "");
  const dataRef = useRef(data);
  const languageRef = useRef(language);
  const inFlightLoadsRef = useRef(new Map());

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const load = useCallback(async ({ background = false, refresh = true } = {}) => {
    const requestKey = `${language}:${previewToken || "live"}`;
    const existing = inFlightLoadsRef.current.get(requestKey);
    if (existing) return existing;

    const request = (async () => {
      if (!background) setIsLoading(true);
      setError("");
      try {
        const next = await getCmsBootstrap(language, { refresh, previewToken });
        if (languageRef.current !== language) return;
        if (!previewToken) scheduleBootstrapCache(next);
        contentVersionRef.current = next.contentVersion || "";
        const decorated = decorateBootstrap(next);
        dataRef.current = decorated;
        setData(decorated);
      } catch (nextError) {
        if (languageRef.current !== language) return;
        setError(nextError.name === "AbortError" ? "The content server took too long to respond." : nextError.message);
      } finally {
        if (languageRef.current === language) setIsLoading(false);
      }
    })();

    inFlightLoadsRef.current.set(requestKey, request);
    try {
      await request;
    } finally {
      if (inFlightLoadsRef.current.get(requestKey) === request) {
        inFlightLoadsRef.current.delete(requestKey);
      }
    }
    return request;
  }, [language, previewToken]);

  const checkForUpdates = useCallback(async ({ force = false } = {}) => {
    if (previewToken) return load();
    try {
      if (force) {
        clearCmsCache();
        await load({ background: true, refresh: true });
        return;
      }
      const version = await getCmsVersion();
      if (version && version !== contentVersionRef.current) {
        clearCmsCache();
        await load({ background: true, refresh: true });
      } else {
        setIsLoading(false);
      }
    } catch {
      if (dataRef.current?.language !== language) await load();
      else setIsLoading(false);
    }
  }, [language, load, previewToken]);

  useEffect(() => {
    const cachedLanguage = previewToken ? null : readCachedBootstrap(language);
    if (cachedLanguage && dataRef.current?.language !== language) {
      const decorated = decorateBootstrap(cachedLanguage);
      dataRef.current = decorated;
      contentVersionRef.current = cachedLanguage.contentVersion || "";
      setData(decorated);
      setIsLoading(false);
    }
    const hasCurrentCachedData = !previewToken && Boolean(
      (dataRef.current?.language === language && contentVersionRef.current) ||
      cachedLanguage?.contentVersion
    );
    const timeout = window.setTimeout(
      () => (hasCurrentCachedData ? checkForUpdates() : load({ refresh: false })),
      0
    );
    return () => window.clearTimeout(timeout);
  }, [checkForUpdates, language, load, previewToken, retryKey]);

  useEffect(() => {
    if (previewToken || !data?.language) return undefined;
    const alternateLanguage = data.language === "hi" ? "en" : "hi";
    const prefetch = () => {
      void getCmsBootstrap(alternateLanguage, { refresh: false }).catch(() => undefined);
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeout = window.setTimeout(prefetch, 250);
    return () => window.clearTimeout(timeout);
  }, [data?.contentVersion, data?.language, previewToken]);

  useEffect(() => {
    if (previewToken) return undefined;
    const refreshWhenVisible = () => { if (!document.hidden) checkForUpdates(); };
    window.addEventListener("focus", checkForUpdates);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const interval = window.setInterval(checkForUpdates, 5000);
    return () => {
      window.removeEventListener("focus", checkForUpdates);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [checkForUpdates, previewToken]);

  useEffect(() => {
    if (previewToken) return undefined;
    return subscribeCmsUpdates(() => {
      void checkForUpdates({ force: true });
    });
  }, [checkForUpdates, previewToken]);

  useEffect(() => {
    if (!previewToken) return undefined;
    const refreshState = { running: false, revision: "" };

    const refreshPreview = async () => {
      if (refreshState.running) return;
      refreshState.running = true;
      try {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const expectedRevision = refreshState.revision;
          await load({ background: true });
          const loadedRevision = dataRef.current?.previewRevision || "";
          if (!expectedRevision || loadedRevision >= expectedRevision) break;
        }
      } finally {
        refreshState.running = false;
        if ((dataRef.current?.previewRevision || "") < refreshState.revision) {
          window.setTimeout(refreshPreview, 0);
        }
      }
    };

    const receivePreviewUpdate = (event) => {
      const trustedOpener = window.opener && event.source === window.opener;
      if (!trustedOpener && cmsAdminOrigin && event.origin !== cmsAdminOrigin) return;
      if (event.data?.type !== previewMessageType || event.data?.token !== previewToken) return;
      refreshState.revision = String(event.data.revision || "");
      void refreshPreview();
    };

    window.addEventListener("message", receivePreviewUpdate);
    return () => window.removeEventListener("message", receivePreviewUpdate);
  }, [load, previewToken]);

  useEffect(() => {
    setUiLabels(data?.siteSettings?.interfaceLabels);
  }, [data?.siteSettings]);

  useEffect(() => {
    const design = data?.siteSettings?.designSettings || {};
    const root = document.documentElement;
    const completeWebsiteFont = fontStacks[design.siteFont];
    root.style.setProperty("--rsac-font-family", completeWebsiteFont || fontStacks[design.bodyFont] || fontStacks.Inter);
    root.style.setProperty("--rsac-font-display", completeWebsiteFont || fontStacks[design.headingFont] || fontStacks["Plus Jakarta Sans"]);
    root.style.setProperty("--rsac-font-hindi", completeWebsiteFont || fontStacks[design.hindiFont] || fontStacks["Noto Sans Devanagari"]);
    const size = Math.min(20, Math.max(14, Number(design.baseFontSize) || 16));
    root.style.setProperty("--rsac-base-font-size", `${size}px`);
    root.dataset.rsacSurface = ["atlas", "clean", "bands"].includes(design.surfaceStyle)
      ? design.surfaceStyle
      : "atlas";
    root.dataset.rsacDensity = ["compact", "comfortable", "spacious"].includes(design.contentDensity)
      ? design.contentDensity
      : "comfortable";
    root.dataset.rsacCorners = design.cornerStyle === "soft" ? "soft" : "precise";
    root.dataset.rsacElevation = design.cardElevation === "lifted" ? "lifted" : "quiet";
    root.dataset.rsacMotion = ["none", "reduced", "standard"].includes(design.motionLevel)
      ? design.motionLevel
      : "standard";
  }, [data?.siteSettings?.designSettings]);

  const value = useMemo(() => data ? { ...data, isLoading, cmsError: error } : null, [data, error, isLoading]);
  const contentMatchesLanguage = data?.language === language;

  if (!contentMatchesLanguage && error) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-24 text-center text-slate-800" role="alert">
        <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">{t("Website content unavailable")}</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <button className="mt-6 rounded bg-[#0b5b8c] px-5 py-2.5 font-semibold text-white" type="button" onClick={() => setRetryKey((key) => key + 1)}>{t("Try again")}</button>
        </div>
      </main>
    );
  }

  if (!contentMatchesLanguage) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-[#f7fbf8] px-6 text-center text-[#102f46]"
        aria-busy="true"
      >
        <div role="status" aria-live="polite">
          <span
            className="mx-auto block h-12 w-12 animate-spin rounded-full border-4 border-emerald-900/15 border-t-[#e77817] motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p className="sr-only">{t("Loading content")}</p>
        </div>
      </main>
    );
  }

  const exitPreviewUrl = `${window.location.pathname}${window.location.search}`;

  return (
    <DataContext.Provider value={value}>
      {children}
      {previewToken && (
        <div
          className="fixed bottom-4 left-1/2 z-[1000] flex w-[min(92vw,38rem)] -translate-x-1/2 items-center justify-between gap-4 rounded-lg border-2 border-amber-500 bg-[#102f46] px-4 py-3 text-sm font-semibold text-white shadow-2xl"
          role="status"
          aria-live="polite"
        >
          <span>{t("CMS preview only. Live website is unchanged.")}</span>
          <a
            className="shrink-0 rounded-md bg-white px-3 py-2 font-bold text-[#102f46] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            href={exitPreviewUrl}
          >
            {t("Exit preview")}
          </a>
        </div>
      )}
    </DataContext.Provider>
  );
}
