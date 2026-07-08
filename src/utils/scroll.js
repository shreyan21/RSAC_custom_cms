/**
 * Single source of truth for programmatic page scrolling.
 *
 * The site runs a Lenis smooth-scroll engine (see SmoothScroll.jsx) that owns
 * the window scroll position via its own rAF loop. A plain `window.scrollTo` /
 * `element.scrollIntoView` fights Lenis — Lenis snaps back to its internal
 * target — which shows up as "the page only jumps on the second click" and
 * janky/half scrolls. Always scroll through this helper so that never happens.
 *
 * When Lenis is active it is used (and it honours CSS `scroll-margin-top`, so
 * sticky-header offset can stay in CSS). When Lenis is off — reduced-motion, or
 * before it has initialised — it falls back to native scrolling.
 *
 * FUTURE CHANGES: to scroll the page anywhere in the app, call
 * `scrollToTarget(...)` / `scrollToTop(...)` from here. Do not call
 * `window.scrollTo` or `element.scrollIntoView` directly — that reintroduces
 * the Lenis conflict.
 */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const resolveElement = (target) => {
  if (typeof target === "string") {
    try {
      return document.querySelector(target);
    } catch {
      return null;
    }
  }
  return target instanceof Element ? target : null;
};

/**
 * Scroll to a target.
 * @param {number|string|Element} target  Y position, CSS selector, or element.
 * @param {object} [options]
 * @param {boolean} [options.immediate]  Jump with no animation. Defaults to the
 *   user's reduced-motion preference.
 * @param {number}  [options.offset]     Extra pixels added to the target (use a
 *   negative value to stop short of it). Honoured by Lenis and by the numeric
 *   native path; element offsets should prefer CSS `scroll-margin-top`.
 * @param {ScrollLogicalPosition} [options.block]  Native fallback alignment.
 */
export const scrollToTarget = (target, options = {}) => {
  if (typeof window === "undefined" || target == null) return;

  const reduce = prefersReducedMotion();
  const immediate = options.immediate ?? reduce;
  const offset = options.offset ?? 0;
  const engine = window.__lenis;

  if (engine && typeof engine.scrollTo === "function") {
    // Lenis accepts a number, a selector string, or an Element.
    engine.scrollTo(target, { offset, immediate });
    return;
  }

  // Native fallback (Lenis off / not yet initialised).
  // Use "instant", not "auto": "auto" defers to the CSS `scroll-behavior:
  // smooth` on <html>, so an "immediate" jump would still animate the whole way
  // down a tall page — rendering every content-visibility section on the path
  // and janking on slower machines. "instant" forces a hard jump.
  const behavior = immediate ? "instant" : "smooth";

  if (typeof target === "number") {
    window.scrollTo({ top: target + offset, left: 0, behavior });
    return;
  }

  const element = resolveElement(target);
  if (element) {
    element.scrollIntoView({ behavior, block: options.block || "start" });
  }
};

export const scrollToTop = (options = {}) => scrollToTarget(0, options);
