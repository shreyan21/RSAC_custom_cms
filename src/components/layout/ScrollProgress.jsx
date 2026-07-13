import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const ScrollProgress = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleMenuVisibility = (event) => setMenuOpen(Boolean(event.detail?.open));
    window.addEventListener("rsac:menu-visibility", handleMenuVisibility);
    return () => window.removeEventListener("rsac:menu-visibility", handleMenuVisibility);
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        setScrollable(maximum > 40);
        setProgress(maximum ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0);
      });
    };
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(update);

    observer?.observe(document.documentElement);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  if (menuOpen || !scrollable) return null;

  return (
    <div
      aria-hidden="true"
      className="rsac-scroll-progress"
      style={{ transform: `scaleX(${progress})` }}
    />
  );
};

export default ScrollProgress;
