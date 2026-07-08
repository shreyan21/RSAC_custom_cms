import { useEffect } from "react";

/**
 * Keeps wheel/touchpad scrolling native and marks its brief active period so
 * expensive hover effects do not start while content is moving under a
 * stationary pointer. Native scrolling avoids delayed inertia and remains the
 * most predictable option for keyboard and assistive-technology users.
 */
const SmoothScroll = () => {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const root = document.documentElement;
    let scrollEndTimer;
    let frame = null;

    const markScrolling = () => {
      if (frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        root.classList.add("rsac-is-scrolling");
        window.clearTimeout(scrollEndTimer);
        scrollEndTimer = window.setTimeout(() => {
          root.classList.remove("rsac-is-scrolling");
        }, 180);
        frame = null;
      });
    };

    window.addEventListener("wheel", markScrolling, { passive: true });
    window.addEventListener("scroll", markScrolling, { passive: true });
    window.addEventListener("touchmove", markScrolling, { passive: true });
    window.addEventListener("keydown", markScrolling);

    return () => {
      window.removeEventListener("wheel", markScrolling);
      window.removeEventListener("scroll", markScrolling);
      window.removeEventListener("touchmove", markScrolling);
      window.removeEventListener("keydown", markScrolling);
      window.clearTimeout(scrollEndTimer);
      if (frame !== null) window.cancelAnimationFrame(frame);
      root.classList.remove("rsac-is-scrolling");
    };
  }, []);

  return null;
};

export default SmoothScroll;
