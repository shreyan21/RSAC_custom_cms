import { useCallback, useEffect, useRef } from "react";
import { api, websiteUrl } from "./api";

const previewWindowName = "rsac-cms-live-preview";
const previewMessageType = "rsac-cms-preview:update";
const previewDebounceMs = 450;

const previewUrl = (result, language) => {
  const target = new URL(result.path || "/", websiteUrl);
  target.searchParams.set("lang", language === "hi" ? "hi" : "en");
  target.hash = new URLSearchParams({ "cms-preview": result.token }).toString();
  return target.toString();
};

export default function useLivePreview({ collection, draft, language, notify }) {
  const sessionRef = useRef({ token: "", path: "", language: "", window: null });
  const queueRef = useRef(Promise.resolve());
  const timerRef = useRef(0);
  const lastErrorRef = useRef("");

  const syncPreview = useCallback((snapshot, { open = false } = {}) => {
    const run = async () => {
      const session = sessionRef.current;
      if (!open && (!session.token || !session.window || session.window.closed)) return null;

      const result = await api("/api/admin/preview", {
        method: "POST",
        body: JSON.stringify({ collection, entry: snapshot, token: session.token || undefined }),
      });
      const target = previewUrl(result, language);
      const previewWindow = session.window;
      const routeChanged = session.token !== result.token || session.path !== result.path || session.language !== language;

      session.token = result.token;
      session.path = result.path;
      session.language = language;
      lastErrorRef.current = "";

      if (previewWindow && !previewWindow.closed) {
        if (open || routeChanged) {
          previewWindow.location.replace(target);
          if (open) previewWindow.focus();
        } else {
          previewWindow.postMessage(
            { type: previewMessageType, token: result.token, revision: result.revision },
            new URL(websiteUrl).origin
          );
        }
      }
      return result;
    };

    const queued = queueRef.current.catch(() => undefined).then(run);
    queueRef.current = queued;
    return queued;
  }, [collection, language]);

  const openPreview = useCallback(async () => {
    const previewWindow = window.open("", previewWindowName);
    if (!previewWindow) {
      throw new Error("Preview popup was blocked. Allow popups for this CMS and try again.");
    }

    sessionRef.current.window = previewWindow;
    previewWindow.focus();
    try {
      if (!sessionRef.current.token && previewWindow.location.href === "about:blank") {
        previewWindow.document.title = "Preparing RSAC-UP preview";
        previewWindow.document.body.textContent = "Preparing secure preview...";
      }
    } catch {
      // An existing named preview tab is cross-origin and will be reused below.
    }

    await syncPreview(draft, { open: true });
    notify("Preview ready. Unsaved edits now update this same tab automatically.", "success");
  }, [draft, notify, syncPreview]);

  useEffect(() => {
    const session = sessionRef.current;
    window.clearTimeout(timerRef.current);
    if (!draft || !session.token || !session.window || session.window.closed) return undefined;

    timerRef.current = window.setTimeout(() => {
      syncPreview(draft).catch((error) => {
        if (lastErrorRef.current === error.message) return;
        lastErrorRef.current = error.message;
        notify(`Live preview paused: ${error.message}`, "error");
      });
    }, previewDebounceMs);

    return () => window.clearTimeout(timerRef.current);
  }, [draft, language, notify, syncPreview]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { openPreview };
}
