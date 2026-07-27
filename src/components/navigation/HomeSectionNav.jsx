import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "../../hooks/useData";
import { useLanguage } from "../../hooks/useLanguage";
import { resolveCmsIcon } from "../icons/cmsIconRegistry";
import { scrollToTarget } from "../../utils/scroll";

const defaultHiddenHomeSections = [
  "leadership",
  "quickAccess",
  "geoportals",
  "gallery",
];

const sectionAnchors = {
  mission: "#mission-pulse",
  leadership: "#leadership-updates",
  quickAccess: "#quick-access",
  geoportals: "#geoportals",
  gallery: "#home-gallery",
};

const HomeSectionNav = () => {
  const { homeSections, layout } = useSiteSettings();
  const { t } = useLanguage();
  const [stickyTop, setStickyTop] = useState(136);

  useEffect(() => {
    const header = document.querySelector(".rsac-navbar");
    if (!header) return undefined;

    const updateStickyTop = () => {
      setStickyTop(Math.ceil(header.getBoundingClientRect().bottom) + 2);
    };
    updateStickyTop();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateStickyTop);
    observer?.observe(header);
    window.addEventListener("resize", updateStickyTop, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateStickyTop);
    };
  }, []);
  const hiddenSections = new Set(
    Array.isArray(layout?.hiddenHomeSections)
      ? layout.hiddenHomeSections
      : defaultHiddenHomeSections
  );
  const hiddenAnchors = new Set(
    Object.entries(sectionAnchors)
      .filter(([section]) => hiddenSections.has(section))
      .map(([, anchor]) => anchor)
  );
  const featureTabs = Array.isArray(homeSections.featureTabs)
    ? homeSections.featureTabs
    : [];
  const featureTabItems = featureTabs
    .map((tab, index) => {
      const key = String(tab.key || tab.title || `feature-${index + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      return key
        ? {
            label: tab.title || key,
            href: tab.buttonPath || `#home-feature-${key}`,
            icon: tab.icon || "building",
          }
        : null;
    })
    .filter(Boolean);
  const sourceItems = featureTabItems.length
    ? featureTabItems
    : homeSections.navigation || [];
  const navItems = sourceItems.filter(
    ({ href }) => !hiddenAnchors.has(href)
  );

  return (
    <nav
      aria-label={t("Homepage sections")}
      style={{ "--rsac-home-nav-top": `${stickyTop}px` }}
      className="rsac-home-index relative z-30 border-y border-slate-200/80 bg-white px-3 shadow-[0_8px_28px_rgba(18,50,74,0.07)]"
    >
      <div
        data-lenis-prevent
        className="rsac-home-index__track mx-auto flex max-w-6xl items-stretch justify-start overflow-x-auto sm:justify-center"
      >
        {navItems.map(({ label, href, icon }) => {
          const Icon = resolveCmsIcon(icon, resolveCmsIcon("orbit"));
          const navClass =
            "rsac-home-index__item inline-flex min-h-20 min-w-[8.5rem] shrink-0 flex-col items-center justify-center gap-2 px-4 py-4 text-center text-xs font-bold text-slate-600 transition duration-300 hover:bg-emerald-50 hover:text-[#0f6f42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f6f42] sm:min-h-24 sm:min-w-[10rem] sm:text-sm";
          const isInternalRoute =
            href && !href.startsWith("#") && !/^https?:\/\//i.test(href);

          if (isInternalRoute) {
            return (
              <Link key={href} to={href} className={navClass}>
                <span className="rsac-home-index__icon" aria-hidden="true">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                {label}
              </Link>
            );
          }

          return (
            <a
              key={href}
              href={href}
              target={/^https?:\/\//i.test(href) ? "_blank" : undefined}
              rel={/^https?:\/\//i.test(href) ? "noopener noreferrer" : undefined}
              onClick={(event) => {
                const target =
                  href?.startsWith("#") && document.querySelector(href);
                if (!target) {
                  return;
                }
                if (href?.startsWith("#home-feature-")) {
                  return;
                }
                event.preventDefault();
                scrollToTarget(target);
              }}
              className={navClass}
            >
              <span className="rsac-home-index__icon" aria-hidden="true">
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default HomeSectionNav;
