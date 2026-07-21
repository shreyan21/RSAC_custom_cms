import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { scrollToTop } from "../../utils/scroll";

const BackToTopButton = () => {
  const { ui } = useSiteSettings();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Same reasoning as the Navbar: reading window.scrollY inside a scroll
    // listener forces a layout every scrolled frame. A sentinel observed by
    // IntersectionObserver flips the >720px state with no layout reads.
    if (typeof IntersectionObserver !== "undefined") {
      const sentinel = document.createElement("div");
      sentinel.setAttribute("aria-hidden", "true");
      sentinel.style.cssText =
        "position:absolute;top:0;left:0;width:1px;height:721px;pointer-events:none;visibility:hidden;";
      document.body.prepend(sentinel);

      const observer = new IntersectionObserver(([entry]) => {
        setVisible(!entry.isIntersecting);
      });
      observer.observe(sentinel);

      return () => {
        observer.disconnect();
        sentinel.remove();
      };
    }

    const updateVisibility = () => {
      const nextVisible = window.scrollY > 720;
      setVisible((current) =>
        current === nextVisible ? current : nextVisible
      );
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      onClick={() => scrollToTop()}
      aria-label={ui?.backToTop || t("Back to top")}
      title={ui?.backToTop || t("Back to top")}
      className={`fixed bottom-5 right-5 z-[110] grid h-11 w-11 place-items-center rounded-xl border border-emerald-900/15 bg-white/94 text-[#0f6f42] shadow-[0_14px_36px_rgba(18,50,74,0.16)] backdrop-blur-md transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#0f6f42] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
};

export default BackToTopButton;
