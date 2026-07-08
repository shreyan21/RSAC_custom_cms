import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollToTarget } from "../../utils/scroll";

const storageKey = "rsac.scrollPositions";
const maxStoredPositions = 100;
let cachedPositions;

const readPositions = () => {
  if (cachedPositions) {
    return cachedPositions;
  }

  try {
    cachedPositions = JSON.parse(
      window.sessionStorage.getItem(storageKey) || "{}"
    );
  } catch {
    cachedPositions = {};
  }

  return cachedPositions;
};

const persistPositions = () => {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(readPositions()));
  } catch {
    // Navigation still works when session storage is unavailable.
  }
};

const savePosition = (key, { persist = false } = {}) => {
  if (!key) {
    return;
  }

  const positions = readPositions();
  delete positions[key];
  positions[key] = {
    x: window.scrollX,
    y: window.scrollY,
  };

  Object.keys(positions)
    .slice(0, -maxStoredPositions)
    .forEach((storedKey) => delete positions[storedKey]);

  if (persist) {
    persistPositions();
  }
};

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { pathname, search, hash, key } = location;
  const positionKey =
    key === "default" ? `default:${pathname}${search}` : key;

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    // Positions are captured at navigation boundaries only (click capture,
    // popstate, pagehide, and the route-change cleanup below). A per-scroll
    // listener is redundant for restoration and forced a synchronous layout
    // on every scrolled frame (rAF read right after animation style writes),
    // which was the main cause of scroll jank on the home page.
    const recordBeforeNavigation = () =>
      savePosition(positionKey, { persist: true });

    window.addEventListener("pagehide", recordBeforeNavigation);
    window.addEventListener("popstate", recordBeforeNavigation);
    document.addEventListener("click", recordBeforeNavigation, true);

    return () => {
      window.removeEventListener("pagehide", recordBeforeNavigation);
      window.removeEventListener("popstate", recordBeforeNavigation);
      document.removeEventListener("click", recordBeforeNavigation, true);
    };
  }, [positionKey]);

  useLayoutEffect(() => {
    let cancelled = false;
    const timers = [];
    let restoreFrame = null;
    let resizeObserver = null;

    const cancelRestore = () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      if (restoreFrame !== null) {
        window.cancelAnimationFrame(restoreFrame);
      }
      resizeObserver?.disconnect();
    };
    const interactionEvents = ["wheel", "touchstart", "pointerdown", "keydown"];
    const listenForInteraction = () => {
      interactionEvents.forEach((eventName) => {
        window.addEventListener(eventName, cancelRestore, {
          passive: eventName !== "keydown",
          once: true,
        });
      });
    };
    const removeInteractionListeners = () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, cancelRestore);
      });
    };
    const cleanUp = () => {
      savePosition(positionKey, { persist: true });
      cancelRestore();
      removeInteractionListeners();
    };

    if (navigationType === "POP") {
      const target = readPositions()[positionKey];

      if (target) {
        const restore = () => {
          if (!cancelled) {
            scrollToTarget(target.y, { immediate: true });
          }
        };

        restore();
        [80, 220, 500, 1000, 1800, 3000].forEach((delay) => {
          timers.push(
            window.setTimeout(() => {
              restore();
            }, delay)
          );
        });

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => {
            if (cancelled || restoreFrame !== null) {
              return;
            }

            restoreFrame = window.requestAnimationFrame(() => {
              restoreFrame = null;
              restore();
            });
          });
          resizeObserver.observe(document.documentElement);
          timers.push(
            window.setTimeout(() => resizeObserver?.disconnect(), 3200)
          );
        }

        listenForInteraction();
        return cleanUp;
      }
    }

    if (hash) {
      const restoreHash = () => {
        if (cancelled) {
          return;
        }

        let target;
        try {
          target = document.querySelector(hash);
        } catch {
          return;
        }
        if (!target) {
          return;
        }

        // Instant jump (a native smooth scroll over a tall page renders every
        // content-visibility section on the way and janks on slower machines).
        // The header offset is handled by CSS `scroll-padding-top` on <html>,
        // which the browser applies at scroll time, so it stays correct even if
        // images/fonts finish loading after this runs.
        scrollToTarget(target, { immediate: true });
      };

      // Retries span past the CMS data load and image/font reflow so the target
      // is reached even when the anchored section renders late, and re-corrected
      // if later content shifts it. Instant jumps, and every retry is cancelled
      // the moment the user interacts, so they never fight a manual scroll.
      [0, 150, 450, 900, 1600, 2600].forEach((delay) => {
        timers.push(window.setTimeout(restoreHash, delay));
      });
      listenForInteraction();

      return cleanUp;
    }

    restoreFrame = window.requestAnimationFrame(() => {
      restoreFrame = null;
      scrollToTarget(0, { immediate: true });

      timers.push(
        window.setTimeout(() => {
          document
            .getElementById("main-content")
            ?.focus({ preventScroll: true });
        }, 60)
      );
    });

    return cleanUp;
  }, [hash, navigationType, pathname, positionKey, search]);

  return null;
};

export default ScrollToTop;
